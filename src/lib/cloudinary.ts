// src/services/cloudinary.ts
/**
 * Cloudinary Image Management Service
 *
 * This service provides a clean interface for interacting with Cloudinary's API
 * for image upload, transformation, and management. It handles:
 *
 * - Image upload from buffers, files, and URLs
 * - Image transformation and optimization
 * - URL generation with transformations
 * - Image metadata retrieval and management
 * - Asset deletion and cleanup
 *
 * Features:
 * - Type-safe interfaces based on Cloudinary SDK v2
 * - Promise-based async/await API
 * - Automatic error handling with custom error types
 * - Optimized transformations for web delivery
 * - Secure URL generation for assets
 *
 * Usage:
 * ```typescript
 * import { uploadImageBuffer, generateTransformedUrl } from '@/services/cloudinary';
 *
 * const url = await uploadImageBuffer(buffer, "my-image");
 * const optimizedUrl = generateTransformedUrl("my-image", { width: 400, quality: "auto" });
 * ```
 */

import { v2 as cloudinary } from "cloudinary";
import { API_ERROR_CODES, APIErrorCode } from "@/constants/api-errors";

// Custom Error Class for Cloudinary operations
export class CloudinaryError extends Error {
  constructor(
    message: string,
    public code: APIErrorCode,
    public statusCode?: number,
    public details?: string
  ) {
    super(message);
    this.name = "CloudinaryError";
  }
}

// Configuration constants
export const CLOUDINARY_CONFIG = {
  folders: {
    uploads: "style-studio-ai/uploads",
    generations: "style-studio-ai/generations",
    profiles: "style-studio-ai/profiles",
  },
  defaults: {
    quality: "auto",
    format: "auto",
    secure: true,
  },
} as const;

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

/**
 * Upload options interface for type safety
 */
export interface CloudinaryUploadOptions {
  folder?: keyof typeof CLOUDINARY_CONFIG.folders | string;
  public_id?: string;
  quality?: string | number;
  format?: string;
  eager?: object[];
  transformation?: object | string;
  tags?: string[];
  use_filename?: boolean;
  unique_filename?: boolean;
  overwrite?: boolean;
}

/**
 * Transformation options interface
 */
export interface TransformationOptions {
  width?: number;
  height?: number;
  quality?: string | number;
  format?: string;
  crop?: string;
  gravity?: string;
  effect?: string;
  radius?: number | string;
  angle?: number;
}

/**
 * Upload result interface
 */
export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  url: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
  created_at: string;
  etag: string;
}

/**
 * Transformation parameters interface for URL generation
 */
interface CloudinaryTransformationParams {
  quality?: string | number;
  fetch_format?: string;
  crop?: string;
  width?: number;
  height?: number;
  gravity?: string;
  effect?: string;
  radius?: number | string;
  angle?: number;
}

/**
 * Uploads image buffer to Cloudinary using upload_stream
 * Based on Cloudinary Node.js SDK best practices
 */
export async function uploadImageBuffer(
  bytes: ArrayBuffer,
  filename: string,
  options: CloudinaryUploadOptions = {}
): Promise<CloudinaryUploadResult> {
  const buffer = Buffer.from(bytes);
  const uploadOptions = {
    resource_type: "image" as const,
    public_id: options.public_id || filename,
    folder: options.folder
      ? typeof options.folder === "string" &&
        options.folder in CLOUDINARY_CONFIG.folders
        ? CLOUDINARY_CONFIG.folders[
            options.folder as keyof typeof CLOUDINARY_CONFIG.folders
          ]
        : options.folder
      : CLOUDINARY_CONFIG.folders.uploads,
    quality: options.quality || CLOUDINARY_CONFIG.defaults.quality,
    fetch_format: options.format || CLOUDINARY_CONFIG.defaults.format,
    use_filename: options.use_filename ?? true,
    unique_filename: options.unique_filename ?? false,
    overwrite: options.overwrite ?? true,
    tags: options.tags,
    eager: options.eager,
    transformation: options.transformation || [
      { quality: CLOUDINARY_CONFIG.defaults.quality },
      { fetch_format: CLOUDINARY_CONFIG.defaults.format },
    ],
  };

  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(uploadOptions, (error, result) => {
        if (error) {
          reject(
            new CloudinaryError(
              `Upload failed: ${error.message}`,
              API_ERROR_CODES.SERVER_ERROR,
              500,
              error.http_code?.toString()
            )
          );
        } else if (result) {
          resolve({
            public_id: result.public_id,
            secure_url: result.secure_url,
            url: result.url,
            width: result.width,
            height: result.height,
            format: result.format,
            bytes: result.bytes,
            created_at: result.created_at,
            etag: result.etag,
          });
        } else {
          reject(
            new CloudinaryError(
              "Upload failed: No result returned",
              API_ERROR_CODES.SERVER_ERROR
            )
          );
        }
      })
      .end(buffer);
  });
}

/**
 * Generates a transformation URL for an existing Cloudinary asset
 * Uses cloudinary.url() method for optimal URL generation
 */
export function generateTransformedUrl(
  publicId: string,
  transformations: TransformationOptions = {}
): string {
  const {
    width,
    height,
    quality = CLOUDINARY_CONFIG.defaults.quality,
    format = CLOUDINARY_CONFIG.defaults.format,
    crop = "fill",
    gravity,
    effect,
    radius,
    angle,
  } = transformations;

  const transformationParams: CloudinaryTransformationParams = {
    quality,
    fetch_format: format,
  };

  // Add resize transformations
  if (width || height) {
    transformationParams.crop = crop;
    if (width) transformationParams.width = width;
    if (height) transformationParams.height = height;
  }

  // Add optional transformations
  if (gravity) transformationParams.gravity = gravity;
  if (effect) transformationParams.effect = effect;
  if (radius) transformationParams.radius = radius;
  if (angle) transformationParams.angle = angle;

  return cloudinary.url(publicId, {
    transformation: transformationParams,
    secure: CLOUDINARY_CONFIG.defaults.secure,
  });
}

/**
 * Generates multiple transformation URLs for responsive images
 */
export function generateResponsiveUrls(
  publicId: string,
  breakpoints: { width: number; height?: number }[]
): { width: number; url: string }[] {
  return breakpoints.map(({ width, height }) => ({
    width,
    url: generateTransformedUrl(publicId, {
      width,
      height,
      quality: "auto",
      format: "auto",
      crop: "fill",
    }),
  }));
}

/**
 * Deletes an asset from Cloudinary
 * Uses the uploader destroy method
 */
export async function deleteAsset(
  publicId: string
): Promise<{ result: string }> {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return { result: result.result };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new CloudinaryError(
      `Failed to delete asset: ${errorMessage}`,
      API_ERROR_CODES.SERVER_ERROR
    );
  }
}

/**
 * Validates if a URL is a Cloudinary URL
 */
export function isCloudinaryUrl(url: string): boolean {
  return (
    /^https?:\/\/res\.cloudinary\.com\/[^\/]+\//.test(url) ||
    /^https?:\/\/[^.]+\.cloudinary\.com\//.test(url)
  );
}

/**
 *
 * @param imageUrls
 */
export function validateImageUrls(imageUrls: string[]): void {
  for (const url of imageUrls) {
    if (!isCloudinaryUrl(url)) {
      throw new CloudinaryError(
        `Invalid Cloudinary URL: ${url}`,
        API_ERROR_CODES.IMAGE_VALIDATION_ERROR,
        400
      );
    }
  }
}

/**
 * Extracts public ID from a Cloudinary URL
 */
export function extractPublicId(cloudinaryUrl: string): string | null {
  const match = cloudinaryUrl.match(/\/upload\/(?:v\d+\/)?(.+)$/);
  if (match) {
    const publicId = match[1];
    // Remove file extension if present
    return publicId.replace(/\.[^.]+$/, "");
  }
  return null;
}
