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
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { ImageGallery } from "./image-gallery";
import { GenerationStatus, Generation } from "@/convex/types";

// Type for the generation object returned from Convex
// type ConvexGeneration = {
//   _id: Id<"generations">;
//   _creationTime: number;
//   userId: Id<"users">;
//   status: GenerationStatus;
//   productImageUrl: string;
//   modelImageUrl?: string;
//   resultImageUrl?: string;
//   prompt: string;
//   parameters: {
//     model: string;
//     style?: string;
//     quality?: string;
//     aspectRatio?: string;
//     seed?: number;
//   };
//   tokensUsed: number;
//   processingTime?: number;
//   completedAt?: number;
//   error?: string;
//   retryCount: number;
//   replicateId?: string;
//   cloudinaryPublicId?: string;
//   createdAt: number;
// };

interface GenerationStatusDisplayProps {
  generationId: Id<"generations">;
  onComplete?: (generation: Generation) => void;
  onError?: (error: string) => void;
  className?: string;
}

interface StatusConfigType {
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  progress: number;
}

const statusConfig: Record<GenerationStatus, StatusConfigType> = {
  pending: {
    label: "Pending",
    description: "Waiting to start generation...",
    icon: Icons.Clock,
    color: "bg-blue-500",
    progress: 5,
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
              {generation.parameters.style || "default"}
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
        {generation.status === "completed" &&
          (generation.resultImages?.length || generation.resultImageUrl) && (
            <ImageGallery
              images={
                generation.resultImages?.length
                  ? generation.resultImages
                  : [generation.resultImageUrl!]
              }
              generationId={generation._id}
              aspectRatio="square"
              showActions={true}
              maxColumns={3}
            />
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
