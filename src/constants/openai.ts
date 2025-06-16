// OpenAI model configurations and constants

import {
  AIModel,
  AIModelAspectRatio,
  GenerationOptions,
} from "@/types/generation";

// Available OpenAI models for image generation
export const AI_MODELS: Record<string, AIModel> = {
  "gpt-image-1": {
    id: "gpt-image-1",
    name: "GPT Image 1",
    description: "High-quality image generation with standard resolution",
    cost: 3,
    supported_features: [
      "text-to-image",
      "style-transfer",
      "product-visualization",
    ],
    max_images: 1,
    resolution: "1024x1024",
    // quality: "standard",
  },
  "gpt-4-vision-enhanced": {
    id: "gpt-4-vision-enhanced",
    name: "GPT-4 Vision + DALL-E 3",
    description:
      "Combined vision analysis and image generation for optimal results",
    cost: 7,
    supported_features: [
      "image-analysis",
      "text-to-image",
      "style-transfer",
      "product-visualization",
      "multi-step-generation",
    ],
    max_images: 3,
    resolution: "1792x1024",
    // quality: "hd",
  },
} as const;

export const AI_MODELS_ASPECT_RATIOS: Record<
  GenerationOptions["aspectRatio"],
  AIModelAspectRatio
> = {
  "1:1": { id: "1:1" },
  "16:9": { id: "16:9" },
  "9:16": { id: "9:16" },
  "3:2": { id: "3:2" },
  "2:3": { id: "2:3" },
};

// Default model selection
export const DEFAULT_MODEL = Object.values(AI_MODELS)[0];

// OpenAI API configuration
export const OPENAI_CONFIG = {
  apiVersion: "v1",
  maxTokens: 4000,
  temperature: 0.7,
  imageFormats: ["png", "webp"] as const,
  maxImageSize: 20 * 1024 * 1024, // 20MB
  supportedSizes: ["1024x1024", "1792x1024", "1024x1792"] as const,
} as const;

// Generation parameters for OpenAI
export const GENERATION_PARAMS = {
  style: "vivid" as const,
  quality: "standard" as "standard" | "hd",
  response_format: "url" as const,
  size: "1024x1024" as const,
};
