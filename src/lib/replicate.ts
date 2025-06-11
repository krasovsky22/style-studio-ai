import Replicate from "replicate";
import {
  ReplicateConfig,
  GenerationRequest,
  GenerationResponse,
  AIModel,
} from "@/types/generation";

// Default configuration
const DEFAULT_CONFIG: ReplicateConfig = {
  apiToken: process.env.REPLICATE_API_TOKEN || "",
  defaultModel: "stable-diffusion-xl",
  timeoutMs: 5 * 60 * 1000, // 5 minutes
  retryAttempts: 3,
};

// Supported AI models configuration
export const AI_MODELS: Record<string, AIModel> = {
  "stable-diffusion-xl": {
    id: "stable-diffusion-xl",
    name: "Stable Diffusion XL",
    description: "High-quality image generation with excellent detail",
    supportedAspectRatios: ["1:1", "16:9", "9:16", "3:2", "2:3"],
    maxResolution: "1024x1024",
    estimatedTime: "30-60 seconds",
    replicateModel:
      "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
    cost: 1,
    supported_features: ["text-to-image", "image-to-image"],
  },
  "stable-diffusion-3": {
    id: "stable-diffusion-3",
    name: "Stable Diffusion 3",
    description: "Latest model with improved prompt adherence",
    supportedAspectRatios: ["1:1", "16:9", "9:16", "3:2", "2:3", "4:3", "3:4"],
    maxResolution: "1344x768",
    estimatedTime: "45-90 seconds",
    replicateModel: "stability-ai/stable-diffusion-3",
    cost: 2,
    supported_features: ["text-to-image", "image-to-image"],
  },
  "flux-dev": {
    id: "flux-dev",
    name: "Flux Dev",
    description: "Fast generation with good quality",
    supportedAspectRatios: ["1:1", "16:9", "9:16"],
    maxResolution: "1024x1024",
    estimatedTime: "15-30 seconds",
    replicateModel: "black-forest-labs/flux-dev",
    cost: 1,
    supported_features: ["text-to-image"],
  },
};

class ReplicateClient {
  private client: Replicate;
  private config: ReplicateConfig;

  constructor(config: Partial<ReplicateConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    if (!this.config.apiToken) {
      throw new Error("Replicate API token is required");
    }

    this.client = new Replicate({
      auth: this.config.apiToken,
    });
  }

  /**
   * Create a new prediction (generation)
   */
  async createPrediction(
    request: GenerationRequest
  ): Promise<GenerationResponse> {
    try {
      const model = AI_MODELS[request.model];
      if (!model) {
        throw new Error(`Unsupported model: ${request.model}`);
      }

      const prediction = await this.client.predictions.create({
        model: model.replicateModel,
        input: request.input,
      });

      return {
        id: prediction.id,
        status: this.mapStatus(prediction.status),
        output: prediction.output as string[],
        error: prediction.error?.toString(),
        metrics: prediction.metrics,
      };
    } catch (error) {
      console.error("Failed to create prediction:", error);
      throw new Error(`Prediction creation failed: ${error}`);
    }
  }

  /**
   * Get prediction status and results
   */
  async getPrediction(id: string): Promise<GenerationResponse> {
    try {
      const prediction = await this.client.predictions.get(id);

      return {
        id: prediction.id,
        status: this.mapStatus(prediction.status),
        output: prediction.output as string[],
        error: prediction.error?.toString(),
        metrics: prediction.metrics,
      };
    } catch (error) {
      console.error("Failed to get prediction:", error);
      throw new Error(`Failed to get prediction: ${error}`);
    }
  }

  /**
   * Cancel a running prediction
   */
  async cancelPrediction(id: string): Promise<void> {
    try {
      await this.client.predictions.cancel(id);
    } catch (error) {
      console.error("Failed to cancel prediction:", error);
      throw new Error(`Failed to cancel prediction: ${error}`);
    }
  }

  /**
   * Poll prediction until completion
   */
  async pollPrediction(
    id: string,
    onUpdate?: (response: GenerationResponse) => void
  ): Promise<GenerationResponse> {
    const startTime = Date.now();
    let attempts = 0;

    while (Date.now() - startTime < this.config.timeoutMs) {
      try {
        const response = await this.getPrediction(id);

        if (onUpdate) {
          onUpdate(response);
        }

        if (response.status === "succeeded" || response.status === "failed") {
          return response;
        }

        // Wait before next poll (exponential backoff)
        const delay = Math.min(1000 * Math.pow(1.5, attempts), 10000);
        await new Promise((resolve) => setTimeout(resolve, delay));
        attempts++;
      } catch (error) {
        console.error("Polling error:", error);

        if (attempts >= this.config.retryAttempts) {
          throw error;
        }

        // Exponential backoff for retries
        const delay = 1000 * Math.pow(2, attempts);
        await new Promise((resolve) => setTimeout(resolve, delay));
        attempts++;
      }
    }

    throw new Error("Prediction timed out");
  }

  /**
   * Get list of available models
   */
  getAvailableModels(): AIModel[] {
    return Object.values(AI_MODELS);
  }

  /**
   * Map Replicate status to our internal status
   */
  private mapStatus(replicateStatus: string): GenerationResponse["status"] {
    switch (replicateStatus) {
      case "starting":
        return "starting";
      case "processing":
        return "processing";
      case "succeeded":
        return "succeeded";
      case "failed":
        return "failed";
      case "canceled":
        return "canceled";
      default:
        return "processing";
    }
  }

  /**
   * Validate model and aspect ratio compatibility
   */
  validateRequest(request: GenerationRequest): void {
    const model = AI_MODELS[request.model];
    if (!model) {
      throw new Error(`Unsupported model: ${request.model}`);
    }

    // if (request.input.width && request.input.height) {
    //   const aspectRatio = `${request.input.width}:${request.input.height}`;

    //   console.log(
    //     `Validating aspect ratio ${JSON.stringify(request, "", 2)} for model ${JSON.stringify(model, "", 2)}`
    //   );
    //   if (!model.supportedAspectRatios?.includes(aspectRatio)) {
    //     throw new Error(
    //       `Aspect ratio ${aspectRatio} not supported by ${model.name}`
    //     );
    //   }
    // }
  }
}

// Export singleton instance
export const replicateClient = new ReplicateClient();

// Export class for testing or custom configurations
export { ReplicateClient };

// Utility functions
export function getModelById(modelId: string): AIModel | undefined {
  return AI_MODELS[modelId];
}

export function getSupportedModels(): AIModel[] {
  return Object.values(AI_MODELS);
}

export function isModelSupported(modelId: string): boolean {
  return modelId in AI_MODELS;
}
