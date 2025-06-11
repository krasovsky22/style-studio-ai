"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Icons } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { Generation, GenerationStatus } from "@/types/generation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import Image from "next/image";

interface GenerationStatusDisplayProps {
  generationId: Id<"generations">;
  onComplete?: (generation: Generation) => void;
  onError?: (error: string) => void;
  className?: string;
}

const statusConfig = {
  queued: {
    label: "Queued",
    description: "Waiting in generation queue...",
    icon: Icons.Clock,
    color: "bg-blue-500",
    progress: 10,
  },
  processing: {
    label: "Processing",
    description: "AI is generating your image...",
    icon: Icons.Loader2,
    color: "bg-yellow-500",
    progress: 50,
  },
  completed: {
    label: "Completed",
    description: "Generation finished successfully!",
    icon: Icons.CheckCircle,
    color: "bg-green-500",
    progress: 100,
  },
  failed: {
    label: "Failed",
    description: "Generation failed. Please try again.",
    icon: Icons.XCircle,
    color: "bg-red-500",
    progress: 0,
  },
  cancelled: {
    label: "Cancelled",
    description: "Generation was cancelled.",
    icon: Icons.X,
    color: "bg-gray-500",
    progress: 0,
  },
} as const;

export function GenerationStatusDisplay({
  generationId,
  onComplete,
  onError,
  className,
}: GenerationStatusDisplayProps) {
  const [previousStatus, setPreviousStatus] = useState<GenerationStatus | null>(
    null
  );

  // Subscribe to real-time updates
  const generation = useQuery(api.generations.getGeneration, {
    id: generationId,
  });

  // Handle status changes
  useEffect(() => {
    if (!generation || !previousStatus) {
      if (generation) {
        setPreviousStatus(generation.status);
      }
      return;
    }

    if (generation.status !== previousStatus) {
      setPreviousStatus(generation.status);

      // Show notifications for status changes
      switch (generation.status) {
        case "processing":
          toast.info("Generation started");
          break;
        case "completed":
          toast.success("Generation completed!");
          onComplete?.(generation);
          break;
        case "failed":
          toast.error(generation.error || "Generation failed");
          onError?.(generation.error || "Generation failed");
          break;
        case "cancelled":
          toast.info("Generation cancelled");
          break;
      }
    }
  }, [generation?.status, previousStatus, onComplete, onError, generation]);

  if (!generation) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Icons.Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading generation status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const config = statusConfig[generation.status];
  const StatusIcon = config.icon;
  const isAnimated = generation.status === "processing";

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">Generation Status</CardTitle>
            <CardDescription>
              Started {new Date(generation._creationTime).toLocaleTimeString()}
            </CardDescription>
          </div>

          <Badge variant="secondary" className={cn("text-white", config.color)}>
            <StatusIcon
              className={cn("mr-1 h-3 w-3", isAnimated && "animate-spin")}
            />
            {config.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{config.progress}%</span>
          </div>
          <Progress value={config.progress} className="h-2" />
        </div>

        {/* Status Description */}
        <p className="text-muted-foreground text-sm">{config.description}</p>

        {/* Generation Details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Tokens Used:</span>
            <span className="ml-2 font-medium">{generation.tokensUsed}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Style:</span>
            <span className="ml-2 font-medium capitalize">
              {generation.style}
            </span>
          </div>
          {generation.processingTime && (
            <div className="col-span-2">
              <span className="text-muted-foreground">Processing Time:</span>
              <span className="ml-2 font-medium">
                {generation.processingTime}s
              </span>
            </div>
          )}
        </div>

        {/* Error Display */}
        {generation.status === "failed" && generation.error && (
          <div className="bg-destructive/10 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Icons.AlertTriangle className="text-destructive h-4 w-4" />
              <span className="text-destructive text-sm font-medium">
                Error Details
              </span>
            </div>
            <p className="text-destructive/80 mt-1 text-xs">
              {generation.error}
            </p>
          </div>
        )}

        {/* Result Images */}
        {generation.status === "completed" && generation.resultImageUrl && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Result</h4>
            <div className="relative aspect-video overflow-hidden rounded-lg border">
              <Image
                src={generation.resultImageUrl}
                alt="Generated result"
                fill
                className="object-cover"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const link = document.createElement("a");
                  link.href = generation.resultImageUrl!;
                  link.download = `generation-${generation._id}.jpg`;
                  link.click();
                }}
              >
                <Icons.Download className="mr-2 h-4 w-4" />
                Download
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: "AI Generated Fashion Image",
                      url: generation.resultImageUrl,
                    });
                  } else {
                    navigator.clipboard.writeText(generation.resultImageUrl!);
                    toast.success("Link copied to clipboard");
                  }
                }}
              >
                <Icons.Share className="mr-2 h-4 w-4" />
                Share
              </Button>
            </div>
          </div>
        )}

        {/* Retry Button for Failed Generations */}
        {generation.status === "failed" && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              // This would trigger a retry - implement based on your retry logic
              toast.info("Retry functionality would be implemented here");
            }}
          >
            <Icons.RotateCcw className="mr-2 h-4 w-4" />
            Retry Generation
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
