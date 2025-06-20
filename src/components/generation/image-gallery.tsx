"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Icons } from "@/components/ui/icons";
import { ImageWithLoader } from "@/components/ui/image-with-loader";
import { cn } from "@/lib/utils";
// import { toast } from "sonner";

interface ImageGalleryProps {
  images?: string[];
  className?: string;
  aspectRatio?: "square" | "video" | "auto";
  showActions?: boolean;
  maxColumns?: 2 | 3 | 4;
  showLoader?: boolean;
}

export function ImageGallery({
  images = [],
  className,
  aspectRatio = "square",
  //   showActions = true,
  maxColumns = 3,
  showLoader = false,
}: ImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<{
    url: string;
    index: number;
  } | null>(null);

  const getImagesToShow = () => {
    if (images.length > 0) {
      return images;
    }

    if (!showLoader) {
      return [];
    }

    return Array.from(
      { length: maxColumns },
      (_, i) => `loading-placeholder-${i}`
    );
  };

  const getGridColumns = () => {
    if (images.length === 1) return "grid-cols-1";
    if (images.length === 2) return "grid-cols-2";
    if (maxColumns === 2) return "grid-cols-2";
    if (maxColumns === 4) return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4";
    return "grid-cols-2 lg:grid-cols-3";
  };

  const getAspectRatio = () => {
    switch (aspectRatio) {
      case "video":
        return "aspect-video";
      case "square":
        return "aspect-square";
      case "auto":
        return "aspect-auto";
      default:
        return "aspect-square";
    }
  };

  const navigateImage = (direction: "prev" | "next") => {
    if (!selectedImage) return;

    let newIndex = selectedImage.index;
    if (direction === "prev") {
      newIndex =
        selectedImage.index > 0 ? selectedImage.index - 1 : images.length - 1;
    } else {
      newIndex =
        selectedImage.index < images.length - 1 ? selectedImage.index + 1 : 0;
    }

    setSelectedImage({
      url: images[newIndex],
      index: newIndex,
    });
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium">Generated Images</h4>
          {images.length > 1 && (
            <Badge variant="secondary" className="text-xs">
              {images.length} variations
            </Badge>
          )}
        </div>
      </div>

      {/* Image Grid */}
      <div className={cn("grid gap-3", getGridColumns())}>
        {getImagesToShow().map((imageUrl, index) => (
          <div key={index} className="group relative">
            <div
              className={cn(
                "bg-muted relative cursor-pointer overflow-hidden rounded-lg border",
                getAspectRatio()
              )}
            >
              <ImageWithLoader
                src={imageUrl}
                alt={`Generated result ${index + 1}`}
                fill
                className="object-contain transition-transform group-hover:scale-105"
                onClick={() => setSelectedImage({ url: imageUrl, index })}
              />

              {/* Image Number Badge */}
              <div className="absolute top-2 right-2">
                <Badge variant="secondary" className="font-mono text-xs">
                  {index + 1}
                </Badge>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Image Modal */}
      <Dialog
        open={!!selectedImage}
        onOpenChange={() => setSelectedImage(null)}
      >
        <DialogContent className="max-h-[90vh] max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Generated Image {selectedImage ? selectedImage.index + 1 : ""} of{" "}
              {images.length}
            </DialogTitle>
          </DialogHeader>

          {selectedImage && (
            <div className="relative">
              {/* Navigation */}
              {images.length > 1 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute top-1/2 left-2 z-10 h-8 w-8 -translate-y-1/2 transform p-0"
                    onClick={() => navigateImage("prev")}
                  >
                    <Icons.rotateCcw className="h-3 w-3 rotate-90" />
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute top-1/2 right-2 z-10 h-8 w-8 -translate-y-1/2 transform p-0"
                    onClick={() => navigateImage("next")}
                  >
                    <Icons.rotateCcw className="h-3 w-3 -rotate-90" />
                  </Button>
                </>
              )}

              {/* Full Size Image */}
              <div className="relative max-h-[60vh] w-full overflow-hidden rounded-lg">
                <Image
                  src={selectedImage.url}
                  alt={`Generated result ${selectedImage.index + 1}`}
                  width={800}
                  height={600}
                  className="h-auto w-full object-contain"
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
