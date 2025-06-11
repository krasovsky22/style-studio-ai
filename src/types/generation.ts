// Generation-specific types for AI integration

export interface ReplicateConfig {
  apiToken: string;
  defaultModel: string;
  timeoutMs: number;
  retryAttempts: number;
}

export interface GenerationRequest {
  model: string;
  input: {
    image: string;
    prompt: string;
    negative_prompt?: string;
    num_inference_steps?: number;
    guidance_scale?: number;
    width?: number;
    height?: number;
    seed?: number;
  };
}

export interface GenerationResponse {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output?: string[];
  error?: string;
  metrics?: {
    predict_time?: number;
  };
}

export interface GenerationOptions {
  productImageUrl: string;
  modelImageUrl?: string;
  style:
    | "casual"
    | "formal"
    | "streetwear"
    | "athletic"
    | "vintage"
    | "minimalist";
  aspectRatio: "1:1" | "3:4" | "4:3" | "16:9";
  quality: "draft" | "standard" | "high" | "ultra";
  model: "stable-diffusion-xl" | "stable-diffusion-3" | "flux-dev";
  prompt?: string;
  parameters?: {
    guidance_scale: number;
    num_inference_steps: number;
    strength: number;
    seed?: number;
  };
}

export interface GenerationResult {
  success: boolean;
  replicateId?: string;
  resultImageUrl?: string;
  processingTime?: number;
  error?: string;
}

// AI model configuration
export interface AIModel {
  id: string;
  name: string;
  description: string;
  supportedAspectRatios?: string[];
  maxResolution?: string;
  estimatedTime?: string;
  replicateModel: string; // Made required since we need it for API calls
  cost: number;
  supported_features: string[];
}

// Style preset configuration
export interface StylePreset {
  id: string;
  name: string;
  description: string;
  prompt?: string;
  negativePrompt?: string;
  preview?: string;
  icon?: string;
}

// Quality setting configuration
export interface QualitySetting {
  id: string;
  name: string;
  description: string;
  steps?: number;
  guidance?: number;
  tokensRequired?: number;
  cost: number;
  speed: "Fast" | "Medium" | "Slow" | "Very Slow";
}

// Generation form data
export interface GenerationFormData {
  productImage: string;
  modelImage?: string;
  model: string;
  style: string;
  aspectRatio: string;
  quality: string;
  customPrompt?: string;
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

// Queue position information
export interface QueueInfo {
  position: number;
  estimatedWaitTime: number;
  activeGenerations: number;
}

// Prompt engineering result
export interface PromptResult {
  prompt: string;
  negativePrompt: string;
  enhancedPrompt: string;
  detectedElements: string[];
}

// Generation entity type (matches Convex schema)
export interface Generation {
  _id: string;
  _creationTime: number;
  userId: string;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  productImageUrl: string;
  modelImageUrl?: string;
  resultImageUrl?: string;
  prompt: string;
  style: string;
  quality: string;
  aspectRatio: string;
  model: string;
  parameters: {
    guidance_scale: number;
    num_inference_steps: number;
    strength: number;
    seed?: number;
  };
  tokensUsed: number;
  processingTime?: number;
  completedAt?: number;
  error?: string;
  retryCount: number;
  replicateId?: string;
}

// Replicate webhook event structure
export interface ReplicateWebhookEvent {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output?: string | string[];
  error?: string;
  metrics?: {
    predict_time?: number;
  };
}
