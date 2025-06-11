"use client";

import { useCallback, useState } from "react";
import { useDropzone, FileRejection } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Image from "next/image";

interface ImageUploadProps {
  onImageUpload: (url: string) => void;
  accept?: Record<string, string[]>;
  maxSize?: number;
  placeholder?: string;
  optional?: boolean;
  className?: string;
  category?:
    | "product_image"
    | "model_image"
    | "generated_image"
    | "profile_image";
}

export function ImageUpload({
  onImageUpload,
  accept = { "image/*": [".jpg", ".jpeg", ".png", ".webp"] },
  maxSize = 10 * 1024 * 1024, // 10MB
  placeholder = "Upload image",
  optional = false,
  className,
  category = "product_image",
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [publicId, setPublicId] = useState<string | null>(null);

  const uploadToServer = useCallback(
    async (file: File): Promise<string> => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", category);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to upload image");
      }

      const data = await response.json();
      setPublicId(data.publicId);
      return data.url;
    },
    [category]
  );

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setError(null);
      setUploading(true);

      try {
        const url = await uploadToServer(file);
        setUploadedImage(url);
        onImageUpload(url);
        toast.success("Image uploaded successfully");
      } catch (error) {
        console.error("Upload failed:", error);
        setError("Failed to upload image. Please try again.");
        toast.error("Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [onImageUpload, uploadToServer]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple: false,
    onDropRejected: (rejectedFiles: FileRejection[]) => {
      const rejection = rejectedFiles[0];
      if (rejection.errors.some((error) => error.code === "file-too-large")) {
        setError(
          `File too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB`
        );
        toast.error("File too large");
      } else if (
        rejection.errors.some((error) => error.code === "file-invalid-type")
      ) {
        setError("Invalid file type. Please upload an image.");
        toast.error("Invalid file type");
      }
    },
  });

  const removeImage = async () => {
    // If we have a publicId, delete from server/Cloudinary
    if (publicId) {
      try {
        await fetch(`/api/upload?publicId=${encodeURIComponent(publicId)}`, {
          method: "DELETE",
        });
      } catch (error) {
        console.error("Failed to delete image from server:", error);
        // Continue with local removal even if server deletion fails
      }
    }

    setUploadedImage(null);
    setPublicId(null);
    setError(null);
    onImageUpload("");
  };

  return (
    <div className={cn("space-y-4", className)}>
      {uploadedImage ? (
        <div className="relative">
          <div className="bg-muted relative aspect-video w-full overflow-hidden rounded-lg border">
            <Image
              src={uploadedImage}
              alt="Uploaded image"
              fill
              className="bg-white-foreground object-contain"
            />
          </div>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="absolute top-2 right-2"
            onClick={removeImage}
          >
            <Icons.X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={cn(
            "border-muted-foreground/25 hover:border-muted-foreground/50 relative cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors",
            isDragActive && "border-primary bg-primary/5",
            error && "border-destructive bg-destructive/5"
          )}
        >
          <input {...getInputProps()} />

          <div className="mx-auto flex max-w-[400px] flex-col items-center justify-center text-center">
            {uploading ? (
              <>
                <Icons.Loader2 className="text-muted-foreground mx-auto h-12 w-12 animate-spin" />
                <p className="text-muted-foreground mt-4 text-sm">
                  Uploading...
                </p>
              </>
            ) : (
              <>
                <Icons.Upload className="text-muted-foreground mx-auto h-12 w-12" />
                <p className="mt-4 text-lg font-semibold">
                  {isDragActive ? "Drop image here" : placeholder}
                </p>
                <p className="text-muted-foreground mt-2 text-sm">
                  Drag & drop or click to select
                  {optional && " (optional)"}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  JPG, PNG, WebP up to {Math.round(maxSize / 1024 / 1024)}MB
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}
