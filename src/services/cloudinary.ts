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
class CloudinaryError extends Error {
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
const CLOUDINARY_CONFIG = {
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
 * Upload preset options interface
 */
interface CloudinaryPresetOptions {
  name: string;
  folder?: string;
  tags?: string;
  allowed_formats?: string;
  transformation?: TransformationOptions[];
}

/**
 * Upload preset response interface
 */
export interface CloudinaryPresetResult {
  name: string;
  settings: {
    folder?: string;
    tags?: string;
    allowed_formats?: string;
    transformation?: object;
  };
}

/**
 * Uploads image buffer to Cloudinary using upload_stream
 * Based on Cloudinary Node.js SDK best practices
 */
export async function uploadImageBuffer(
  buffer: Buffer,
  filename: string,
  options: CloudinaryUploadOptions = {}
): Promise<CloudinaryUploadResult> {
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
    transformation: options.transformation,
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
 * Uploads image from URL to Cloudinary
 * Using the upload method for URL sources
 */
export async function uploadImageFromUrl(
  imageUrl: string,
  filename: string,
  options: CloudinaryUploadOptions = {}
): Promise<CloudinaryUploadResult> {
  try {
    const uploadOptions = {
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
      transformation: options.transformation,
    };

    const result = await cloudinary.uploader.upload(imageUrl, uploadOptions);

    return {
      public_id: result.public_id,
      secure_url: result.secure_url,
      url: result.url,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
      created_at: result.created_at,
      etag: result.etag,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new CloudinaryError(
      `Upload from URL failed: ${errorMessage}`,
      API_ERROR_CODES.SERVER_ERROR
    );
  }
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
 * Gets detailed information about a Cloudinary asset
 * Uses the Admin API resource method
 */
export async function getAssetInfo(publicId: string) {
  try {
    const result = await cloudinary.api.resource(publicId, {
      colors: true,
      faces: true,
      quality_analysis: true,
    });

    return {
      public_id: result.public_id,
      secure_url: result.secure_url,
      url: result.url,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
      created_at: result.created_at,
      colors: result.colors,
      faces: result.faces,
      quality_analysis: result.quality_analysis,
      etag: result.etag,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new CloudinaryError(
      `Failed to get asset info: ${errorMessage}`,
      API_ERROR_CODES.SERVER_ERROR
    );
  }
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
 * Applies eager transformations to an existing asset
 * Uses the explicit method for post-upload transformations
 */
export async function applyEagerTransformations(
  publicId: string,
  transformations: TransformationOptions[]
): Promise<CloudinaryUploadResult> {
  try {
    const eagerTransformations = transformations.map((transform) => ({
      width: transform.width,
      height: transform.height,
      crop: transform.crop || "fill",
      quality: transform.quality || "auto",
      format: transform.format || "auto",
      gravity: transform.gravity,
      effect: transform.effect,
      radius: transform.radius,
      angle: transform.angle,
    }));

    const result = await cloudinary.uploader.explicit(publicId, {
      type: "upload",
      eager: eagerTransformations,
    });

    return {
      public_id: result.public_id,
      secure_url: result.secure_url,
      url: result.url,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
      created_at: result.created_at,
      etag: result.etag,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new CloudinaryError(
      `Failed to apply transformations: ${errorMessage}`,
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

/**
 * Creates an upload preset for consistent upload configurations
 */
export async function createUploadPreset(
  name: string,
  options: {
    folder?: string;
    tags?: string[];
    transformation?: TransformationOptions;
    allowed_formats?: string[];
  } = {}
): Promise<CloudinaryPresetResult> {
  try {
    const presetOptions: CloudinaryPresetOptions = {
      name,
      folder: options.folder || CLOUDINARY_CONFIG.folders.uploads,
      tags: options.tags?.join(", "),
      allowed_formats: options.allowed_formats?.join(", ") || "jpg, png, webp",
    };

    if (options.transformation) {
      presetOptions.transformation = [options.transformation];
    }

    const result = await cloudinary.api.create_upload_preset(presetOptions);
    return {
      name: result.name,
      settings: {
        folder: result.settings.folder,
        tags: result.settings.tags,
        allowed_formats: result.settings.allowed_formats,
        transformation: result.settings.transformation,
      },
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new CloudinaryError(
      `Failed to create upload preset: ${errorMessage}`,
      API_ERROR_CODES.SERVER_ERROR
    );
  }
}

/**
 * @deprecated Use uploadImageBuffer instead
 * Backward compatibility wrapper for the old uploadToCloudinary function
 */
export async function uploadToCloudinary(
  buffer: Buffer,
  filename: string
): Promise<string> {
  const result = await uploadImageBuffer(buffer, filename, {
    folder: "generations",
    quality: "auto",
    format: "png",
  });
  return result.secure_url;
}

// Export the CloudinaryError class for external use
export { CloudinaryError };

// Placeholder function for image URL validation
export async function validateImageUrls(
  productImages: string[],
  modelImages?: string[]
): Promise<void> {
  // TODO: Implement proper image URL validation
  // For now, just basic URL validation
  const allImages = [...productImages, ...(modelImages || [])];

  for (const url of allImages) {
    try {
      new URL(url);
    } catch {
      throw new CloudinaryError(
        `Invalid image URL: ${url}`,
        API_ERROR_CODES.IMAGE_VALIDATION_ERROR,
        400
      );
    }
  }
}
