"use client";

import { useState } from "react";
import Image from "next/image";
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
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  return (
    <div className="relative">
      {isLoading && !hasError && (
        <div className="bg-muted/50 absolute inset-0 z-10 flex items-center justify-center">
          <Icons.Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
        </div>
      )}

      <Image
        src={src}
        alt={alt}
        fill={fill}
        width={width}
        height={height}
        className={cn(className, hasError && "opacity-50")}
        onClick={onClick}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
      />

      {hasError && (
        <div className="bg-muted absolute inset-0 flex items-center justify-center">
          <Icons.imageOff className="text-muted-foreground h-6 w-6" />
        </div>
      )}
    </div>
  );
}
