// src/services/openai.ts
/**
 * OpenAI Image Generation Service
 *
 * This service provides a clean interface for interacting with OpenAI's DALL-E API
 * for image generation. It handles:
 *
 * - Image generation using DALL-E models
 * - Request parameter validation and preparation
 * - Image response processing and downloading
 * - Model configuration and feature validation
 * - Cost calculation and processing time estimation
 *
 * Features:
 * - Type-safe interfaces based on OpenAI SDK
 * - Configurable model selection (DALL-E 3 standard/HD)
 * - Aspect ratio mapping to supported sizes
 * - Error handling with custom error types
 * - Processing time and cost estimation utilities
 *
 * Usage:
 * ```typescript
 * import { generateImages } from '@/services/openai';
 *
 * const response = await generateImages({
 *   prompt: "A beautiful landscape",
 *   model: "dall-e-3-standard",
 *   aspectRatio: "16:9"
 * });
 * ```
 */

import OpenAI from "openai";
import {
  AI_MODELS,
  OPENAI_CONFIG,
  GENERATION_PARAMS,
} from "@/constants/openai";
import { API_ERROR_CODES, APIErrorCode } from "@/constants/api-errors";

// Custom Error Class for OpenAI operations
class OpenAIError extends Error {
  constructor(
    message: string,
    public code: APIErrorCode,
    public statusCode?: number,
    public details?: string
  ) {
    super(message);
    this.name = API_ERROR_CODES.OPENAI_ERROR;
  }
}

// DALL-E Configuration using existing constants
const DALLE_CONFIG = {
  models: AI_MODELS,
  defaultTimeout: 60000, // 1 minute
  maxRetries: 3,
  supportedSizes: OPENAI_CONFIG.supportedSizes,
  maxImageSize: OPENAI_CONFIG.maxImageSize,
  imageFormats: OPENAI_CONFIG.imageFormats,
} as const;

// Initialize OpenAI client with proper configuration
const openai = new OpenAI({
  apiKey: process.env.OPEN_AI_SECRET!,
  timeout: DALLE_CONFIG.defaultTimeout,
  maxRetries: DALLE_CONFIG.maxRetries,
});

/**
 * Request body type for image generation
 */
export interface ImageGenerationRequest {
  prompt: string;
  model: string;
  style?: string;
  quality?: string;
  aspectRatio: string;
  customPrompt?: string;
  parameters?: Record<string, unknown>;
}

/**
 * Image generation response
 */
export interface ImageGenerationResponse {
  success: boolean;
  images: ArrayBuffer[];
  error?: string;
  metadata?: {
    model: string;
    prompt: string;
    requestId?: string;
    processingTime?: number;
  };
}

/**
 * Generate images using OpenAI DALL-E
 */
export async function generateImages(
  request: ImageGenerationRequest
): Promise<ImageGenerationResponse> {
  try {
    const startTime = Date.now();

    // Prepare DALL-E request parameters
    const dalleRequest = prepareDalleRequest(request);

    // Call OpenAI DALL-E API
    const response = await openai.images.generate(dalleRequest);

    // Process the generated images
    const images = await processImageResponse(response);

    const processingTime = Date.now() - startTime;

    return {
      success: true,
      images,
      metadata: {
        model: request.model,
        prompt: request.prompt,
        processingTime,
      },
    };
  } catch (error) {
    console.error("OpenAI DALL-E generation failed:", error);

    return {
      success: false,
      images: [],
      error: error instanceof Error ? error.message : "Unknown error occurred",
      metadata: {
        model: request.model,
        prompt: request.prompt,
      },
    };
  }
}

/**
 * Prepares DALL-E request parameters from image generation request
 */
function prepareDalleRequest(
  request: ImageGenerationRequest
): OpenAI.Images.ImageGenerateParams {
  // Get model configuration from existing constants
  const modelConfig =
    DALLE_CONFIG.models[request.model as keyof typeof DALLE_CONFIG.models];

  if (!modelConfig) {
    throw new OpenAIError(
      `Unsupported model: ${request.model}`,
      API_ERROR_CODES.MODEL_ERROR
    );
  }

  // Validate and prepare size parameter
  const size = mapAspectRatioToSize(request.aspectRatio, request.model);
  if (
    !DALLE_CONFIG.supportedSizes.includes(
      size as (typeof DALLE_CONFIG.supportedSizes)[number]
    )
  ) {
    throw new OpenAIError(
      `Unsupported size ${size} for model ${request.model}`,
      API_ERROR_CODES.MODEL_ERROR
    );
  }

  // Build request parameters
  const dalleRequest: OpenAI.Images.ImageGenerateParams = {
    model: getOpenAIModelName(request.model),
    prompt: request.prompt.slice(0, OPENAI_CONFIG.maxTokens),
    size: size as "1024x1024" | "1024x1792" | "1792x1024",
    response_format: GENERATION_PARAMS.response_format,
    n: 1, // DALL-E 3 only supports n=1
  };

  // Add model-specific quality parameter
  if (modelConfig.quality) {
    dalleRequest.quality = modelConfig.quality as "standard" | "hd";
  }

  // Add style parameter
  if (request.style) {
    if (request.style.includes("vivid")) {
      dalleRequest.style = "vivid";
    } else if (request.style.includes("natural")) {
      dalleRequest.style = "natural";
    }
  } else {
    dalleRequest.style = GENERATION_PARAMS.style;
  }

  return dalleRequest;
}

/**
 * Processes OpenAI DALL-E response and downloads images
 */
async function processImageResponse(
  response: OpenAI.Images.ImagesResponse
): Promise<ArrayBuffer[]> {
  const images: ArrayBuffer[] = [];

  if (response.data && response.data.length > 0) {
    for (const imageData of response.data) {
      if (imageData.url) {
        try {
          // Download image from OpenAI URL
          const imageResponse = await fetch(imageData.url);
          if (!imageResponse.ok) {
            throw new Error(
              `Failed to download image: ${imageResponse.statusText}`
            );
          }

          const imageBuffer = await imageResponse.arrayBuffer();
          images.push(imageBuffer);
        } catch (error) {
          console.error("Failed to download image:", error);
          throw new OpenAIError(
            "Failed to download generated image",
            API_ERROR_CODES.SERVER_ERROR
          );
        }
      }
    }
  }

  return images;
}

/**
 * Maps our model IDs to OpenAI model names
 */
function getOpenAIModelName(modelId: string): string {
  const modelMapping: Record<string, string> = {
    "dall-e-3-standard": "dall-e-3",
    "dall-e-3-hd": "dall-e-3",
    "gpt-4-vision-enhanced": "dall-e-3", // Uses DALL-E-3 for generation
  };

  return modelMapping[modelId] || "dall-e-3";
}

/**
 * Maps aspect ratios to DALL-E supported sizes
 */
function mapAspectRatioToSize(aspectRatio: string, model: string): string {
  // Use the supported sizes from existing constants
  const supportedSizes = DALLE_CONFIG.supportedSizes;

  const sizeMap: Record<string, Record<string, string>> = {
    "dall-e-3-standard": {
      "1:1": "1024x1024",
      "9:16": "1024x1792", // Portrait
      "16:9": "1792x1024", // Landscape
    },
    "dall-e-3-hd": {
      "1:1": "1024x1024",
      "9:16": "1024x1792", // Portrait
      "16:9": "1792x1024", // Landscape
    },
    "gpt-4-vision-enhanced": {
      "1:1": "1024x1024",
      "9:16": "1024x1792", // Portrait
      "16:9": "1792x1024", // Landscape
    },
  };

  const modelSizes = sizeMap[model];
  if (!modelSizes || !modelSizes[aspectRatio]) {
    // Default to the first supported size
    return supportedSizes[0];
  }

  const selectedSize = modelSizes[aspectRatio];

  // Validate that the size is supported
  if (
    !supportedSizes.includes(selectedSize as (typeof supportedSizes)[number])
  ) {
    return supportedSizes[0];
  }

  return selectedSize;
}

/**
 * Calculates estimated processing time based on quality setting
 */
export function getEstimatedTime(quality: string): number {
  const estimationMap: Record<string, number> = {
    standard: 15, // 15 seconds
    high: 25, // 25 seconds
    ultra: 35, // 35 seconds
  };
  return estimationMap[quality] || 20; // Default to 20 seconds
}

/**
 * Calculates token cost based on model and quality
 */
export function calculateTokenCost(modelId: string, quality: string): number {
  const modelConfig = AI_MODELS[modelId];
  if (!modelConfig) {
    return 3; // Default cost
  }

  let baseCost = modelConfig.cost;

  // Quality multipliers
  if (quality === "high") {
    baseCost *= 1.5;
  } else if (quality === "ultra") {
    baseCost *= 2;
  }

  return Math.ceil(baseCost);
}

/**
 * Validates if a model supports the requested features
 */
export function validateModelFeatures(
  modelId: string,
  requiredFeatures: string[]
): boolean {
  const modelConfig = AI_MODELS[modelId];
  if (!modelConfig) {
    return false;
  }

  return requiredFeatures.every((feature) =>
    modelConfig.supported_features.includes(feature)
  );
}

/**
 * Gets available models for a specific feature
 */
export function getModelsForFeature(
  feature: string
): (typeof AI_MODELS)[string][] {
  return Object.values(AI_MODELS).filter((model) =>
    model.supported_features.includes(feature)
  );
}
