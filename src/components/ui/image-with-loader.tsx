"use client";

import React, { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

interface ImageWithLoaderProps {
  src: string;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  onClick?: () => void;
}

export function ImageWithLoader({
  src,
  alt,
  fill,
  width,
  height,
  className,
  onClick,
}: ImageWithLoaderProps) {
  const [hasError, setHasError] = useState(false);

  const isPlaceholder = src.includes("-placeholder-");

  const downloadImage = (imageUrl: string) => {
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `generation.jpg`;
    link.click();
  };

  const copyImageLink = (imageUrl: string) => {
    navigator.clipboard.writeText(imageUrl);
    toast.success("Image link copied to clipboard");
  };

  const shareImage = (imageUrl: string) => {
    if (navigator.share) {
      navigator.share({
        title: `AI Generated Fashion Image`,
        url: imageUrl,
      });
    } else {
      copyImageLink(imageUrl);
    }
  };

  const openInNewTab = (imageUrl: string) => {
    window.open(imageUrl, "_blank");
  };

  return (
    <div className="relative h-full w-full">
      {isPlaceholder && (
        <div className="bg-muted/50 absolute inset-0 z-10 flex items-center justify-center">
          <Icons.Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
        </div>
      )}

      {!isPlaceholder && (
        <React.Fragment>
          <Image
            src={src}
            alt={alt}
            fill={fill}
            width={width}
            height={height}
            className={cn(className, hasError && "opacity-50")}
            onClick={onClick}
            onError={() => {
              setHasError(true);
            }}
          />

          {hasError && (
            <div className="bg-muted absolute inset-0 flex items-center justify-center">
              <Icons.imageOff className="text-muted-foreground h-6 w-6" />
            </div>
          )}

          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />

          {/* Image Actions Overlay */}

          <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="secondary"
                className="h-8 w-8 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  downloadImage(src);
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
                  shareImage(src);
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
                  openInNewTab(src);
                }}
              >
                <Icons.ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </React.Fragment>
      )}
    </div>
  );
}
