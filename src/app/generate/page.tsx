"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Id } from "@/convex/_generated/dataModel";
import { Header } from "@/components/layout/header";
import { GenerationForm } from "@/components/generation/generation-form";
import { GenerationStatusDisplay } from "@/components/generation/generation-status";
import { ImageGallery } from "@/components/generation/image-gallery";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/ui/icons";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { GenerationOptions } from "@/types/generation";
import { toast } from "sonner";
import { useConvexAuth } from "@/hooks/use-convex-auth";
import GettingStartedCard from "@/components/generation/getting-started-card";
import { AppLayout } from "@/components/layout/app-layout";

interface ResponseErrorType {
  message?: string;
  code?: string;
  details?: string;
  validationErrors?: { field: string; message: string }[];
}

export default function GeneratePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [currentGeneration, setCurrentGeneration] =
    useState<Id<"generations"> | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultedImages, setResultedImages] = useState<string[]>([]);
  const [lastError, setLastError] = useState<ResponseErrorType | null>(null);
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
      // Step 1: Create generation record
      const createController = new AbortController();
      const createTimeoutId = setTimeout(() => createController.abort(), 30000); // 30 second timeout for creation

      const createResponse = await fetch("/api/generation/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(options),
        signal: createController.signal,
      });

      clearTimeout(createTimeoutId);

      let createResponseData;
      try {
        createResponseData = await createResponse.json();
      } catch (jsonError) {
        console.error("Failed to parse creation response as JSON:", jsonError);
        const errorInfo: ResponseErrorType = {
          message: `Server returned invalid response (${createResponse.status}: ${createResponse.statusText})`,
          code: "INVALID_RESPONSE",
          details: `Response status: ${createResponse.status}`,
        };
        setLastError(errorInfo);
        toast.error(
          "Server error during generation creation. Please try again later."
        );
        return;
      }

      // Check if creation was successful
      if (!createResponse.ok || !createResponseData.success) {
        const errorInfo: ResponseErrorType = {
          code: createResponseData.code,
          validationErrors: createResponseData.validationErrors,
        };
        console.log("Generation creation failed", errorInfo);
        setLastError(errorInfo);
        return;
      }

      const { generationId } = createResponseData.data;

      // Step 2: Set the current generation for status tracking
      setCurrentGeneration(generationId);
      toast.success("Generation record created! Starting processing...");

      // Step 3: Start processing the generation
      const processController = new AbortController();
      const processTimeoutId = setTimeout(
        () => processController.abort(),
        300000
      ); // 5 minute timeout for processing

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ generationId }),
        signal: processController.signal,
      });

      clearTimeout(processTimeoutId);

      clearTimeout(processTimeoutId);

      let responseData;
      try {
        responseData = await response.json();
      } catch (jsonError) {
        // Handle cases where the response is not valid JSON
        console.error(
          "Failed to parse processing response as JSON:",
          jsonError
        );
        const errorInfo: ResponseErrorType = {
          message: `Server returned invalid response (${response.status}: ${response.statusText})`,
          code: "INVALID_RESPONSE",
          details: `Response status: ${response.status}`,
        };
        setLastError(errorInfo);
        toast.error("Server error during processing. Please try again later.");
        return;
      }

      // Check if the API response indicates an error
      if (!response.ok || !responseData.success) {
        const errorInfo: ResponseErrorType = {
          code: responseData.code,
          validationErrors: responseData.validationErrors,
        };

        console.log("Generation processing failed", errorInfo);
        setLastError(errorInfo);
        return;
      }

      const { resultImages } = responseData.data;
      // Success case - generation is now processing
      setResultedImages(resultImages || []);
      setLastError(null); // Clear any previous errors on success
      toast.success(
        "Generation processing started! Watch for real-time updates."
      );
    } catch (error) {
      console.error("Generation failed:", error);

      // Handle specific error types
      let errorInfo;
      let userMessage;

      if (error instanceof Error && error.name === "AbortError") {
        errorInfo = {
          message: "Request timed out",
          code: "TIMEOUT_ERROR",
        };
        userMessage = "Request timed out. Please try again.";
      } else if (
        error instanceof TypeError &&
        error.message.includes("fetch")
      ) {
        errorInfo = {
          message: "Network connection failed",
          code: "NETWORK_ERROR",
          details: error.message,
        };
        userMessage =
          "Network error. Please check your connection and try again.";
      } else if (error instanceof SyntaxError) {
        errorInfo = {
          message: "Server response format error",
          code: "RESPONSE_FORMAT_ERROR",
          details: error.message,
        };
        userMessage = "Server response error. Please try again.";
      } else {
        errorInfo = {
          message:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred",
          code: "UNKNOWN_ERROR",
          details: error instanceof Error ? error.stack : undefined,
        };
        userMessage =
          error instanceof Error
            ? error.message
            : "An unexpected error occurred";
      }

      setLastError(errorInfo);
      toast.error(userMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const retryGeneration = async () => {
    if (lastGenerationOptions) {
      try {
        await handleGeneration(lastGenerationOptions);
      } catch (error) {
        console.error("Retry failed:", error);
        toast.error("Retry failed. Please try again.");
      }
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
    setResultedImages([]); // Clear previous results
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
    <AppLayout showSidebar>
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
                  {lastError.validationErrors?.map((error) => (
                    <p
                      className="mt-1 font-mono whitespace-pre-wrap"
                      key={error.field}
                    >
                      {error.message}
                    </p>
                  ))}
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
                    {(lastError.code === "NETWORK_ERROR" ||
                      lastError.code === "TIMEOUT_ERROR" ||
                      lastError.code === "INVALID_RESPONSE") && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.location.reload()}
                      >
                        <Icons.RotateCcw className="mr-1 h-3 w-3" />
                        Refresh Page
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
            {/* Immediate Results Display */}
            {resultedImages.length > 0 && !currentGeneration && (
              <Card>
                <CardHeader>
                  <CardTitle>Quick Preview</CardTitle>
                  <CardDescription>
                    Images generated from your last request
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ImageGallery
                    images={resultedImages}
                    aspectRatio="square"
                    showActions={true}
                    maxColumns={2}
                  />
                </CardContent>
              </Card>
            )}

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
              <GettingStartedCard />
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
