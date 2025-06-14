// src/services/image-generation.ts
/**
 * Centralized Image Generation Service
 *
 * This service orchestrates the complete image generation workflow by coordinating
 * between OpenAI DALL-E, Cloudinary storage, and Convex database.
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { generateImages, calculateTokenCost } from "./openai";
import { API_ERROR_CODES, APIErrorCode } from "@/constants/api-errors";
import { GenerationFormData } from "@/types/generation";
import { userTokenHandler } from "./user-token-handler";
import {
  MODEL_DESCRIPTIONS,
  QUALITY_MODIFIERS,
  STYLE_VARIATIONS,
} from "@/constants/prompts";

// Custom Error Class
export class ImageGenerationError extends Error {
  constructor(
    message: string,
    public code: APIErrorCode,
    public statusCode?: number,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = API_ERROR_CODES.IMAGE_GENERATION_ERROR;
  }
}

/**
 * Main Image Generation Service Class
 */
export class ImageGenerationService {
  private convex: ConvexHttpClient;

  constructor() {
    this.convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  }

  async processImageGeneration(
    validatedData: GenerationFormData,
    userId: Id<"users">
  ) {
    // Step 5: Calculate Token Cost
    const tokenCost = calculateTokenCost(
      validatedData.model,
      validatedData.quality
    );

    // Step 6: User and Token Balance Validation using Token Service
    await userTokenHandler.validateUserTokens(userId, tokenCost);

    // Step 8: Generate Optimized Prompt
    const optimizedPrompt = await this.generatePrompt(validatedData);

    // Step 9: Create Generation Record
    const generationId = await this.createGenerationRecord(
      userId,
      validatedData,
      optimizedPrompt,
      tokenCost
    );

    const response = await generateImages({
      ...validatedData,
      prompt: optimizedPrompt,
    });

    console.log("Generated images response:", response);

    return generationId;

    // Step 10: Deduct Tokens using Token Service
    // const newBallance = await userTokenHandler.deductTokens(
    //   userId,
    //   tokenCost,
    //   generationId
    // );

    // Step 11: Initiate OpenAI Generation (asynchronously)
    // Don't await this - let it run in background
    // initiateOpenAIGeneration(
    //   generation.generationId,
    //   optimizedPrompt,
    //   validatedData
    // ).catch((error: unknown) => {
    //   console.error("Background generation failed:", error);
    //   // Refund tokens on failure
    //   userTokenHandler
    //     .refundTokens(
    //       session.user.id,
    //       tokenCost,
    //       "Generation failed - refund",
    //       generation.generationId
    //     )
    //     .catch((refundError: unknown) => {
    //       console.error("Failed to refund tokens:", refundError);
    //     });
    // });
  }

  // Prompt Generation
  private async generatePrompt(data: GenerationFormData): Promise<string> {
    const { style, quality } = data;

    let prompt = `A stylish clothes elegantly worn by a ${MODEL_DESCRIPTIONS[style]}, ${STYLE_VARIATIONS[style].modifiers}, ${STYLE_VARIATIONS[style].setting}, professional fashion photography, ${QUALITY_MODIFIERS[quality]}`;

    if (data.customPrompt) {
      prompt += `, ${data.customPrompt}`;
    }

    // Add quality modifiers
    if (data.quality === "high") {
      prompt += ", high resolution, detailed";
    } else if (data.quality === "ultra") {
      prompt +=
        ", ultra high resolution, extremely detailed, professional studio lighting";
    }

    return prompt;
  }

  /**
   * Creates generation record in Convex
   */
  private async createGenerationRecord(
    userId: Id<"users">,
    data: GenerationFormData,
    prompt: string,
    tokenCost: number
  ) {
    // Create generation record with all images stored
    return await this.convex.mutation(
      api.generations.createEnhancedGeneration,
      {
        userId,
        // New arrays for multiple images
        productImages: data.productImages,
        modelImages: data.modelImages || [],
        prompt,
        parameters: {
          model: data.model,
          style: data.style,
          quality: data.quality,
          aspectRatio: data.aspectRatio,
          ...data.parameters,
        },
        tokensUsed: tokenCost,
      }
    );
  }
}

// Export singleton instance for convenience
export const imageGenerationService = new ImageGenerationService();
