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
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ImageGalleryProps {
  images: string[];
  generationId: string;
  className?: string;
  aspectRatio?: "square" | "video" | "auto";
  showActions?: boolean;
  maxColumns?: 2 | 3 | 4;
}

export function ImageGallery({
  images,
  generationId,
  className,
  aspectRatio = "square",
  showActions = true,
  maxColumns = 3,
}: ImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<{
    url: string;
    index: number;
  } | null>(null);

  if (!images || images.length === 0) {
    return null;
  }

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

  const downloadImage = (imageUrl: string, index: number) => {
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `generation-${generationId}-${index + 1}.jpg`;
    link.click();
  };

  const downloadAllImages = () => {
    images.forEach((imageUrl, index) => {
      setTimeout(() => downloadImage(imageUrl, index), index * 100);
    });
    toast.success(`Downloaded ${images.length} images`);
  };

  const copyImageLink = (imageUrl: string) => {
    navigator.clipboard.writeText(imageUrl);
    toast.success("Image link copied to clipboard");
  };

  const copyAllLinks = () => {
    const urls = images.join("\n");
    navigator.clipboard.writeText(urls);
    toast.success("All image links copied to clipboard");
  };

  const shareImage = (imageUrl: string, index: number) => {
    if (navigator.share) {
      navigator.share({
        title: `AI Generated Fashion Image ${index + 1}`,
        url: imageUrl,
      });
    } else {
      copyImageLink(imageUrl);
    }
  };

  const openInNewTab = (imageUrl: string) => {
    window.open(imageUrl, "_blank");
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

        {showActions && images.length > 1 && (
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={downloadAllImages}>
              <Icons.Download className="mr-1 h-3 w-3" />
              All
            </Button>
            <Button variant="outline" size="sm" onClick={copyAllLinks}>
              <Icons.Copy className="mr-1 h-3 w-3" />
              Links
            </Button>
          </div>
        )}
      </div>

      {/* Image Grid */}
      <div className={cn("grid gap-3", getGridColumns())}>
        {images.map((imageUrl, index) => (
          <div key={index} className="group relative">
            <div
              className={cn(
                "bg-muted relative cursor-pointer overflow-hidden rounded-lg border",
                getAspectRatio()
              )}
            >
              <Image
                src={imageUrl}
                alt={`Generated result ${index + 1}`}
                fill
                className="object-cover transition-transform group-hover:scale-105"
                onClick={() => setSelectedImage({ url: imageUrl, index })}
              />

              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />

              {/* Image Actions Overlay */}
              {showActions && (
                <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadImage(imageUrl, index);
                      }}
                    >
                      <Icons.Download className="h-3 w-3" />
                    </Button>

                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        shareImage(imageUrl, index);
                      }}
                    >
                      <Icons.Share className="h-3 w-3" />
                    </Button>

                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        openInNewTab(imageUrl);
                      }}
                    >
                      <Icons.ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}

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

      {/* Bulk Actions for Single Images */}
      {showActions && images.length === 1 && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadImage(images[0], 0)}
          >
            <Icons.Download className="mr-2 h-4 w-4" />
            Download
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => shareImage(images[0], 0)}
          >
            <Icons.Share className="mr-2 h-4 w-4" />
            Share
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => copyImageLink(images[0])}
          >
            <Icons.Copy className="mr-2 h-4 w-4" />
            Copy Link
          </Button>
        </div>
      )}

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

              {/* Modal Actions */}
              <div className="mt-4 flex justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    downloadImage(selectedImage.url, selectedImage.index)
                  }
                >
                  <Icons.Download className="mr-2 h-4 w-4" />
                  Download
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    shareImage(selectedImage.url, selectedImage.index)
                  }
                >
                  <Icons.Share className="mr-2 h-4 w-4" />
                  Share
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyImageLink(selectedImage.url)}
                >
                  <Icons.Copy className="mr-2 h-4 w-4" />
                  Copy Link
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openInNewTab(selectedImage.url)}
                >
                  <Icons.ExternalLink className="mr-2 h-4 w-4" />
                  Open in New Tab
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
