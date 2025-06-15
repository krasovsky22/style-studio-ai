// src/app/api/generate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

import { GenerationFormData, generationSchema } from "@/lib/validations";
import { API_ERROR_CODES } from "@/constants/api-errors";

import { validateImageUrls } from "@/services/cloudinary";
import { createErrorResponse } from "@/app/utils/response";
import { imageGenerationService } from "@/services/image-generation";
import { Id } from "@/convex/_generated/dataModel";

// Reuse validation schema from lib/validations.ts for consistency
const generateRequestSchema = generationSchema;

// Main POST Handler Implementation
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
    const validationResult = generateRequestSchema.safeParse(body);

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

    if (!validatedData) {
      return createErrorResponse({
        error: "Invalid request data",
        code: API_ERROR_CODES.VALIDATION_ERROR,
        statusCode: 400,
      });
    }

    // Step 4: Image URL Validation
    await validateImageUrls([
      ...validatedData.productImages,
      ...(validatedData.modelImages ?? []),
    ]);

    const generationId = await imageGenerationService.processImageGeneration(
      validatedData,
      session.user.id as Id<"users">
    );

    // Step 12: Return Success Response
    return NextResponse.json(
      {
        success: true,
        data: {
          _id: generationId,
          //   status: "pending" as const,
          //   estimatedCost: tokenCost,
          //   estimatedTime: getEstimatedTime(validatedData.quality),
          //   queuePosition: await getQueuePosition(),
          //   remainingTokens: tokenValidation.availableTokens - tokenCost,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    return createErrorResponse({
      error: "Unable to generate image",
      code: API_ERROR_CODES.IMAGE_GENERATION_ERROR,
      statusCode: 500,
      ...(error as object),
    });
  }
}
