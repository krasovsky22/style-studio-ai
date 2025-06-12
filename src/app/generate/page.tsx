"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Id } from "@/convex/_generated/dataModel";
import { Header } from "@/components/layout/header";
import { GenerationForm } from "@/components/generation/generation-form";
import { GenerationStatusDisplay } from "@/components/generation/generation-status";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Icons } from "@/components/ui/icons";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { GenerationOptions } from "@/types/generation";
import { toast } from "sonner";
import { useConvexAuth } from "@/hooks/use-convex-auth";

export default function GeneratePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [currentGeneration, setCurrentGeneration] =
    useState<Id<"generations"> | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastError, setLastError] = useState<{
    message: string;
    code?: string;
    details?: string;
  } | null>(null);
  const [lastGenerationOptions, setLastGenerationOptions] =
    useState<GenerationOptions | null>(null);

  // Get user's token balance
  const { convexUser } = useConvexAuth();

  const handleGeneration = async (options: GenerationOptions) => {
    if (!session?.user?.id) {
      toast.error("Please sign in to generate images");
      router.push("/auth/signin");
      return;
    }

    // Store the options for potential retry
    setLastGenerationOptions(options);

    // Clear any previous errors
    setLastError(null);
    setIsGenerating(true);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorInfo = {
          message: errorData.error || "Generation failed",
          code: errorData.code,
          details: errorData.details,
        };

        setLastError(errorInfo);

        // Show specific error messages based on error codes
        switch (errorData.code) {
          case "INSUFFICIENT_TOKENS":
            toast.error(
              "Insufficient tokens. Please purchase more tokens to continue."
            );
            break;
          case "RATE_LIMIT_EXCEEDED":
            toast.error(
              "Rate limit exceeded. Please wait a moment before trying again."
            );
            break;
          case "VALIDATION_ERROR":
            toast.error(
              "Invalid generation settings. Please check your inputs."
            );
            break;
          case "IMAGE_VALIDATION_ERROR":
            toast.error(
              "Image validation failed. Please check your uploaded images."
            );
            break;
          case "MODEL_ERROR":
            toast.error(
              "AI model configuration error. Please try a different model."
            );
            break;
          default:
            toast.error(errorData.error || "Generation failed");
        }

        return;
      }

      const generation = await response.json();
      setCurrentGeneration(generation._id);
      setLastError(null); // Clear any previous errors on success
      toast.success("Generation started!");
    } catch (error) {
      console.error("Generation failed:", error);

      // If we haven't already set a detailed error, set a generic one
      if (!lastError) {
        setLastError({
          message: error instanceof Error ? error.message : "Generation failed",
          code: "UNKNOWN_ERROR",
        });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const retryGeneration = async () => {
    if (lastGenerationOptions) {
      await handleGeneration(lastGenerationOptions);
    }
  };

  const handleGenerationComplete = () => {
    // Clear any errors on successful completion
    setLastError(null);
    toast.success("Image generated successfully!");
  };

  const handleGenerationError = (error: string) => {
    const errorInfo = {
      message: error,
      code: "GENERATION_PROCESSING_ERROR",
    };
    setLastError(errorInfo);
    toast.error(`Generation failed: ${error}`);
    setCurrentGeneration(null);
  };

  const startNewGeneration = () => {
    setCurrentGeneration(null);
    setLastError(null); // Clear errors when starting fresh
  };

  if (!session) {
    return (
      <div className="bg-background min-h-screen">
        <Header />
        <div className="container mx-auto py-8">
          <Card>
            <CardHeader>
              <CardTitle>Sign in Required</CardTitle>
              <CardDescription>
                Please sign in to start generating AI fashion images.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => router.push("/auth/signin")}>
                <Icons.LogIn className="mr-2 h-4 w-4" />
                Sign In
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen">
      <Header />
      <div className="container mx-auto space-y-8 py-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            AI Fashion Generator
          </h1>
          <p className="text-muted-foreground">
            Transform your clothing designs with AI-powered fashion
            visualization
          </p>
        </div>

        {/* Token Balance */}
        {convexUser && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icons.Zap className="h-5 w-5 text-yellow-500" />
                  <span className="font-medium">Token Balance</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-lg font-bold">
                    {convexUser.tokenBalance} tokens
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push("/dashboard/tokens")}
                  >
                    Buy Tokens
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Generation Form */}
          <div className="space-y-6">
            {/* Error Display */}
            {lastError && (
              <Alert variant="destructive">
                <Icons.AlertCircle className="h-4 w-4" />
                <AlertTitle>
                  Generation Failed
                  {lastError.code && (
                    <span className="ml-2 text-xs font-normal opacity-75">
                      ({lastError.code})
                    </span>
                  )}
                </AlertTitle>
                <AlertDescription className="space-y-2">
                  <p>{lastError.message}</p>
                  {lastError.details && (
                    <details className="text-xs opacity-75">
                      <summary className="cursor-pointer hover:opacity-100">
                        Technical Details
                      </summary>
                      <pre className="mt-1 font-mono whitespace-pre-wrap">
                        {lastError.details}
                      </pre>
                    </details>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLastError(null)}
                    >
                      <Icons.X className="mr-1 h-3 w-3" />
                      Dismiss
                    </Button>
                    {lastGenerationOptions && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={retryGeneration}
                        disabled={isGenerating}
                      >
                        <Icons.RotateCcw className="mr-1 h-3 w-3" />
                        Retry
                      </Button>
                    )}
                    {lastError.code === "INSUFFICIENT_TOKENS" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push("/dashboard/tokens")}
                      >
                        <Icons.Zap className="mr-1 h-3 w-3" />
                        Buy Tokens
                      </Button>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Create New Generation</CardTitle>
                <CardDescription>
                  Upload your product image and customize the generation
                  settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <GenerationForm
                  onSubmit={handleGeneration}
                  isLoading={isGenerating}
                  tokenBalance={convexUser?.tokenBalance || 0}
                />
              </CardContent>
            </Card>
          </div>

          {/* Generation Status */}
          <div className="space-y-6">
            {currentGeneration ? (
              <div className="space-y-4">
                <GenerationStatusDisplay
                  generationId={currentGeneration}
                  onComplete={handleGenerationComplete}
                  onError={handleGenerationError}
                />

                <Button
                  variant="outline"
                  onClick={startNewGeneration}
                  className="w-full"
                >
                  <Icons.Plus className="mr-2 h-4 w-4" />
                  Start New Generation
                </Button>
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Getting Started</CardTitle>
                  <CardDescription>
                    Follow these steps to generate your first AI fashion image
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="bg-primary text-primary-foreground flex h-6 w-6 items-center justify-center rounded-full text-sm font-medium">
                        1
                      </div>
                      <div>
                        <h4 className="font-medium">Upload Product Image</h4>
                        <p className="text-muted-foreground text-sm">
                          Add a clear image of your clothing item
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="bg-primary text-primary-foreground flex h-6 w-6 items-center justify-center rounded-full text-sm font-medium">
                        2
                      </div>
                      <div>
                        <h4 className="font-medium">Choose Style & Settings</h4>
                        <p className="text-muted-foreground text-sm">
                          Select your preferred style and quality settings
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="bg-primary text-primary-foreground flex h-6 w-6 items-center justify-center rounded-full text-sm font-medium">
                        3
                      </div>
                      <div>
                        <h4 className="font-medium">Generate & Download</h4>
                        <p className="text-muted-foreground text-sm">
                          AI will create your fashion visualization
                        </p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <h4 className="font-medium">Tips for Best Results</h4>
                    <ul className="text-muted-foreground space-y-1 text-sm">
                      <li>• Use high-quality, well-lit product images</li>
                      <li>• Try different styles to see various looks</li>
                      <li>• Higher quality settings produce better results</li>
                      <li>• Add custom prompts for specific requirements</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
