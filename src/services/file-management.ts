/**
 * File Management Service
 *
 * This service wraps the Cloudinary service and automatically manages file records
 * in the Convex database. It provides a unified interface for file operations that
 * ensures consistency between Cloudinary storage and the application database.
 *
 * Features:
 * - Automatic file metadata storage in Convex after Cloudinary upload
 * - File categorization and organization
 * - User-based file management
 * - Batch operations support
 * - Comprehensive error handling
 * - Usage tracking and analytics
 *
 * Usage:
 * ```typescript
 * import { FileManagementService } from '@/services/file-management';
 *
 * const service = new FileManagementService();
 * const result = await service.uploadImage(buffer, 'product-image', userId, {
 *   category: 'product_image',
 *   filename: 'product.jpg'
 * });
 * ```
 */

import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { ConvexHttpClient } from "convex/browser";
import {
  uploadImageBuffer,
  deleteAsset,
  generateTransformedUrl,
  generateResponsiveUrls,
  CloudinaryUploadOptions,
  CloudinaryUploadResult,
  TransformationOptions,
  CloudinaryError,
  CLOUDINARY_CONFIG,
  extractPublicId,
} from "../lib/cloudinary";
import { API_ERROR_CODES, APIErrorCode } from "@/constants/api-errors";

// Initialize Convex client
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * File categories supported by the system
 */
export type FileCategory =
  | "product_image"
  | "model_image"
  | "generated_image"
  | "profile_image";

/**
 * Extended upload options that include database metadata
 */
export interface FileUploadOptions
  extends Omit<CloudinaryUploadOptions, "folder"> {
  category: FileCategory;
  filename?: string;
  generationId?: Id<"generations">;
  isPrimary?: boolean;
  imageOrder?: number;
}

/**
 * Complete file upload result including database record
 */
export interface FileUploadResult extends CloudinaryUploadResult {
  fileId: Id<"files">;
  metadata: {
    width: number;
    height: number;
    format: string;
    bytes: number;
    category: FileCategory;
    filename: string;
    generationId?: Id<"generations">;
    isPrimary?: boolean;
    imageOrder?: number;
  };
}

/**
 * File retrieval result from database
 */
export interface FileRecord {
  _id: Id<"files">;
  userId: Id<"users">;
  filename: string;
  contentType: string;
  size: number;
  storageId: string;
  category: FileCategory;
  uploadedAt: number;
  metadata?: {
    width?: number;
    height?: number;
    format?: string;
    generationId?: Id<"generations">;
    originalUrl?: string;
    isPrimary?: boolean;
    imageOrder?: number;
  };
}

/**
 * Custom error class for file management operations
 */
class FileManagementError extends Error {
  constructor(
    message: string,
    public code: APIErrorCode,
    public statusCode?: number,
    public details?: string
  ) {
    super(message);
    this.name = "FileManagementError";
  }
}

/**
 * File Management Service Class
 */
export class FileManagementService {
  /**
   * Upload an image to Cloudinary and store metadata in Convex database
   */
  async uploadImage(
    bytes: ArrayBuffer,
    userId: Id<"users">,
    options: FileUploadOptions
  ): Promise<FileUploadResult> {
    try {
      // Generate filename if not provided
      const filename = options.filename || `${options.category}_${Date.now()}`;

      // Prepare Cloudinary upload options
      const cloudinaryOptions: CloudinaryUploadOptions = {
        ...options,
        folder: CLOUDINARY_CONFIG.folders.uploads,
        public_id: `${userId}_${filename}_${Date.now()}`,
      };

      // Upload to Cloudinary
      const cloudinaryResult = await uploadImageBuffer(
        bytes,
        filename,
        cloudinaryOptions
      );

      // Detect content type from format
      const contentType = this.getContentTypeFromFormat(
        cloudinaryResult.format
      );

      // Store metadata in Convex database
      const fileId = await convex.mutation(api.files.storeFileMetadata, {
        userId,
        filename,
        contentType,
        size: cloudinaryResult.bytes,
        storageId: cloudinaryResult.public_id,
        category: options.category,
        metadata: {
          width: cloudinaryResult.width,
          height: cloudinaryResult.height,
          format: cloudinaryResult.format,
          originalUrl: cloudinaryResult.secure_url,
          generationId: options.generationId,
          isPrimary: options.isPrimary,
          imageOrder: options.imageOrder,
        },
      });

      return {
        ...cloudinaryResult,
        fileId,
        metadata: {
          width: cloudinaryResult.width,
          height: cloudinaryResult.height,
          format: cloudinaryResult.format,
          bytes: cloudinaryResult.bytes,
          category: options.category,
          filename,
          generationId: options.generationId,
          isPrimary: options.isPrimary,
          imageOrder: options.imageOrder,
        },
      };
    } catch (error) {
      if (error instanceof CloudinaryError) {
        throw new FileManagementError(
          `Cloudinary upload failed: ${error.message}`,
          error.code,
          error.statusCode,
          error.details
        );
      }

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new FileManagementError(
        `File upload failed: ${errorMessage}`,
        API_ERROR_CODES.SERVER_ERROR,
        500
      );
    }
  }

  /**
   * Upload multiple images in batch
   */
  async uploadImages(
    files: { bytes: ArrayBuffer; options: FileUploadOptions }[],
    userId: Id<"users">
  ): Promise<FileUploadResult[]> {
    const results: FileUploadResult[] = [];
    const errors: Array<{ index: number; error: Error }> = [];

    for (let i = 0; i < files.length; i++) {
      try {
        const result = await this.uploadImage(files[i].bytes, userId, {
          ...files[i].options,
          imageOrder: files[i].options.imageOrder ?? i,
        });
        results.push(result);
      } catch (error) {
        errors.push({
          index: i,
          error: error instanceof Error ? error : new Error("Unknown error"),
        });
      }
    }

    if (errors.length > 0) {
      console.warn(
        `Batch upload completed with ${errors.length} errors:`,
        errors
      );
    }

    return results;
  }

  /**
   * Delete a file from both Cloudinary and database
   */
  async deleteFile(fileId: Id<"files">, userId: Id<"users">): Promise<void> {
    try {
      // Get file record from database
      const fileRecord = await convex.query(api.files.getFile, { fileId });

      if (!fileRecord) {
        throw new FileManagementError(
          "File not found",
          API_ERROR_CODES.USER_NOT_FOUND,
          404
        );
      }

      // Verify user ownership
      if (fileRecord.userId !== userId) {
        throw new FileManagementError(
          "Unauthorized to delete this file",
          API_ERROR_CODES.AUTHENTICATION_REQUIRED,
          403
        );
      }

      // Delete from Cloudinary
      await deleteAsset(fileRecord.storageId);

      // Delete from database
      await convex.mutation(api.files.deleteFile, { fileId });
    } catch (error) {
      if (error instanceof FileManagementError) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new FileManagementError(
        `File deletion failed: ${errorMessage}`,
        API_ERROR_CODES.SERVER_ERROR,
        500
      );
    }
  }

  /**
   * Get user's files with optional filtering
   */
  async getUserFiles(
    userId: Id<"users">,
    category?: FileCategory,
    limit?: number
  ): Promise<FileRecord[]> {
    try {
      return await convex.query(api.files.getUserFiles, {
        userId,
        category,
        limit,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new FileManagementError(
        `Failed to retrieve user files: ${errorMessage}`,
        API_ERROR_CODES.SERVER_ERROR,
        500
      );
    }
  }

  /**
   * Get file by ID
   */
  async getFile(fileId: Id<"files">): Promise<FileRecord | null> {
    try {
      return await convex.query(api.files.getFile, { fileId });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new FileManagementError(
        `Failed to retrieve file: ${errorMessage}`,
        API_ERROR_CODES.SERVER_ERROR,
        500
      );
    }
  }

  /**
   * Get file by Cloudinary public ID
   */
  async getFileByStorageId(storageId: string): Promise<FileRecord | null> {
    try {
      return await convex.query(api.files.getFileByStorageId, { storageId });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new FileManagementError(
        `Failed to retrieve file by storage ID: ${errorMessage}`,
        API_ERROR_CODES.SERVER_ERROR,
        500
      );
    }
  }

  /**
   * Generate transformed URL for a file
   */
  generateTransformedUrl(
    publicId: string,
    transformations: TransformationOptions = {}
  ): string {
    return generateTransformedUrl(publicId, transformations);
  }

  /**
   * Generate responsive URLs for a file
   */
  generateResponsiveUrls(
    publicId: string,
    breakpoints: { width: number; height?: number }[]
  ): { width: number; url: string }[] {
    return generateResponsiveUrls(publicId, breakpoints);
  }

  /**
   * Get file URL from database record
   */
  getFileUrl(
    file: FileRecord,
    transformations?: TransformationOptions
  ): string {
    if (file.metadata?.originalUrl && !transformations) {
      return file.metadata.originalUrl;
    }

    return this.generateTransformedUrl(file.storageId, transformations);
  }

  /**
   * Update file metadata in database
   */
  async updateFileMetadata(
    fileId: Id<"files">,
    userId: Id<"users">,
    metadata: {
      width?: number;
      height?: number;
      format?: string;
      generationId?: Id<"generations">;
      originalUrl?: string;
      isPrimary?: boolean;
      imageOrder?: number;
    }
  ): Promise<void> {
    try {
      // Verify file ownership
      const file = await this.getFile(fileId);
      if (!file || file.userId !== userId) {
        throw new FileManagementError(
          "File not found or unauthorized",
          API_ERROR_CODES.AUTHENTICATION_REQUIRED,
          403
        );
      }

      await convex.mutation(api.files.updateFileMetadata, {
        fileId,
        metadata,
      });
    } catch (error) {
      if (error instanceof FileManagementError) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new FileManagementError(
        `Failed to update file metadata: ${errorMessage}`,
        API_ERROR_CODES.SERVER_ERROR,
        500
      );
    }
  }

  /**
   * Extract public ID from a Cloudinary URL
   */
  extractPublicIdFromUrl(cloudinaryUrl: string): string | null {
    return extractPublicId(cloudinaryUrl);
  }

  /**
   * Helper method to determine content type from format
   */
  private getContentTypeFromFormat(format: string): string {
    const contentTypeMap: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      gif: "image/gif",
      bmp: "image/bmp",
      tiff: "image/tiff",
    };

    return contentTypeMap[format.toLowerCase()] || "image/jpeg";
  }
}

// Export singleton instance
export const fileManagementService = new FileManagementService();

// Export utility functions
export {
  generateTransformedUrl,
  generateResponsiveUrls,
  extractPublicId,
} from "../lib/cloudinary";

export type {
  TransformationOptions,
  CloudinaryUploadResult,
} from "../lib/cloudinary";
