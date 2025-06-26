// Generation-specific types for AI integration

import { AI_MODELS } from "@/constants/openai";
import { Id } from "@/convex/_generated/dataModel";

export interface GenerationOptions {
  productImageFiles: Id<"files">[]; // Multiple product image file references
  modelImageFiles?: Id<"files">[]; // Multiple model image file references (optional)
  style: "realistic" | "artistic" | "minimal";
  aspectRatio: "1:1" | "16:9" | "9:16" | "3:2" | "2:3";
  quality: "auto" | "high" | "medium" | "low";
  model: keyof typeof AI_MODELS; // OpenAI model IDs
  customPrompt?: string;
  parameters?: {
    guidance_scale: number;
    num_inference_steps: number;
    strength: number;
    seed?: number;
  };
}

export interface AIModelAspectRatio {
  id: GenerationOptions["aspectRatio"];
  name?: string; // Optional name for display
  description?: string; // Optional description for display
  icon?: string; // Optional icon for display
}

// AI model configuration
export interface AIModel {
  id: string;
  name: string;
  description: string;
  supportedAspectRatios?: string[];
  maxResolution?: string;
  estimatedTime?: string;
  cost: number;
  supported_features: string[];
  max_images?: number; // Maximum images the model can process
  resolution?: string; // Default resolution
  quality?: GenerationOptions["quality"]; // OpenAI quality setting
}

// Style preset configuration
export interface StylePreset {
  id: GenerationOptions["style"];
  name: string;
  description: string;
  icon: string;
}

// Quality setting configuration
export interface QualitySetting {
  id: GenerationOptions["quality"];
  name: string;
  description: string;
  cost: number;
  speed: string;
}

// Generation form data
export interface GenerationFormData {
  productImageFiles: Id<"files">[];
  modelImageFiles?: Id<"files">[];
  customPrompt?: string;
  style: GenerationOptions["style"];
  quality: GenerationOptions["quality"];
  aspectRatio: GenerationOptions["aspectRatio"];
  model: GenerationOptions["model"];
  parameters?: {
    guidance_scale: number;
    num_inference_steps: number;
    strength: number;
    seed: number;
  };
}

// Generation status for UI updates
export interface GenerationStatus {
  id: string;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  progress?: number;
  stage?: "uploading" | "generating" | "processing" | "finishing";
  estimatedTimeRemaining?: number;
  error?: string;
}
