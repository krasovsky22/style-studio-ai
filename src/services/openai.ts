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
import { AI_MODELS, OPENAI_CONFIG } from "@/constants/openai";
import { API_ERROR_CODES, APIErrorCode } from "@/constants/api-errors";
import { GenerationOptions } from "@/types/generation";

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
  quality: GenerationOptions["quality"];
  aspectRatio: string;
  customPrompt?: string;
  productImages: string[];
  modelImages?: string[];
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
 * Generate images using OpenAI DALL-E with vision analysis
 */
export async function generateImages(
  request: ImageGenerationRequest
): Promise<ImageGenerationResponse> {
  try {
    const startTime = Date.now();

    // Enhance prompt with image analysis if images are provided
    const enhancedPrompt = request.prompt;
    // if (request.productImages?.length || request.modelImages?.length) {
    //   enhancedPrompt = await analyzeAndEnhancePrompt(request);
    // }

    // Prepare DALL-E request parameters with enhanced prompt
    const dalleRequest = await prepareDalleRequest({
      ...request,
      prompt: enhancedPrompt,
    });

    console.log("dalleRequest:", dalleRequest);

    // Call OpenAI DALL-E API for image generation
    const response = await openai.images.edit(dalleRequest);

    console.log("OpenAI DALL-E response:", response);

    // Process the generated images
    const images = await processImageResponse(response);

    const processingTime = Date.now() - startTime;

    return {
      success: true,
      images,
      metadata: {
        model: request.model,
        prompt: enhancedPrompt,
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
async function prepareDalleRequest(
  request: ImageGenerationRequest
): Promise<OpenAI.Images.ImageEditParams> {
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
  // const size = mapAspectRatioToSize(request.aspectRatio, request.model);

  const images = await Promise.all(
    [...request.productImages, ...(request.modelImages ?? [])].map(
      async (url) => {
        if (!url) {
          throw new OpenAIError(
            "Invalid product image URL",
            API_ERROR_CODES.IMAGE_VALIDATION_ERROR
          );
        }
        const response = await fetch(url);
        if (!response.ok) {
          throw new OpenAIError(
            `Failed to fetch product image: ${response.statusText}`,
            API_ERROR_CODES.IMAGE_VALIDATION_ERROR
          );
        }
        const arrayBuffer = await response.arrayBuffer();
        return new File([arrayBuffer], "image.png", { type: "image/png" });
      }
    )
  );

  if (images.length === 0) {
    throw new OpenAIError(
      "At least one product image is required for image editing",
      API_ERROR_CODES.IMAGE_VALIDATION_ERROR
    );
  }

  // Build request parameters for image generation
  const dalleRequest: OpenAI.Images.ImageEditParams = {
    model: request.model,
    quality: request.quality || "auto", // Default to standard quality
    image: images, // OpenAI image edit takes a single image, not an array
    prompt: request.prompt.slice(0, OPENAI_CONFIG.maxTokens),
    // size: size as "1024x1024" | "1024x1792" | "1792x1024",
    // response_format: GENERATION_PARAMS.response_format,
    n: 1, // DALL-E 3 only supports n=1
  };

  // Add model-specific quality parameter (DALL-E 3 uses 'standard' or 'hd')
  //   if (request.quality) {
  //     dalleRequest.quality = request.quality;
  //   }

  // Add style parameter
  //   if (request.style) {
  //     if (request.style.includes("vivid")) {
  //       dalleRequest.style = "vivid";
  //     } else if (request.style.includes("natural")) {
  //       dalleRequest.style = "natural";
  //     }
  //   } else {
  //     dalleRequest.style = GENERATION_PARAMS.style;
  //   }

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

      if (imageData.b64_json) {
        try {
          // Decode base64 image data
          const binaryString = atob(imageData.b64_json);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          images.push(bytes.buffer);
        } catch (error) {
          console.error("Failed to decode base64 image:", error);
          throw new OpenAIError(
            "Failed to decode generated image",
            API_ERROR_CODES.SERVER_ERROR
          );
        }
      }
    }
  }

  return images;
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

// /**
//  * Analyzes images using GPT-4 Vision and enhances the prompt
//  */
// async function analyzeAndEnhancePrompt(
//   request: ImageGenerationRequest
// ): Promise<string> {
//   try {
//     console.log("Analyzing images with GPT-4 Vision...");

//     // Build messages for GPT-4 Vision analysis
//     const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
//       {
//         role: "system",
//         content: `You are a fashion expert analyzing images for AI image generation. Provide detailed, specific descriptions that will help generate high-quality fashion images.

// For product images: Describe the clothing items in detail - style, colors, patterns, textures, fit, and any distinctive features.
// For model images: Describe the person's appearance, pose, styling, and any context that would be relevant for fashion photography.

// Be specific about clothing details like fabric types, cuts, colors, and styling elements. Your descriptions will be used to generate new fashion images.`,
//       },
//     ];

//     // Prepare content array for the user message
//     const content: Array<
//       | { type: "text"; text: string }
//       | {
//           type: "image_url";
//           image_url: { url: string; detail?: "auto" | "low" | "high" };
//         }
//     > = [
//       {
//         type: "text",
//         text: `Analyze these images and enhance this fashion prompt: "${request.prompt}"

// ${request.productImages?.length ? "Product images to analyze for clothing details:" : ""}
// ${request.modelImages?.length ? "Model images to analyze for person and styling:" : ""}

// Provide an enhanced prompt that combines the original request with specific details from the images.`,
//       },
//     ];

//     // Add product images for analysis
//     if (request.productImages?.length) {
//       for (const imageUrl of request.productImages) {
//         content.push({
//           type: "image_url",
//           image_url: {
//             url: imageUrl,
//             detail: "high", // Use high detail for better product analysis
//           },
//         });
//       }
//     }

//     // Add model images for analysis
//     if (request.modelImages?.length) {
//       for (const imageUrl of request.modelImages) {
//         content.push({
//           type: "image_url",
//           image_url: {
//             url: imageUrl,
//             detail: "high", // Use high detail for better person analysis
//           },
//         });
//       }
//     }

//     messages.push({
//       role: "user",
//       content,
//     });

//     // Call GPT-4 Vision for image analysis
//     const analysisResponse = await openai.chat.completions.create({
//       model: "gpt-4o", // GPT-4 with vision capabilities
//       messages,
//       max_tokens: 1000,
//       temperature: 0.7,
//     });

//     const enhancedPrompt = analysisResponse.choices[0]?.message?.content;

//     if (!enhancedPrompt) {
//       console.warn("GPT-4 Vision analysis failed, using original prompt");
//       return request.prompt;
//     }

//     console.log("Image analysis completed, enhanced prompt generated");
//     return enhancedPrompt;
//   } catch (error) {
//     console.error("Failed to analyze images with GPT-4 Vision:", error);
//     console.warn("Falling back to original prompt");
//     return request.prompt;
//   }
// }
