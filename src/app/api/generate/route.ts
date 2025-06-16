// src/app/api/generate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

import { API_ERROR_CODES } from "@/constants/api-errors";
import { createErrorResponse } from "@/app/utils/response";
import { imageGenerationService } from "@/services/image-generation";
import { Id } from "@/convex/_generated/dataModel";
import { z } from "zod";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Request schema for processing generation
const processGenerationSchema = z.object({
  generationId: z.string().min(1, "Generation ID is required"),
});

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
    const validationResult = processGenerationSchema.safeParse(body);

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

    const { generationId } = validationResult.data;

    // Step 3: Get Generation Record
    const generation = await convex.query(api.generations.getGeneration, {
      id: generationId as Id<"generations">,
    });

    if (!generation) {
      return createErrorResponse({
        error: "Generation not found",
        code: API_ERROR_CODES.GENERATION_NOT_FOUND,
        statusCode: 404,
      });
    }

    // Step 4: Verify User Owns Generation
    if (generation.userId !== session.user.id) {
      return createErrorResponse({
        error: "Unauthorized access to generation",
        code: API_ERROR_CODES.UNAUTHORIZED,
        statusCode: 403,
      });
    }

    // Step 5: Check Generation Status
    if (generation.status !== "pending") {
      return createErrorResponse({
        error: `Generation is already ${generation.status}`,
        code: API_ERROR_CODES.INVALID_GENERATION_STATUS,
        statusCode: 400,
      });
    }

    // Step 6: Process Generation with Service
    const { resultImages } =
      await imageGenerationService.processExistingGeneration(
        generation._id,
        session.user.id as Id<"users">
      );

    // Step 7: Return Success Response
    return NextResponse.json(
      {
        success: true,
        data: {
          generationId: generation._id,
          resultImages,
          status: "processing",
          message: "Generation processing started successfully",
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Generation processing failed:", error);

    return createErrorResponse({
      error: "Unable to process generation",
      code: API_ERROR_CODES.IMAGE_GENERATION_ERROR,
      statusCode: 500,
    });
  }
}
