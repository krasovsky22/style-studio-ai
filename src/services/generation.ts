import { replicateClient } from "@/lib/replicate";
import { promptEngineer } from "@/lib/prompt-engineering";
import {
  analyzeProductImage,
  validateImageForGeneration,
} from "@/lib/image-analysis";
import { ASPECT_RATIOS, QUALITY_SETTINGS } from "@/convex/constants";
import { generationSchema } from "@/lib/validations";
import { z } from "zod";
import {
  GenerationOptions,
  GenerationResult,
  GenerationRequest,
  GenerationStatus,
  QueueInfo,
} from "@/types/generation";

/**
 * Main generation orchestration service
 * Handles the complete generation workflow from input to result
 */
export class GenerationService {
  /**
   * Start a new generation process
   */
  async startGeneration(options: GenerationOptions): Promise<{
    generationId: string;
    replicateId: string;
    estimatedTime: string;
  }> {
    try {
      // Validate inputs
      await this.validateGenerationInputs(options);

      // Generate optimized prompt
      const promptResult = promptEngineer.generatePrompt(options);

      // Prepare generation request
      const request = this.prepareGenerationRequest(options, promptResult);

      // Validate the request
      replicateClient.validateRequest(request);

      // Start generation with Replicate
      const replicateResponse = await replicateClient.createPrediction(request);

      if (!replicateResponse.id) {
        throw new Error(
          "Failed to start generation: No prediction ID received"
        );
      }

      // Get estimated time for the model
      const model = replicateClient
        .getAvailableModels()
        .find((m) => m.id === options.model);
      const estimatedTime = model?.estimatedTime || "30-60 seconds";

      return {
        generationId: replicateResponse.id, // We'll use Replicate ID as our generation ID for now
        replicateId: replicateResponse.id,
        estimatedTime,
      };
    } catch (error) {
      console.error("Generation start failed:", error);
      throw new Error(`Failed to start generation: ${error}`);
    }
  }

  /**
   * Get generation status and progress
   */
  async getGenerationStatus(replicateId: string): Promise<GenerationStatus> {
    try {
      const response = await replicateClient.getPrediction(replicateId);

      // Map Replicate status to our internal status
      const status = this.mapReplicateStatus(response.status);

      // Calculate progress based on status
      const progress = this.calculateProgress(response.status);

      // Determine current stage
      const stage = this.determineStage(response.status);

      // Estimate remaining time
      const estimatedTimeRemaining = this.estimateRemainingTime(
        response.status
      );

      return {
        id: replicateId,
        status,
        progress,
        stage,
        estimatedTimeRemaining,
        error: response.error,
      };
    } catch (error) {
      console.error("Failed to get generation status:", error);
      return {
        id: replicateId,
        status: "failed",
        error: `Failed to get status: ${error}`,
      };
    }
  }

  /**
   * Poll generation until completion
   */
  async pollGeneration(
    replicateId: string,
    onUpdate?: (status: GenerationStatus) => void
  ): Promise<GenerationResult> {
    try {
      const response = await replicateClient.pollPrediction(
        replicateId,
        (replicateResponse) => {
          if (onUpdate) {
            const status = this.mapReplicateStatus(replicateResponse.status);
            const progress = this.calculateProgress(replicateResponse.status);
            const stage = this.determineStage(replicateResponse.status);

            onUpdate({
              id: replicateId,
              status,
              progress,
              stage,
              estimatedTimeRemaining: this.estimateRemainingTime(
                replicateResponse.status
              ),
            });
          }
        }
      );

      if (
        response.status === "succeeded" &&
        response.output &&
        response.output.length > 0
      ) {
        return {
          success: true,
          replicateId,
          resultImageUrl: response.output[0], // First output image
          processingTime: response.metrics?.predict_time,
        };
      } else {
        return {
          success: false,
          replicateId,
          error: response.error || "Generation failed without error message",
        };
      }
    } catch (error) {
      console.error("Generation polling failed:", error);
      return {
        success: false,
        replicateId,
        error: `Polling failed: ${error}`,
      };
    }
  }

  /**
   * Cancel a running generation
   */
  async cancelGeneration(replicateId: string): Promise<void> {
    try {
      await replicateClient.cancelPrediction(replicateId);
    } catch (error) {
      console.error("Failed to cancel generation:", error);
      throw new Error(`Failed to cancel generation: ${error}`);
    }
  }

  /**
   * Get queue information
   */
  async getQueueInfo(): Promise<QueueInfo> {
    // This is a simplified implementation
    // In a real system, you'd track your own queue
    return {
      position: 1,
      estimatedWaitTime: 30, // seconds
      activeGenerations: 1,
    };
  }

  /**
   * Validate generation inputs using comprehensive server-side validation
   */
  private async validateGenerationInputs(
    options: GenerationOptions
  ): Promise<void> {
    console.log("Validating generation inputs:", options);

    // First, validate with Zod schema for type safety and basic validation
    try {
      generationSchema.parse(options);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(
          (err: z.ZodIssue) => `${err.path.join(".")}: ${err.message}`
        );
        throw new Error(`Validation failed: ${errorMessages.join(", ")}`);
      }
      throw error;
    }

    // Validate that the AI model is available
    const availableModels = replicateClient.getAvailableModels();
    if (!availableModels.find((m) => m.id === options.model)) {
      throw new Error(`Invalid or unavailable AI model: ${options.model}`);
    }

    // Validate aspect ratio configuration exists
    if (!Object.keys(ASPECT_RATIOS).includes(options.aspectRatio)) {
      throw new Error(
        `Invalid aspect ratio configuration: ${options.aspectRatio}`
      );
    }

    // Validate quality settings configuration exists
    if (!Object.keys(QUALITY_SETTINGS).includes(options.quality)) {
      throw new Error(
        `Invalid quality setting configuration: ${options.quality}`
      );
    }

    // Validate product image through image analysis
    // try {
    const productAnalysis = await analyzeProductImage(options.productImageUrl);
    const validation = validateImageForGeneration(productAnalysis);

    if (!validation.valid) {
      throw new Error(`Invalid product image: ${validation.errors.join(", ")}`);
    }
    // } catch (error) {
    //   throw new Error(`Product image validation failed: ${error}`);
    // }

    // Validate model image if provided
    if (options.modelImageUrl && options.modelImageUrl.trim() !== "") {
      try {
        const modelAnalysis = await analyzeProductImage(options.modelImageUrl);
        const validation = validateImageForGeneration(modelAnalysis);

        if (!validation.valid) {
          throw new Error(
            `Invalid model image: ${validation.errors.join(", ")}`
          );
        }
      } catch (error) {
        throw new Error(`Model image validation failed: ${error}`);
      }
    }

    // Validate parameters if provided
    if (options.parameters) {
      const { guidance_scale, num_inference_steps, strength, seed } =
        options.parameters;

      if (
        guidance_scale !== undefined &&
        (guidance_scale < 1 || guidance_scale > 20)
      ) {
        throw new Error("Guidance scale must be between 1 and 20");
      }

      if (
        num_inference_steps !== undefined &&
        (num_inference_steps < 20 || num_inference_steps > 100)
      ) {
        throw new Error("Inference steps must be between 20 and 100");
      }

      if (strength !== undefined && (strength < 0.1 || strength > 1.0)) {
        throw new Error("Strength must be between 0.1 and 1.0");
      }

      if (seed !== undefined && (seed < 0 || seed > 2147483647)) {
        throw new Error("Seed must be a valid 32-bit positive integer");
      }
    }
  }

  /**
   * Prepare Replicate generation request
   */
  private prepareGenerationRequest(
    options: GenerationOptions,
    promptResult: { prompt: string; negativePrompt: string }
  ): GenerationRequest {
    const aspectRatioConfig =
      ASPECT_RATIOS[options.aspectRatio as keyof typeof ASPECT_RATIOS];
    const qualityConfig =
      QUALITY_SETTINGS[options.quality as keyof typeof QUALITY_SETTINGS];

    return {
      model: options.model,
      input: {
        image: options.productImageUrl,
        prompt: promptResult.prompt,
        negative_prompt: promptResult.negativePrompt,
        width: aspectRatioConfig.width,
        height: aspectRatioConfig.height,
        num_inference_steps: qualityConfig.steps,
        guidance_scale: qualityConfig.guidance,
        // Add seed for reproducibility if needed
        // seed: Math.floor(Math.random() * 1000000),
      },
    };
  }

  /**
   * Map Replicate status to our internal status
   */
  private mapReplicateStatus(
    replicateStatus: string
  ): GenerationStatus["status"] {
    switch (replicateStatus) {
      case "starting":
        return "pending";
      case "processing":
        return "processing";
      case "succeeded":
        return "completed";
      case "failed":
        return "failed";
      case "canceled":
        return "cancelled";
      default:
        return "pending";
    }
  }

  /**
   * Calculate progress percentage based on status
   */
  private calculateProgress(replicateStatus: string): number {
    switch (replicateStatus) {
      case "starting":
        return 10;
      case "processing":
        return 50;
      case "succeeded":
        return 100;
      case "failed":
      case "canceled":
        return 0;
      default:
        return 0;
    }
  }

  /**
   * Determine current processing stage
   */
  private determineStage(replicateStatus: string): GenerationStatus["stage"] {
    switch (replicateStatus) {
      case "starting":
        return "uploading";
      case "processing":
        return "generating";
      case "succeeded":
        return "finishing";
      case "failed":
      case "canceled":
        return "processing"; // Keep last known stage
      default:
        return "uploading";
    }
  }

  /**
   * Estimate remaining time based on status
   */
  private estimateRemainingTime(replicateStatus: string): number {
    switch (replicateStatus) {
      case "starting":
        return 60; // 1 minute estimate for starting
      case "processing":
        return 30; // 30 seconds estimate for processing
      case "succeeded":
      case "failed":
      case "canceled":
        return 0;
      default:
        return 60;
    }
  }

  /**
   * Retry a failed generation with the same parameters
   */
  async retryGeneration(
    originalOptions: GenerationOptions,
    maxRetries: number = 3
  ): Promise<GenerationResult> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Generation attempt ${attempt}/${maxRetries}`);

        const { replicateId } = await this.startGeneration(originalOptions);
        const result = await this.pollGeneration(replicateId);

        if (result.success) {
          return result;
        } else {
          lastError = new Error(result.error || "Generation failed");
        }

        // Wait before retry (exponential backoff)
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      } catch (error) {
        lastError = error as Error;
        console.error(`Generation attempt ${attempt} failed:`, error);

        // Wait before retry
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error("All retry attempts failed");
  }

  /**
   * Get available models with their configurations
   */
  getAvailableModels() {
    return replicateClient.getAvailableModels();
  }

  /**
   * Estimate token cost for generation
   */
  estimateTokenCost(options: GenerationOptions): number {
    const qualityMultiplier = {
      standard: 1,
      high: 2,
      ultra: 3,
    };

    const baseTokens = 1; // Base cost
    const multiplier =
      qualityMultiplier[options.quality as keyof typeof qualityMultiplier] || 1;

    return baseTokens * multiplier;
  }

  /**
   * Handle Replicate webhook events
   */
  async handleWebhook(webhookData: {
    id: string;
    status: string;
    output?: string | string[];
    error?: string;
  }): Promise<void> {
    try {
      // Process webhook and update generation status
      console.log("Processing Replicate webhook:", webhookData);

      // Normalize output to array format
      const normalizedOutput = webhookData.output
        ? Array.isArray(webhookData.output)
          ? webhookData.output
          : [webhookData.output]
        : undefined;

      // This would update the generation in Convex based on Replicate status
      // Implementation depends on webhook data structure
      console.log("Normalized output:", normalizedOutput);
    } catch (error) {
      console.error("Webhook processing failed:", error);
      throw error;
    }
  }
}

// Export singleton instance
export const generationService = new GenerationService();

// Utility functions
export function getEstimatedTime(modelId: string, quality: string): string {
  const model = replicateClient
    .getAvailableModels()
    .find((m) => m.id === modelId);
  const baseTime = model?.estimatedTime || "30-60 seconds";

  // Adjust time based on quality
  if (quality === "ultra") {
    return "60-120 seconds";
  } else if (quality === "high") {
    return "45-90 seconds";
  }

  return baseTime;
}
