// Generation-specific types for AI integration

import { AI_MODELS } from "@/constants/openai";

export interface GenerationOptions {
  productImages: string[]; // Multiple product images
  modelImages?: string[]; // Multiple model images (optional)
  style: "realistic" | "artistic" | "minimal";
  aspectRatio: "1:1" | "16:9" | "9:16" | "3:2" | "2:3";
  quality: "standard" | "high" | "ultra";
  model: keyof typeof AI_MODELS; // OpenAI model IDs
  customPrompt?: string;
  parameters?: {
    guidance_scale: number;
    num_inference_steps: number;
    strength: number;
    seed?: number;
  };
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
  quality?: "standard" | "hd"; // OpenAI quality setting
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
  productImages: string[];
  modelImages?: string[];
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
