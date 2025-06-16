"use client";

import { useCallback, useState, useEffect, useRef } from "react";
import { useDropzone, FileRejection } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { FileCategory } from "@/convex/types";

interface UploadedImage {
  id: string;
  url: string;
  publicId: string;
  file: File;
}

interface MultiImageUploadProps {
  onImagesChange: (urls: string[]) => void;
  value?: string[]; // Current image URLs from form state
  accept?: Record<string, string[]>;
  maxSize?: number;
  maxImages?: number;
  placeholder?: string;
  optional?: boolean;
  className?: string;
  category?: FileCategory;
  label?: string;
  description?: string;
}

export function MultiImageUpload({
  onImagesChange,
  value = [],
  accept = { "image/*": [".jpg", ".jpeg", ".png", ".webp"] },
  maxSize = 10 * 1024 * 1024, // 10MB
  maxImages = 5,
  placeholder = "Upload images",
  optional = false,
  className,
  category = "product_image",
  label,
  description,
}: MultiImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const lastValueRef = useRef<string[]>([]);

  // Sync internal state with form values when component mounts or values change
  useEffect(() => {
    const currentValue = value || [];
    const lastValue = lastValueRef.current;

    // Only update if the URLs have actually changed
    if (
      JSON.stringify(currentValue.sort()) !== JSON.stringify(lastValue.sort())
    ) {
      lastValueRef.current = currentValue;

      if (currentValue.length > 0) {
        // Create UploadedImage objects from the form URLs
        const imagesFromUrls: UploadedImage[] = currentValue.map(
          (url, index) => ({
            id: `existing-${index}-${url.split("/").pop()}`, // Create unique ID from URL
            url,
            publicId: url.split("/").pop()?.split(".")[0] || "", // Extract publicId from URL
            file: new File([], url.split("/").pop() || `image-${index}.jpg`), // Create dummy file
          })
        );

        setUploadedImages(imagesFromUrls);
      } else {
        // Clear uploaded images if form value is empty
        setUploadedImages([]);
      }
    }
  }, [value]);

  console.log("uploadedImages", uploadedImages);

  const uploadToServer = useCallback(
    async (file: File): Promise<{ url: string; publicId: string }> => {
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
      return { url: data.url, publicId: data.publicId };
    },
    [category]
  );

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (uploadedImages.length >= maxImages) {
        toast.error(`Maximum ${maxImages} images allowed`);
        return;
      }

      const filesToUpload = acceptedFiles.slice(
        0,
        maxImages - uploadedImages.length
      );

      setError(null);
      setUploading(true);

      try {
        const uploadPromises = filesToUpload.map(async (file) => {
          const { url, publicId } = await uploadToServer(file);
          return {
            id: Math.random().toString(36).substr(2, 9),
            url,
            publicId,
            file,
          };
        });

        const newImages = await Promise.all(uploadPromises);
        const updatedImages = [...uploadedImages, ...newImages];

        setUploadedImages(updatedImages);
        onImagesChange(updatedImages.map((img) => img.url));

        toast.success(
          `${newImages.length} image${newImages.length > 1 ? "s" : ""} uploaded successfully`
        );
      } catch (error) {
        console.error("Upload failed:", error);
        setError("Failed to upload image(s). Please try again.");
        toast.error("Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [onImagesChange, uploadToServer, uploadedImages, maxImages]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple: true,
    onDropRejected: (rejectedFiles: FileRejection[]) => {
      const firstRejection = rejectedFiles[0];
      if (
        firstRejection.errors.some((error) => error.code === "file-too-large")
      ) {
        setError(
          `File too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB`
        );
        toast.error("File too large");
      } else if (
        firstRejection.errors.some(
          (error) => error.code === "file-invalid-type"
        )
      ) {
        setError("Invalid file type. Please upload images only.");
        toast.error("Invalid file type");
      }
    },
  });

  const removeImage = async (imageId: string) => {
    const imageToRemove = uploadedImages.find((img) => img.id === imageId);

    if (imageToRemove?.publicId) {
      try {
        await fetch(
          `/api/upload?publicId=${encodeURIComponent(imageToRemove.publicId)}`,
          {
            method: "DELETE",
          }
        );
      } catch (error) {
        console.error("Failed to delete image from server:", error);
      }
    }

    const updatedImages = uploadedImages.filter((img) => img.id !== imageId);
    setUploadedImages(updatedImages);
    onImagesChange(updatedImages.map((img) => img.url));
    setError(null);
  };

  const canUploadMore = uploadedImages.length < maxImages;

  return (
    <div className={cn("space-y-4", className)}>
      {label && (
        <div>
          <h3 className="text-lg font-semibold">{label}</h3>
          {description && (
            <p className="text-muted-foreground text-sm">{description}</p>
          )}
        </div>
      )}

      {/* Uploaded Images Grid */}
      {uploadedImages.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {uploadedImages.map((image, index) => (
            <Card key={image.id} className="group relative overflow-hidden">
              <CardContent className="p-2">
                <div className="relative aspect-square overflow-hidden rounded-md">
                  <Image
                    src={image.url}
                    alt={`Uploaded image ${index + 1}`}
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20" />

                  {/* Remove button */}
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={() => removeImage(image.id)}
                  >
                    <Icons.X className="h-3 w-3" />
                  </Button>

                  {/* Image number indicator */}
                  <div className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-xs text-white">
                    {index + 1}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Area */}
      {canUploadMore && (
        <div
          {...getRootProps()}
          className={cn(
            "border-muted-foreground/25 hover:border-muted-foreground/50 relative cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors",
            isDragActive && "border-primary bg-primary/5",
            error && "border-destructive bg-destructive/5",
            !canUploadMore && "cursor-not-allowed opacity-50"
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
                  {isDragActive ? "Drop images here" : placeholder}
                </p>
                <p className="text-muted-foreground mt-2 text-sm">
                  Drag & drop or click to select multiple images
                  {optional && " (optional)"}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  JPG, PNG, WebP up to {Math.round(maxSize / 1024 / 1024)}MB
                  each
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {uploadedImages.length}/{maxImages} images uploaded
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {error && <p className="text-destructive text-sm">{error}</p>}

      {/* Instructions */}
      {uploadedImages.length > 0 && (
        <div className="bg-muted/50 rounded-md p-3">
          <p className="text-muted-foreground text-xs">
            💡 Tip: The order of images matters. The first image will be the
            primary reference.
            {uploadedImages.length > 1 &&
              " You can reorder images by dragging them."}
          </p>
        </div>
      )}
    </div>
  );
}
