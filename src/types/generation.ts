// Generation-specific types for AI integration

export interface OpenAIConfig {
  apiKey: string;
  baseURL?: string;
  timeoutMs: number;
  retryAttempts: number;
}

export interface GenerationRequest {
  productImages: string[]; // Multiple product images
  modelImages?: string[]; // Multiple model images (optional)
  prompt: string;
  style: "natural" | "vivid";
  size: "1024x1024" | "1792x1024" | "1024x1792";
  quality: "standard" | "hd";
  n?: number;
}

export interface GenerationResponse {
  id: string;
  created: number;
  data: Array<{
    url?: string;
    b64_json?: string;
    revised_prompt?: string;
  }>;
}

export interface GenerationOptions {
  productImages: string[]; // Multiple product images
  modelImages?: string[]; // Multiple model images (optional)
  style: "realistic" | "artistic" | "minimal";
  aspectRatio: "1:1" | "16:9" | "9:16" | "3:2" | "2:3";
  quality: "standard" | "high" | "ultra";
  model: "gpt-4.1-dalle-3"; // OpenAI model
  customPrompt?: string;
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
  replicateModel?: string; // Made optional for OpenAI models
  cost: number;
  supported_features: string[];
  max_images?: number; // Maximum images the model can process
  resolution?: string; // Default resolution
  quality?: "standard" | "hd"; // OpenAI quality setting
}

// Style preset configuration
export interface StylePreset {
  id: "realistic" | "artistic" | "minimal";
  name: string;
  description: string;
  icon: string;
}

// Quality setting configuration
export interface QualitySetting {
  id: "standard" | "high" | "ultra";
  name: string;
  description: string;
  cost: number;
  speed: string;
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

// Combined generation input that includes both options and prompt result
export interface GenerationInput {
  options: GenerationOptions;
  promptResult: PromptResult;
}

// Simplified generation request for the API route
export interface GenerationApiRequest {
  productImageUrl: string;
  modelImageUrl?: string;
  style: GenerationOptions["style"];
  aspectRatio: GenerationOptions["aspectRatio"];
  quality: GenerationOptions["quality"];
  model: GenerationOptions["model"];
  customPrompt?: string;
  parameters?: GenerationOptions["parameters"];
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

// API response type for generation endpoints
export interface GenerationApiResponse {
  generationId: string;
  replicateId: string;
  estimatedTime: string;
  prompt: string;
  status?: "pending" | "processing" | "completed" | "failed" | "cancelled";
}
