// OpenAI model configurations and constants

import { AIModel } from "@/types/generation";

// Available OpenAI models for image generation
export const AI_MODELS: Record<string, AIModel> = {
  "dall-e-3-standard": {
    id: "dall-e-3-standard",
    name: "DALL-E 3 Standard",
    description: "High-quality image generation with standard resolution",
    cost: 3,
    supported_features: [
      "text-to-image",
      "style-transfer",
      "product-visualization",
    ],
    max_images: 1,
    resolution: "1024x1024",
    quality: "standard",
  },
  "dall-e-3-hd": {
    id: "dall-e-3-hd",
    name: "DALL-E 3 HD",
    description: "Ultra high-quality image generation with enhanced detail",
    cost: 5,
    supported_features: [
      "text-to-image",
      "style-transfer",
      "product-visualization",
      "high-resolution",
    ],
    max_images: 1,
    resolution: "1792x1024",
    quality: "hd",
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
    quality: "hd",
  },
} as const;

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
