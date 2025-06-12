import { AIModel } from "@/types/generation";

// AI models available for generation
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

export const DEFAULT_AI_MODEL: keyof typeof AI_MODELS = "stable-diffusion-3";
