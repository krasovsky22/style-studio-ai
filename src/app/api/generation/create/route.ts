// src/app/api/generation/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

import { GenerationFormData, generationSchema } from "@/lib/validations";
import { API_ERROR_CODES } from "@/constants/api-errors";
import { validateImageUrls } from "@/lib/cloudinary";
import { createErrorResponse } from "@/app/utils/response";
import { userTokenHandler } from "@/services/user-token-handler";
import { calculateTokenCost } from "@/lib/openai";
import { generateOptimizedPrompt } from "@/constants/prompts";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * Create Generation Record API Route
 *
 * This route creates a new generation record in the database and returns the generation ID.
 * The actual AI processing will be handled separately by the /api/generate route.
 *
 * Flow:
 * 1. Validate authentication and request data
 * 2. Check user token balance
 * 3. Create generation record with "pending" status
 * 4. Return generation ID for frontend tracking
 */
export async function POST(request: NextRequest) {
  try {
    // Step 1: Authentication Check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return createErrorResponse({
        error: "Authentication required",
        code: API_ERROR_CODES.AUTHENTICATION_REQUIRED,
        statusCode: 401,
      });
    }

    // Step 2: Parse and Validate Request Body
    const body = await request.json();
    const validationResult = generationSchema.safeParse(body);

    if (!validationResult.success) {
      const validationErrors = validationResult.error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));

      return createErrorResponse({
        error: "Invalid request data",
        code: API_ERROR_CODES.VALIDATION_ERROR,
        validationErrors,
        statusCode: 400,
      });
    }

    const validatedData: GenerationFormData = validationResult.data;

    // Step 3: Image URL Validation
    try {
      await validateImageUrls([
        ...validatedData.productImages,
        ...(validatedData.modelImages ?? []),
      ]);
    } catch {
      return createErrorResponse({
        error: "Invalid image URLs provided",
        code: API_ERROR_CODES.VALIDATION_ERROR,
        statusCode: 400,
      });
    }

    // Step 4: Calculate Token Cost
    const tokenCost = calculateTokenCost(
      validatedData.model,
      validatedData.quality
    );

    // Step 5: Validate User Token Balance
    try {
      await userTokenHandler.validateUserTokens(
        session.user.id as Id<"users">,
        tokenCost
      );
    } catch (error) {
      return createErrorResponse({
        error: error instanceof Error ? error.message : "Insufficient tokens",
        code: API_ERROR_CODES.INSUFFICIENT_TOKENS,
        statusCode: 400,
      });
    }

    // Step 6: Generate Optimized Prompt
    const optimizedPrompt = await generateOptimizedPrompt({
      productImages: validatedData.productImages,
      modelImages: validatedData.modelImages,
      style: validatedData.style,
      customPrompt: validatedData.customPrompt,
      parameters: validatedData.parameters,
    });

    // Step 7: Create Generation Record in Database
    const generationId = await convex.mutation(
      api.generations.createEnhancedGeneration,
      {
        userId: session.user.id as Id<"users">,
        productImages: validatedData.productImages,
        modelImages: validatedData.modelImages || [],
        prompt: optimizedPrompt,
        parameters: {
          model: validatedData.model,
          style: validatedData.style,
          quality: validatedData.quality,
          aspectRatio: validatedData.aspectRatio,
          guidance_scale: validatedData.parameters?.guidance_scale,
          num_inference_steps: validatedData.parameters?.num_inference_steps,
          strength: validatedData.parameters?.strength,
          seed: validatedData.parameters?.seed,
        },
        tokensUsed: tokenCost,
      }
    );

    // Step 8: Return Success Response with Generation ID
    return NextResponse.json(
      {
        success: true,
        data: {
          generationId,
          estimatedCost: tokenCost,
          prompt: optimizedPrompt,
          status: "pending" as const,
          message: "Generation record created successfully",
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Generation creation failed:", error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes("Insufficient token balance")) {
        return createErrorResponse({
          error: error.message,
          code: API_ERROR_CODES.INSUFFICIENT_TOKENS,
          statusCode: 400,
        });
      }

      if (error.message.includes("User not found")) {
        return createErrorResponse({
          error: "User not found",
          code: API_ERROR_CODES.USER_NOT_FOUND,
          statusCode: 404,
        });
      }
    }

    return createErrorResponse({
      error: "Unable to create generation record",
      code: API_ERROR_CODES.INTERNAL_SERVER_ERROR,
      statusCode: 500,
    });
  }
}
