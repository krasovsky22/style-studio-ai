// src/app/api/generate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { z } from "zod";
import { generationSchema } from "@/lib/validations";
import {
  API_ERROR_CODES,
  ERROR_STATUS_CODES,
  APIErrorCode,
} from "@/constants/api-errors";

// Initialize Convex client
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Constants
const MAX_QUEUE_SIZE = 50;
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS_PER_HOUR = 10;

// Reuse validation schema from lib/validations.ts for consistency
const generateRequestSchema = generationSchema;
type GenerateRequestBody = z.infer<typeof generateRequestSchema>;

// Custom Error Class
class APIError extends Error {
  constructor(
    message: string,
    public code: APIErrorCode,
    public statusCode?: number,
    public details?: string
  ) {
    super(message);
    this.name = "APIError";
    // Auto-assign status code if not provided
    this.statusCode = statusCode || ERROR_STATUS_CODES[code];
  }
}

// Main POST Handler Implementation
export async function POST(request: NextRequest) {
  try {
    // Step 1: Authentication Check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required",
          code: API_ERROR_CODES.AUTHENTICATION_REQUIRED,
        },
        { status: 401 }
      );
    }

    // Step 2: Parse and Validate Request Body
    const body: GenerateRequestBody = await request.json();
    const validationResult = generateRequestSchema.safeParse(body);

    if (!validationResult.success) {
      const validationErrors = validationResult.error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));

      return NextResponse.json(
        {
          success: false,
          error: "Invalid request data",
          code: API_ERROR_CODES.VALIDATION_ERROR,
          validationErrors,
        },
        { status: 400 }
      );
    }

    const validatedData = validationResult.data;

    // Step 3: Rate Limiting Check
    await checkRateLimit(session.user.id, request);

    // Step 4: Image URL Validation
    await validateImageUrls(
      validatedData.productImages,
      validatedData.modelImages
    );

    // Step 5: User and Token Balance Check
    const { user, tokenCost } = await validateUserAndTokens(
      session.user.id,
      validatedData
    );

    // Step 6: Queue Capacity Check
    await checkQueueCapacity();

    // Step 7: Generate Optimized Prompt
    const optimizedPrompt = await generatePrompt(validatedData);

    // Step 8: Create Generation Record
    const generation = await createGenerationRecord(
      user._id,
      validatedData,
      optimizedPrompt,
      tokenCost
    );

    // Step 9: Return Success Response
    return NextResponse.json(
      {
        success: true,
        data: {
          _id: generation.generationId,
          status: "pending" as const,
          estimatedCost: tokenCost,
          estimatedTime: getEstimatedTime(validatedData.quality),
          queuePosition: await getQueuePosition(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return handleError(error);
  }
}

// Helper Functions Implementation

// Rate Limiting Function
async function checkRateLimit(userId: string, request: NextRequest) {
  // Check user's recent generation requests
  const recentGenerations = await convex.query(
    api.generations.getUserGenerations,
    {
      userId: userId as Id<"users">,
      limit: 100,
    }
  );

  const oneHourAgo = Date.now() - RATE_LIMIT_WINDOW;
  const recentCount = recentGenerations.filter(
    (gen) => gen.createdAt > oneHourAgo
  ).length;

  if (recentCount >= MAX_REQUESTS_PER_HOUR) {
    throw new APIError(
      "Rate limit exceeded. Please wait before making another request.",
      API_ERROR_CODES.RATE_LIMIT_EXCEEDED
    );
  }

  // Log request for rate limiting
  await convex.mutation(api.usage.logUserAction, {
    userId: userId as Id<"users">,
    action: "generation_started",
    metadata: {
      userAgent: request.headers.get("user-agent") || undefined,
    },
    ipAddress: getClientIP(request),
  });
}

// Image URL Validation
async function validateImageUrls(
  productImages: string[],
  modelImages?: string[]
) {
  const allImages = [...productImages, ...(modelImages || [])];

  for (const imageUrl of allImages) {
    // Validate Cloudinary URL format
    if (!imageUrl.includes("cloudinary.com")) {
      throw new APIError(
        "Invalid image URL. Only Cloudinary URLs are allowed.",
        API_ERROR_CODES.IMAGE_VALIDATION_ERROR
      );
    }

    // Optional: Verify image accessibility
    try {
      const response = await fetch(imageUrl, { method: "HEAD" });
      if (!response.ok) {
        throw new APIError(
          `Image not accessible: ${imageUrl}`,
          API_ERROR_CODES.IMAGE_VALIDATION_ERROR
        );
      }
    } catch {
      throw new APIError(
        `Failed to verify image: ${imageUrl}`,
        API_ERROR_CODES.IMAGE_VALIDATION_ERROR
      );
    }
  }
}

// User and Token Validation
async function validateUserAndTokens(
  userId: string,
  data: GenerateRequestBody
) {
  // Get user from Convex
  const user = await convex.query(api.users.getUser, {
    userId: userId as Id<"users">,
  });

  if (!user) {
    throw new APIError(
      "User not found",
      API_ERROR_CODES.AUTHENTICATION_REQUIRED
    );
  }

  // Calculate token cost based on model and quality
  const tokenCost = calculateTokenCost(data.model, data.quality);

  if (user.tokenBalance < tokenCost) {
    throw new APIError(
      `Insufficient tokens. Required: ${tokenCost}, Available: ${user.tokenBalance}`,
      API_ERROR_CODES.INSUFFICIENT_TOKENS,
      400,
      `You need ${tokenCost - user.tokenBalance} more tokens to proceed.`
    );
  }

  return { user, tokenCost };
}

// Queue Capacity Check
async function checkQueueCapacity() {
  const pendingGenerations = await convex.query(
    api.generations.getPendingGenerations
  );

  if (pendingGenerations.length >= MAX_QUEUE_SIZE) {
    throw new APIError(
      "Generation queue is at capacity. Please try again later.",
      API_ERROR_CODES.QUEUE_FULL
    );
  }
}

// Prompt Generation
async function generatePrompt(data: GenerateRequestBody): Promise<string> {
  // Base prompt template based on style
  const stylePrompts: Record<string, string> = {
    realistic: "photorealistic, high quality, professional photography",
    artistic:
      "artistic interpretation, creative styling, aesthetic composition",
    minimal: "clean, minimalist, simple background, professional product shot",
  };

  let prompt = `Fashion model wearing the clothing item, ${stylePrompts[data.style] || stylePrompts.realistic}`;

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

// Generation Record Creation
async function createGenerationRecord(
  userId: Id<"users">,
  data: GenerateRequestBody,
  prompt: string,
  tokenCost: number
) {
  // Create generation record with all images stored
  const generationId = await convex.mutation(
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

  // Calculate response metadata
  const queuePosition = (await getQueuePosition()) || 1;
  const estimatedTime = getEstimatedTime(data.quality || "standard");

  return {
    generationId,
    estimatedCost: tokenCost,
    queuePosition,
    estimatedTime,
  };
}

// Utility functions

// Error Handler
function handleError(error: unknown): NextResponse {
  console.error("Generation API Error:", error);

  if (error instanceof APIError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        code: error.code,
        details: error.details,
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof z.ZodError) {
    const validationErrors = error.errors.map((err) => ({
      field: err.path.join("."),
      message: err.message,
    }));

    return NextResponse.json(
      {
        success: false,
        error: "Validation failed",
        code: API_ERROR_CODES.VALIDATION_ERROR,
        validationErrors,
      },
      { status: 400 }
    );
  }

  // Generic server error
  return NextResponse.json(
    {
      success: false,
      error: "Internal server error",
      code: API_ERROR_CODES.SERVER_ERROR,
    },
    { status: 500 }
  );
}

// Utility Functions
function calculateTokenCost(model: string, quality: string): number {
  const baseCost = 1; // Base cost for generation

  const qualityMultipliers: Record<string, number> = {
    standard: 1,
    high: 1.5,
    ultra: 2,
  };

  return Math.ceil(baseCost * (qualityMultipliers[quality] || 1));
}

function getEstimatedTime(quality: string): string {
  const estimatedTimes: Record<string, string> = {
    standard: "30-60 seconds",
    high: "1-2 minutes",
    ultra: "2-3 minutes",
  };

  return estimatedTimes[quality] || "1-2 minutes";
}

async function getQueuePosition(): Promise<number | undefined> {
  const pendingGenerations = await convex.query(
    api.generations.getPendingGenerations
  );
  return pendingGenerations.length > 0
    ? pendingGenerations.length + 1
    : undefined;
}

function getClientIP(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}
