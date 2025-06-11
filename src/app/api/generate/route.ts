import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generationSchema } from "@/lib/validations";
import { promptEngineer } from "@/lib/prompt-engineering";
import { GenerationOptions } from "@/types/generation";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

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

    // Cast the validated data to GenerationOptions to ensure type safety
    const typedOptions = generateOptions as GenerationOptions;

    // Generate optimized prompt
    const promptResult = promptEngineer.generatePrompt(typedOptions);

    // Create generation using Convex mutation directly
    const generation = await convex.mutation(api.generations.createGeneration, {
      userId: session.user.id as Id<"users">,
      productImageUrl: typedOptions.productImageUrl,
      modelImageUrl: typedOptions.modelImageUrl,
      prompt: promptResult.prompt,
      parameters: {
        model: typedOptions.model,
        style: typedOptions.style,
        quality: typedOptions.quality,
        aspectRatio: typedOptions.aspectRatio,
        seed: typedOptions.parameters?.seed,
      },
    });

    return NextResponse.json({ generationId: generation });
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
