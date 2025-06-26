/**
 * File Management Hook
 *
 * React hook for managing file uploads and operations using the file management service.
 * Provides a clean interface for frontend components to interact with file operations.
 *
 * Features:
 * - File upload with progress tracking
 * - File deletion
 * - File listing and filtering
 * - Error handling and status management
 * - Support for batch operations
 *
 * Usage:
 * ```typescript
 * import { useFileManagement } from '@/hooks/use-file-management';
 *
 * const { uploadFile, deleteFile, files, isUploading, error } = useFileManagement();
 *
 * const handleUpload = async (file: File) => {
 *   await uploadFile(file, { category: 'product_image' });
 * };
 * ```
 */

import { useState, useCallback } from "react";
import { useAuth } from "./use-auth";
import { api } from "../../convex/_generated/api";
import { useQuery } from "convex/react";
import { Id } from "../../convex/_generated/dataModel";

export interface FileUploadOptions {
  category:
    | "product_image"
    | "model_image"
    | "generated_image"
    | "profile_image";
  generationId?: Id<"generations">;
  isPrimary?: boolean;
  imageOrder?: number;
}

export interface UploadedFile {
  fileId: Id<"files">;
  url: string;
  publicId: string;
  metadata: {
    width: number;
    height: number;
    format: string;
    bytes: number;
    category: string;
    filename: string;
  };
}

export interface FileRecord {
  _id: Id<"files">;
  userId: Id<"users">;
  filename: string;
  contentType: string;
  size: number;
  storageId: string;
  category:
    | "product_image"
    | "model_image"
    | "generated_image"
    | "profile_image";
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

export function useFileManagement(category?: FileUploadOptions["category"]) {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Query user files
  const userFiles = useQuery(
    api.files.getUserFiles,
    user?.id ? { userId: user.id as Id<"users">, category, limit: 50 } : "skip"
  ) as FileRecord[] | undefined;

  /**
   * Upload a single file
   */
  const uploadFile = useCallback(
    async (
      file: File,
      options: FileUploadOptions
    ): Promise<UploadedFile | null> => {
      if (!user?.id) {
        setError("User not authenticated");
        return null;
      }

      setIsUploading(true);
      setError(null);
      setUploadProgress(0);

      try {
        // Create form data
        const formData = new FormData();
        formData.append("file", file);
        formData.append("category", options.category);

        if (options.generationId) {
          formData.append("generationId", options.generationId);
        }
        if (options.isPrimary !== undefined) {
          formData.append("isPrimary", options.isPrimary.toString());
        }
        if (options.imageOrder !== undefined) {
          formData.append("imageOrder", options.imageOrder.toString());
        }

        // Create XMLHttpRequest for progress tracking
        const xhr = new XMLHttpRequest();

        return new Promise((resolve, reject) => {
          xhr.upload.addEventListener("progress", (event) => {
            if (event.lengthComputable) {
              const progress = Math.round((event.loaded * 100) / event.total);
              setUploadProgress(progress);
            }
          });

          xhr.addEventListener("load", () => {
            setIsUploading(false);
            setUploadProgress(100);

            if (xhr.status === 200) {
              try {
                const response = JSON.parse(xhr.responseText);
                if (response.success) {
                  resolve({
                    fileId: response.fileId,
                    url: response.url,
                    publicId: response.publicId,
                    metadata: response.metadata,
                  });
                } else {
                  setError(response.error || "Upload failed");
                  reject(new Error(response.error || "Upload failed"));
                }
              } catch {
                setError("Invalid response from server");
                reject(new Error("Invalid response from server"));
              }
            } else {
              setError(`Upload failed with status: ${xhr.status}`);
              reject(new Error(`Upload failed with status: ${xhr.status}`));
            }
          });

          xhr.addEventListener("error", () => {
            setIsUploading(false);
            setError("Network error during upload");
            reject(new Error("Network error during upload"));
          });

          xhr.open("POST", "/api/upload");
          xhr.send(formData);
        });
      } catch (error) {
        setIsUploading(false);
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        setError(errorMessage);
        return null;
      }
    },
    [user?.id]
  );

  /**
   * Upload multiple files
   */
  const uploadFiles = useCallback(
    async (
      files: Array<{ file: File; options: FileUploadOptions }>
    ): Promise<UploadedFile[]> => {
      const results: UploadedFile[] = [];

      for (let i = 0; i < files.length; i++) {
        const { file, options } = files[i];
        const result = await uploadFile(file, {
          ...options,
          imageOrder: options.imageOrder ?? i,
        });

        if (result) {
          results.push(result);
        }
      }

      return results;
    },
    [uploadFile]
  );

  /**
   * Delete a file
   */
  const deleteFile = useCallback(
    async (fileId: Id<"files">): Promise<boolean> => {
      if (!user?.id) {
        setError("User not authenticated");
        return false;
      }

      setError(null);

      try {
        // Delete from API (which handles both Cloudinary and database)
        const response = await fetch(`/api/upload?fileId=${fileId}`, {
          method: "DELETE",
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          setError(result.error || "Failed to delete file");
          return false;
        }

        return true;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        setError(errorMessage);
        return false;
      }
    },
    [user?.id]
  );

  /**
   * Get file URL with optional transformations
   */
  const getFileUrl = useCallback(
    (
      file: FileRecord,
      transformations?: {
        width?: number;
        height?: number;
        quality?: string | number;
        format?: string;
      }
    ): string => {
      if (file.metadata?.originalUrl && !transformations) {
        return file.metadata.originalUrl;
      }

      // Build transformation URL
      const baseUrl = `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`;
      const transforms: string[] = [];

      if (transformations) {
        if (transformations.width)
          transforms.push(`w_${transformations.width}`);
        if (transformations.height)
          transforms.push(`h_${transformations.height}`);
        if (transformations.quality)
          transforms.push(`q_${transformations.quality}`);
        if (transformations.format)
          transforms.push(`f_${transformations.format}`);
        transforms.push("c_fill"); // Default crop mode
      }

      const transformString =
        transforms.length > 0 ? `/${transforms.join(",")}` : "";
      return `${baseUrl}${transformString}/${file.storageId}`;
    },
    []
  );

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    files: userFiles || [],
    isUploading,
    uploadProgress,
    error,

    // Actions
    uploadFile,
    uploadFiles,
    deleteFile,
    getFileUrl,
    clearError,
  };
}
