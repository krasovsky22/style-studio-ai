/**
 * File Management Example Component
 *
 * Demonstrates how to use the file management service and hook
 * for uploading, displaying, and managing images in the application.
 *
 * Features demonstrated:
 * - File upload with drag & drop
 * - Upload progress tracking
 * - File preview and management
 * - Error handling
 * - File categorization
 * - Responsive image URLs
 */

"use client";

import React, { useState, useCallback } from "react";
import { useFileManagement, UploadedFile } from "@/hooks/use-file-management";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Trash2, Upload, Image as ImageIcon } from "lucide-react";
import { ImageWithLoader } from "@/components/ui/image-with-loader";
import { Id } from "../../../convex/_generated/dataModel";

interface FileManagerProps {
  category?:
    | "product_image"
    | "model_image"
    | "generated_image"
    | "profile_image";
  maxFiles?: number;
  onFileUploaded?: (file: UploadedFile) => void;
}

export function FileManager({
  category = "product_image",
  maxFiles = 5,
  onFileUploaded,
}: FileManagerProps) {
  const {
    files,
    isUploading,
    uploadProgress,
    error,
    uploadFile,
    uploadFiles,
    deleteFile,
    getFileUrl,
    clearError,
  } = useFileManagement(category);

  const [dragOver, setDragOver] = useState(false);

  /**
   * Handle file drop
   */
  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      clearError();

      const droppedFiles = Array.from(e.dataTransfer.files).filter((file) =>
        file.type.startsWith("image/")
      );

      if (droppedFiles.length === 0) {
        return;
      }

      // Limit number of files
      const filesToUpload = droppedFiles.slice(0, maxFiles - files.length);

      if (filesToUpload.length === 1) {
        // Single file upload
        const result = await uploadFile(filesToUpload[0], { category });
        if (result && onFileUploaded) {
          onFileUploaded(result);
        }
      } else if (filesToUpload.length > 1) {
        // Multiple file upload
        const fileOptions = filesToUpload.map((file, index) => ({
          file,
          options: { category, imageOrder: index },
        }));

        const results = await uploadFiles(fileOptions);
        results.forEach((result) => {
          if (onFileUploaded) {
            onFileUploaded(result);
          }
        });
      }
    },
    [
      files.length,
      maxFiles,
      category,
      uploadFile,
      uploadFiles,
      onFileUploaded,
      clearError,
    ]
  );

  /**
   * Handle file input change
   */
  const handleFileInputChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = e.target.files;
      if (!selectedFiles || selectedFiles.length === 0) return;

      clearError();
      const imageFiles = Array.from(selectedFiles).filter((file) =>
        file.type.startsWith("image/")
      );

      if (imageFiles.length === 1) {
        const result = await uploadFile(imageFiles[0], { category });
        if (result && onFileUploaded) {
          onFileUploaded(result);
        }
      } else if (imageFiles.length > 1) {
        const fileOptions = imageFiles.map((file, index) => ({
          file,
          options: { category, imageOrder: index },
        }));

        const results = await uploadFiles(fileOptions);
        results.forEach((result) => {
          if (onFileUploaded) {
            onFileUploaded(result);
          }
        });
      }

      // Reset file input
      e.target.value = "";
    },
    [category, uploadFile, uploadFiles, onFileUploaded, clearError]
  );

  /**
   * Handle file deletion
   */
  const handleDeleteFile = useCallback(
    async (fileId: string) => {
      const success = await deleteFile(fileId as Id<"files">);
      if (!success && error) {
        console.error("Failed to delete file:", error);
      }
    },
    [deleteFile, error]
  );

  /**
   * Get category color for badges
   */
  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case "product_image":
        return "bg-blue-100 text-blue-800";
      case "model_image":
        return "bg-green-100 text-green-800";
      case "generated_image":
        return "bg-purple-100 text-purple-800";
      case "profile_image":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  /**
   * Format file size
   */
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload{" "}
            {category
              .replace("_", " ")
              .replace(/\b\w/g, (l) => l.toUpperCase())}
            s
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Drag & Drop Area */}
          <div
            className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
              dragOver
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 hover:border-gray-400"
            } ${isUploading ? "pointer-events-none opacity-50" : ""}`}
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
          >
            <ImageIcon className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <p className="mb-2 text-lg font-medium text-gray-900">
              Drop images here or click to upload
            </p>
            <p className="mb-4 text-sm text-gray-500">
              Supports JPG, PNG, and WebP files up to 10MB
            </p>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileInputChange}
              className="hidden"
              id="file-upload"
              disabled={isUploading}
            />
            <Button asChild disabled={isUploading}>
              <label htmlFor="file-upload" className="cursor-pointer">
                Choose Files
              </label>
            </Button>
          </div>

          {/* Upload Progress */}
          {isUploading && (
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          )}

          {/* Error Display */}
          {error && (
            <Alert className="mt-4" variant="destructive">
              <AlertDescription>
                {error}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearError}
                  className="ml-2"
                >
                  Dismiss
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* File Grid */}
      {files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Uploaded Files ({files.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {files.map((file) => (
                <div key={file._id} className="space-y-3 rounded-lg border p-4">
                  {/* Image Preview */}
                  <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
                    <ImageWithLoader
                      src={getFileUrl(file, {
                        width: 300,
                        height: 300,
                        quality: "auto",
                      })}
                      alt={file.filename}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  {/* File Info */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge className={getCategoryColor(file.category)}>
                        {file.category.replace("_", " ")}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteFile(file._id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="space-y-1 text-sm">
                      <p className="truncate font-medium" title={file.filename}>
                        {file.filename}
                      </p>
                      <p className="text-gray-500">
                        {formatFileSize(file.size)}
                      </p>
                      {file.metadata?.width && file.metadata?.height && (
                        <p className="text-gray-500">
                          {file.metadata.width} × {file.metadata.height}
                        </p>
                      )}
                      <p className="text-gray-500">
                        {new Date(file.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {files.length === 0 && !isUploading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ImageIcon className="mb-4 h-12 w-12 text-gray-400" />
            <p className="mb-2 text-lg font-medium text-gray-900">
              No files uploaded yet
            </p>
            <p className="text-sm text-gray-500">
              Upload your first {category.replace("_", " ")} to get started
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default FileManager;
