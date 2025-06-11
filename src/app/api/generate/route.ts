import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { GenerationService } from "@/services/generation";
import { generationSchema } from "@/lib/validations";
import { GenerationOptions } from "@/types/generation";

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = generationSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request data",
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { data: generateOptions } = validationResult;

    // Create generation using the service
    const generationService = new GenerationService();
    const generation = await generationService.createGeneration(
      session.user.id,
      generateOptions as GenerationOptions
    );

    return NextResponse.json(generation);
  } catch (error) {
    console.error("Generation creation failed:", error);

    if (error instanceof Error) {
      // Handle specific error types with detailed messages
      if (error.message.includes("Insufficient tokens")) {
        return NextResponse.json(
          {
            error: "Insufficient tokens for generation",
            code: "INSUFFICIENT_TOKENS",
            details: error.message,
          },
          { status: 402 }
        );
      }

      if (error.message.includes("Rate limit")) {
        return NextResponse.json(
          {
            error: "Rate limit exceeded. Please try again later.",
            code: "RATE_LIMIT_EXCEEDED",
            details: error.message,
          },
          { status: 429 }
        );
      }

      if (error.message.includes("Validation failed")) {
        return NextResponse.json(
          {
            error: "Invalid generation parameters",
            code: "VALIDATION_ERROR",
            details: error.message,
          },
          { status: 400 }
        );
      }

      if (
        error.message.includes("Invalid product image") ||
        error.message.includes("Invalid model image")
      ) {
        return NextResponse.json(
          {
            error: "Image validation failed",
            code: "IMAGE_VALIDATION_ERROR",
            details: error.message,
          },
          { status: 400 }
        );
      }

      if (
        error.message.includes("AI model") ||
        error.message.includes("model")
      ) {
        return NextResponse.json(
          {
            error: "AI model configuration error",
            code: "MODEL_ERROR",
            details: error.message,
          },
          { status: 400 }
        );
      }

      // Return the actual error message for debugging in development
      return NextResponse.json(
        {
          error:
            process.env.NODE_ENV === "development"
              ? error.message
              : "Generation failed. Please try again.",
          code: "GENERATION_ERROR",
          details:
            process.env.NODE_ENV === "development" ? error.message : undefined,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: "An unexpected error occurred",
        code: "UNKNOWN_ERROR",
        details:
          process.env.NODE_ENV === "development" ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}
