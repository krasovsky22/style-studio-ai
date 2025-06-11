// Type system validation and testing utilities
import {
  GenerationOptions,
  PromptResult,
  GenerationApiRequest,
  GenerationApiResponse,
} from "@/types/generation";

/**
 * Example generation options for testing
 */
export const exampleGenerationOptions: GenerationOptions = {
  productImageUrl: "https://example.com/product.jpg",
  modelImageUrl: "https://example.com/model.jpg",
  style: "casual",
  aspectRatio: "1:1",
  quality: "standard",
  model: "stable-diffusion-xl",
  customPrompt: "Add professional lighting",
  parameters: {
    guidance_scale: 7.5,
    num_inference_steps: 50,
    strength: 0.8,
    seed: 12345,
  },
};

/**
 * Example API request for testing
 */
export const exampleApiRequest: GenerationApiRequest = {
  productImageUrl: "https://example.com/product.jpg",
  modelImageUrl: "https://example.com/model.jpg",
  style: "formal",
  aspectRatio: "3:4",
  quality: "high",
  model: "stable-diffusion-3",
  customPrompt: "Professional studio lighting",
  parameters: {
    guidance_scale: 8.0,
    num_inference_steps: 75,
    strength: 0.75,
  },
};

/**
 * Example prompt result for testing
 */
export const examplePromptResult: PromptResult = {
  prompt:
    "A stylish formal business suit elegantly worn by a professional model, professional, elegant, business attire, sharp, polished, sophisticated, professional studio, dramatic lighting, corporate photography, professional fashion photography, professional lighting, sharp focus, high detail",
  negativePrompt:
    "low quality, blurry, amateur, casual, messy, wrinkled, informal, relaxed",
  enhancedPrompt:
    "A stylish formal business suit elegantly worn by a professional model, professional, elegant, business attire, sharp, polished, sophisticated, professional studio, dramatic lighting, corporate photography, professional fashion photography, professional lighting, sharp focus, high detail, Professional studio lighting, classic photo proportions",
  detectedElements: ["product_type:shirt", "color:black"],
};

/**
 * Example API response for testing
 */
export const exampleApiResponse: GenerationApiResponse = {
  generationId: "gen_123456789",
  replicateId: "rep_987654321",
  estimatedTime: "45-90 seconds",
  prompt: examplePromptResult.prompt,
  status: "pending",
};

/**
 * Type validation function to ensure compatibility
 */
export function validateTypeCompatibility() {
  // Test that GenerationOptions can be used with the workflow
  const options: GenerationOptions = exampleGenerationOptions;

  // Test that API request matches expected structure
  const apiRequest: GenerationApiRequest = exampleApiRequest;

  // Test that prompt result has correct structure
  const promptResult: PromptResult = examplePromptResult;

  // Test that API response has correct structure
  const apiResponse: GenerationApiResponse = exampleApiResponse;

  console.log("✅ All types are compatible");

  return {
    options,
    apiRequest,
    promptResult,
    apiResponse,
  };
}

/**
 * Convert API request to GenerationOptions (utility function)
 */
export function convertApiRequestToOptions(
  apiRequest: GenerationApiRequest
): GenerationOptions {
  return {
    productImageUrl: apiRequest.productImageUrl,
    modelImageUrl: apiRequest.modelImageUrl,
    style: apiRequest.style,
    aspectRatio: apiRequest.aspectRatio,
    quality: apiRequest.quality,
    model: apiRequest.model,
    customPrompt: apiRequest.customPrompt,
    parameters: apiRequest.parameters,
  };
}

/**
 * Usage examples for documentation
 */
export const usageExamples = {
  // Basic usage in API route
  apiRoute: `
    import { generationWorkflow } from "@/services/generation-workflow";
    import { GenerationOptions } from "@/types/generation";
    
    const options: GenerationOptions = validatedRequestData;
    const result = await generationWorkflow.startGeneration(options);
  `,

  // Using prompt engineering only
  promptOnly: `
    import { generationWorkflow } from "@/services/generation-workflow";
    
    const promptResult = generationWorkflow.generatePrompt(options);
    console.log("Generated prompt:", promptResult.prompt);
  `,

  // Monitoring generation status
  monitoring: `
    import { generationWorkflow } from "@/services/generation-workflow";
    
    const status = await generationWorkflow.getStatus(replicateId);
    console.log("Generation progress:", status.progress);
  `,
};
