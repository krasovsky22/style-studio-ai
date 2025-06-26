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
import { generateImages, calculateTokenCost } from "../lib/openai";
import { API_ERROR_CODES, APIErrorCode } from "@/constants/api-errors";
import { GenerationFormData } from "@/types/generation";
import { userTokenHandler } from "./user-token-handler";
import {
  MODEL_DESCRIPTIONS,
  QUALITY_MODIFIERS,
  STYLE_VARIATIONS,
} from "@/constants/prompts";
import { fileManagementService } from "@/services/file-management";

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

    try {
      // Update generation status to processing
      await this.convex.mutation(api.generations.updateGenerationStatus, {
        generationId,
        status: "processing",
      });

      console.log("Starting image generation with image analysis...", {
        generationId,
        productImageCount: validatedData.productImageFiles?.length || 0,
        modelImageCount: validatedData.modelImageFiles?.length || 0,
      });

      // Convert file references to URLs for AI generation
      const productImageUrls = await this.getUrlsFromFileReferences(
        validatedData.productImageFiles
      );
      const modelImageUrls = validatedData.modelImageFiles
        ? await this.getUrlsFromFileReferences(validatedData.modelImageFiles)
        : [];

      const { success, images } = await generateImages({
        ...validatedData,
        productImages: productImageUrls,
        modelImages: modelImageUrls,
        prompt: optimizedPrompt,
      });

      if (!success || !images.length) {
        throw new ImageGenerationError(
          "Failed to generate images",
          API_ERROR_CODES.IMAGE_GENERATION_ERROR,
          500,
          { generationId }
        );
      }

      // STEP 10: Upload result images to Cloudinary and create file references
      const resultImageFileIds: Id<"files">[] = [];

      console.log("Uploading generated images to Cloudinary...", images);
      for (const image of images) {
        // Upload using file management service
        const { public_id, secure_url } =
          await fileManagementService.uploadImage(image, userId, {
            category: "generated_image",
            filename: `${userId}_${generationId}_${Date.now()}`,
            generationId,
          });

        // Create file reference in Convex
        const fileId = await this.convex.mutation(api.files.storeFileMetadata, {
          userId,
          filename: `generated_${Date.now()}.png`,
          contentType: "image/png",
          size: 0, // We don't have the exact size, but it's not critical
          category: "generated_image",
          storageId: public_id, // Use Cloudinary public_id as storage ID
          metadata: {
            generationId,
            originalUrl: secure_url,
            isPrimary: resultImageFileIds.length === 0, // First image is primary
            imageOrder: resultImageFileIds.length,
          },
        });

        resultImageFileIds.push(fileId);
        console.log("Generated image uploaded and file created:", {
          public_id,
          secure_url,
          fileId,
        });
      }

      // Update generation record with result file IDs and mark as completed
      await this.convex.mutation(api.generations.updateGenerationStatus, {
        generationId,
        status: "completed",
        resultImageFiles: resultImageFileIds,
      });

      console.log("Generation completed successfully:", {
        generationId,
        imageCount: resultImageFileIds.length,
      });

      return {
        success: true,
        generationId,
        resultImageFiles: resultImageFileIds,
      };
    } catch (error) {
      console.error("Error during image generation process:", error);

      // Mark generation as failed and provide error details
      await this.convex.mutation(api.generations.updateGenerationStatus, {
        generationId,
        status: "failed",
        error:
          error instanceof Error
            ? error.message
            : "Unknown error during generation",
      });

      throw new ImageGenerationError(
        "Failed to complete image generation",
        API_ERROR_CODES.IMAGE_GENERATION_ERROR,
        500,
        { generationId, error: String(error) }
      );
    }
  }

  /**
   * Process an existing generation record (used when generation ID is provided)
   */
  async processExistingGeneration(
    generationId: Id<"generations">,
    userId: Id<"users">
  ) {
    try {
      // Get the generation record
      const generation = await this.convex.query(
        api.generations.getGeneration,
        {
          id: generationId,
        }
      );

      if (!generation) {
        throw new ImageGenerationError(
          "Generation not found",
          API_ERROR_CODES.GENERATION_NOT_FOUND,
          404
        );
      }

      // Verify ownership
      if (generation.userId !== userId) {
        throw new ImageGenerationError(
          "Unauthorized access to generation",
          API_ERROR_CODES.UNAUTHORIZED,
          403
        );
      }

      // Update generation status to processing
      await this.convex.mutation(api.generations.updateGenerationStatus, {
        generationId,
        status: "processing",
      });

      console.log("Starting generation processing...", {
        generationId,
        productImageCount: generation.productImageFiles?.length || 0,
        modelImageCount: generation.modelImageFiles?.length || 0,
      });

      // Convert file references to URLs for AI generation
      const productImageUrls = await this.getUrlsFromFileReferences(
        generation.productImageFiles || []
      );
      const modelImageUrls = generation.modelImageFiles
        ? await this.getUrlsFromFileReferences(generation.modelImageFiles)
        : [];

      // Reconstruct form data from generation record for AI generation
      const formDataForAI = {
        productImages: productImageUrls,
        modelImages: modelImageUrls,
        customPrompt: "", // Not stored separately, already in prompt
        style:
          (generation.parameters.style as GenerationFormData["style"]) ||
          "realistic",
        quality:
          (generation.parameters.quality as GenerationFormData["quality"]) ||
          "auto",
        aspectRatio:
          (generation.parameters
            .aspectRatio as GenerationFormData["aspectRatio"]) || "1:1",
        model: generation.parameters.model,
        parameters: {
          guidance_scale: generation.parameters.guidance_scale || 7.5,
          num_inference_steps: generation.parameters.num_inference_steps || 50,
          strength: generation.parameters.strength || 0.8,
          seed: generation.parameters.seed || 0,
        },
      };

      // Generate images using the stored prompt
      const { success, images } = await generateImages({
        ...formDataForAI,
        prompt: generation.prompt,
      });

      // Update generation status to uploading
      await this.convex.mutation(api.generations.updateGenerationStatus, {
        generationId,
        status: "uploading",
      });

      if (!success || !images.length) {
        throw new ImageGenerationError(
          "Failed to generate images",
          API_ERROR_CODES.IMAGE_GENERATION_ERROR,
          500,
          { generationId }
        );
      }

      // Upload result images to Cloudinary and create file references
      const resultImageFileIds: Id<"files">[] = [];
      const resultedImagedUrls: string[] = [];

      for (const image of images) {
        // Upload using file management service
        const { public_id, secure_url } =
          await fileManagementService.uploadImage(image, userId, {
            category: "generated_image",
            filename: `${userId}_${generationId}_${Date.now()}`,
            generationId,
          });

        // Create file reference in Convex
        const fileId = await this.convex.mutation(api.files.storeFileMetadata, {
          userId,
          filename: `generated_${Date.now()}.png`,
          contentType: "image/png",
          size: 0, // We don't have the exact size, but it's not critical
          category: "generated_image",
          storageId: public_id, // Use Cloudinary public_id as storage ID
          metadata: {
            generationId,
            originalUrl: secure_url,
            isPrimary: resultImageFileIds.length === 0, // First image is primary
            imageOrder: resultImageFileIds.length,
          },
        });

        resultImageFileIds.push(fileId);
        resultedImagedUrls.push(secure_url);
        console.log("Generated image uploaded and file created:", {
          public_id,
          secure_url,
          fileId,
        });
      }

      // Update generation record with result file IDs and mark as completed
      await this.convex.mutation(api.generations.updateGenerationStatus, {
        generationId,
        status: "completed",
        resultImageFiles: resultImageFileIds,
      });

      console.log("Generation completed successfully:", {
        generationId,
        imageCount: resultImageFileIds.length,
      });

      return {
        success: true,
        generationId,
        resultImageFiles: resultImageFileIds,
        resultedImagedUrls,
      };
    } catch (error) {
      console.error("Error during existing generation processing:", error);

      // Mark generation as failed and provide error details
      await this.convex.mutation(api.generations.updateGenerationStatus, {
        generationId,
        status: "failed",
        error:
          error instanceof Error
            ? error.message
            : "Unknown error during generation",
      });

      throw new ImageGenerationError(
        "Failed to complete generation processing",
        API_ERROR_CODES.IMAGE_GENERATION_ERROR,
        500,
        { generationId, error: String(error) }
      );
    }
  }

  /**
   * Get URLs from file references for AI generation
   */
  private async getUrlsFromFileReferences(
    fileIds: Id<"files">[]
  ): Promise<string[]> {
    const urls: string[] = [];

    for (const fileId of fileIds) {
      const file = await this.convex.query(api.files.getFile, { fileId });
      if (file && file.metadata?.originalUrl) {
        urls.push(file.metadata.originalUrl as string);
      }
    }

    return urls;
  }

  // Prompt Generation
  private async generatePrompt(data: GenerationFormData): Promise<string> {
    const { style, quality, productImageFiles, modelImageFiles } = data;

    // Base prompt components
    let prompt = "";

    // If we have both product and model images, create a specific outfit visualization prompt
    if (
      productImageFiles &&
      productImageFiles.length > 0 &&
      modelImageFiles &&
      modelImageFiles.length > 0
    ) {
      prompt = `Generate an image showing the specific outfit/clothing from the provided product images being worn by the person from the model images. `;
      prompt += `Style: ${STYLE_VARIATIONS[style].modifiers}, ${STYLE_VARIATIONS[style].setting}. `;
      prompt += `Ensure the clothing fits naturally on the model while maintaining the original design and details of the outfit. `;
    }
    // If we only have product images, describe them being worn by a generic model
    else if (productImageFiles && productImageFiles.length > 0) {
      prompt = `Generate an image of the specific outfit/clothing from the provided product images being worn by a ${MODEL_DESCRIPTIONS[style]}. `;
      prompt += `${STYLE_VARIATIONS[style].modifiers}, ${STYLE_VARIATIONS[style].setting}. `;
      prompt += `Show the clothing naturally worn while maintaining all original design details and colors. `;
    }
    // If we only have model images, create a fashion shoot with stylish clothing
    else if (modelImageFiles && modelImageFiles.length > 0) {
      prompt = `Create a fashion photograph of the person from the model images wearing stylish, fashionable clothing. `;
      prompt += `${STYLE_VARIATIONS[style].modifiers}, ${STYLE_VARIATIONS[style].setting}. `;
      prompt += `The outfit should complement the person's style and the overall aesthetic. `;
    }
    // Fallback to original prompt structure
    else {
      prompt = `A stylish outfit elegantly worn by a ${MODEL_DESCRIPTIONS[style]}, `;
      prompt += `${STYLE_VARIATIONS[style].modifiers}, ${STYLE_VARIATIONS[style].setting}. `;
    }

    // Add professional photography context
    prompt += `Professional fashion photography, ${QUALITY_MODIFIERS[quality]}`;

    // Add custom prompt if provided
    if (data.customPrompt) {
      prompt += `, ${data.customPrompt}`;
    }

    // Add quality-specific modifiers
    if (data.quality === "high") {
      prompt += ", high resolution, detailed fabric textures, sharp focus";
    }
    //  else if (data.quality === "ultra") {
    //   prompt +=
    //     ", ultra high resolution, extremely detailed, professional studio lighting, award-winning fashion photography";
    // }

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
    // Create generation record with file references
    return await this.convex.mutation(
      api.generations.createEnhancedGeneration,
      {
        userId,
        // Use file reference arrays instead of URL arrays
        productImageFiles: data.productImageFiles,
        modelImageFiles: data.modelImageFiles || [],
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
