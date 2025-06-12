# Generation Form Submission Endpoint - Implementation Plan

## Overview

This document outlines the detailed step-by-step implementation plan for the `/api/generate` endpoint that handles form submissions from the generation form component. The endpoint will process multi-image uploads, validate parameters, check user authentication and token balance, and initiate AI image generation.

## Table of Contents

1. [Endpoint Structure](#endpoint-structure)
2. [Request/Response Schema](#requestresponse-schema)
3. [Implementation Steps](#implementation-steps)
4. [Validation Strategy](#validation-strategy)
5. [Error Handling](#error-handling)
6. [Security Considerations](#security-considerations)
7. [Testing Strategy](#testing-strategy)
8. [Performance Optimization](#performance-optimization)
9. [Schema Updates Required](#schema-updates-required)

---

## Endpoint Structure

### Route Location

```
src/app/api/generate/route.ts
```

### HTTP Methods

- **POST**: Create new generation request

### Authentication

- Requires valid NextAuth.js session
- Session validation via `getServerSession(authOptions)`

---

## Request/Response Schema

### Request Body Schema

```typescript
interface GenerationRequestBody {
  productImages: string[]; // Array of Cloudinary URLs (required, min 1, max 5)
  modelImages?: string[]; // Array of Cloudinary URLs (optional, max 3)
  style: "realistic" | "artistic" | "minimal";
  aspectRatio: "1:1" | "16:9" | "9:16" | "3:2" | "2:3";
  quality: "standard" | "high" | "ultra";
  model: "gpt-4.1-dalle-3"; // AI model identifier
  customPrompt?: string; // Optional custom prompt (max 500 chars)
  parameters?: {
    guidance_scale: number; // 1.0 - 20.0, default 7.5
    num_inference_steps: number; // 20 - 100, default 50
    strength: number; // 0.1 - 1.0, default 0.8
    seed?: number; // Optional seed for reproducibility
  };
}
```

### Response Schema

#### Success Response (201 Created)

```typescript
interface GenerationSuccessResponse {
  success: true;
  data: {
    _id: string; // Generation ID
    status: "pending";
    estimatedCost: number; // Tokens required
    estimatedTime: string; // Human-readable time estimate
    queuePosition?: number; // Position in generation queue
  };
}
```

#### Error Response (400/401/500)

```typescript
interface GenerationErrorResponse {
  success: false;
  error: string; // Human-readable error message
  code: ErrorCode; // Machine-readable error code
  details?: string; // Additional error context
  validationErrors?: Array<{
    // Field-specific validation errors
    field: string;
    message: string;
  }>;
}
```

### Error Codes

```typescript
type ErrorCode =
  | "AUTHENTICATION_REQUIRED" // No valid session
  | "INSUFFICIENT_TOKENS" // Not enough tokens
  | "VALIDATION_ERROR" // Invalid request data
  | "IMAGE_VALIDATION_ERROR" // Invalid image URLs
  | "RATE_LIMIT_EXCEEDED" // Too many requests
  | "MODEL_ERROR" // AI model configuration error
  | "SERVER_ERROR" // Internal server error
  | "QUEUE_FULL"; // Generation queue at capacity
```

---

## Implementation Steps

### Step 1: Create Route File Structure

```bash
# Create the API route directory and file
mkdir -p src/app/api/generate
touch src/app/api/generate/route.ts
```

### Step 2: Import Dependencies

```typescript
// src/app/api/generate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { z } from "zod";
import { GenerationOptions } from "@/types/generation";
import { generationSchema } from "@/lib/validations";
```

**Note**: The API endpoint will also need to import and use the new Convex functions:

- `api.files.storeFileMetadata` - for storing image metadata
- `api.files.updateFileMetadata` - for linking images to generations
- `api.files.getGenerationImages` - for retrieving all images for a generation
- `api.generations.createEnhancedGeneration` - enhanced generation creation with token validation

### Step 3: Environment Setup

```typescript
// Initialize Convex client
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Constants
const MAX_QUEUE_SIZE = 50;
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS_PER_HOUR = 10;
```

### Step 4: Request Validation Schema

```typescript
// Reuse validation schema from lib/validations.ts for consistency
const generateRequestSchema = generationSchema;
type GenerateRequestBody = z.infer<typeof generateRequestSchema>;

// Additional API-specific validation helpers
const apiValidationHelpers = {
  // Validate Cloudinary URL format
  validateCloudinaryURL: (url: string): boolean => {
    return url.includes("res.cloudinary.com") && url.includes("/image/upload/");
  },

  // Validate custom prompt for harmful content
  validatePrompt: (prompt: string): boolean => {
    const bannedWords = ["explicit", "violent", "harmful"]; // Extend as needed
    return !bannedWords.some((word) => prompt.toLowerCase().includes(word));
  },

  // Validate aspect ratio compatibility with model
  validateAspectRatioCompatibility: (
    model: string,
    aspectRatio: string
  ): boolean => {
    const compatibilityMap = {
      "gpt-4.1-dalle-3": ["1:1", "16:9", "9:16", "3:2", "2:3"],
    };

    return compatibilityMap[model]?.includes(aspectRatio) ?? false;
  },
};
```

**Benefits of Reusing Validation Schema:**

1. **Consistency**: Frontend and backend use identical validation rules
2. **Maintainability**: Single source of truth for validation logic
3. **DRY Principle**: No duplication of validation code
4. **Type Safety**: Shared TypeScript types ensure compatibility
5. **Error Messages**: Consistent error messages across client and server

**Schema Details:**

The `generationSchema` from `lib/validations.ts` includes:

- `productImages`: Array of 1-5 Cloudinary URLs (required)
- `modelImages`: Array of 0-3 Cloudinary URLs (optional)
- `style`: Enum of realistic/artistic/minimal
- `quality`: Enum of standard/high/ultra
- `aspectRatio`: Enum of supported ratios
- `model`: Currently only gpt-4.1-dalle-3
- `customPrompt`: Optional string up to 500 characters
- `parameters`: Optional object with guidance_scale, num_inference_steps, strength, seed

### Step 5: Main POST Handler Implementation

```typescript
export async function POST(request: NextRequest) {
  try {
    // Step 1: Authentication Check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required",
          code: "AUTHENTICATION_REQUIRED",
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
          code: "VALIDATION_ERROR",
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
```

### Step 6: Helper Functions Implementation

#### Rate Limiting Function

```typescript
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
      "RATE_LIMIT_EXCEEDED",
      429
    );
  }

  // Log request for rate limiting
  await convex.mutation(api.usage.logUsage, {
    userId: userId as Id<"users">,
    action: "generation_started",
    timestamp: Date.now(),
    metadata: {
      ipAddress: getClientIP(request),
      userAgent: request.headers.get("user-agent") || undefined,
    },
  });
}
```

#### Image URL Validation

```typescript
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
        "IMAGE_VALIDATION_ERROR",
        400
      );
    }

    // Optional: Verify image accessibility
    try {
      const response = await fetch(imageUrl, { method: "HEAD" });
      if (!response.ok) {
        throw new APIError(
          `Image not accessible: ${imageUrl}`,
          "IMAGE_VALIDATION_ERROR",
          400
        );
      }
    } catch {
      throw new APIError(
        `Failed to verify image: ${imageUrl}`,
        "IMAGE_VALIDATION_ERROR",
        400
      );
    }
  }
}
```

#### User and Token Validation

```typescript
async function validateUserAndTokens(
  userId: string,
  data: GenerateRequestBody
) {
  // Get user from Convex
  const user = await convex.query(api.users.getUser, {
    userId: userId as Id<"users">,
  });

  if (!user) {
    throw new APIError("User not found", "AUTHENTICATION_REQUIRED", 401);
  }

  // Calculate token cost based on model and quality
  const tokenCost = calculateTokenCost(data.model, data.quality);

  if (user.tokenBalance < tokenCost) {
    throw new APIError(
      `Insufficient tokens. Required: ${tokenCost}, Available: ${user.tokenBalance}`,
      "INSUFFICIENT_TOKENS",
      400,
      `You need ${tokenCost - user.tokenBalance} more tokens to proceed.`
    );
  }

  return { user, tokenCost };
}
```

#### Queue Capacity Check

```typescript
async function checkQueueCapacity() {
  const pendingGenerations = await convex.query(
    api.generations.getPendingGenerations
  );

  if (pendingGenerations.length >= MAX_QUEUE_SIZE) {
    throw new APIError(
      "Generation queue is at capacity. Please try again later.",
      "QUEUE_FULL",
      503
    );
  }
}
```

#### Prompt Generation

```typescript
async function generatePrompt(data: GenerateRequestBody): Promise<string> {
  // Base prompt template based on style
  const stylePrompts = {
    realistic: "photorealistic, high quality, professional photography",
    artistic:
      "artistic interpretation, creative styling, aesthetic composition",
    minimal: "clean, minimalist, simple background, professional product shot",
  };

  let prompt = `Fashion model wearing the clothing item, ${stylePrompts[data.style]}`;

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
```

#### Generation Record Creation

```typescript
async function createGenerationRecord(
  userId: Id<"users">,
  data: GenerateRequestBody,
  prompt: string,
  tokenCost: number
) {
  // Store all uploaded images in Convex files table first
  const storedImages = await storeGenerationImages(
    userId,
    data.productImages,
    data.modelImages
  );

  // Create generation record with all images stored
  const generationId = await convex.mutation(
    api.generations.createEnhancedGeneration,
    {
      userId,
      // Backward compatibility - primary images
      productImageUrl: data.productImages[0],
      modelImageUrl: data.modelImages?.[0],
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
      estimatedTokenCost: tokenCost,
    }
  );

  // Link all stored images to the generation
  await linkImagesToGeneration(generationId, storedImages);

  return { generationId, estimatedCost: tokenCost };
}

// Helper function to store generation images in Convex files table
async function storeGenerationImages(
  userId: Id<"users">,
  productImages: string[],
  modelImages?: string[]
) {
  const storedImages: {
    productImages: Array<{ url: string; fileId: Id<"files"> }>;
    modelImages: Array<{ url: string; fileId: Id<"files"> }>;
  } = {
    productImages: [],
    modelImages: [],
  };

  // Store product images with metadata
  for (const [index, imageUrl] of productImages.entries()) {
    const cloudinaryInfo = extractCloudinaryInfo(imageUrl);

    const fileId = await convex.mutation(api.files.storeFileMetadata, {
      userId,
      filename: `product-${index + 1}-${Date.now()}.${cloudinaryInfo.format}`,
      contentType: `image/${cloudinaryInfo.format}`,
      size: cloudinaryInfo.size || 0,
      storageId: cloudinaryInfo.publicId,
      category: "product_image" as const,
      metadata: {
        width: cloudinaryInfo.width,
        height: cloudinaryInfo.height,
        format: cloudinaryInfo.format,
        originalUrl: imageUrl,
        isPrimary: index === 0, // First image is primary
        imageOrder: index, // Track the order for proper reconstruction
      },
    });

    storedImages.productImages.push({ url: imageUrl, fileId });
  }

  // Store model images if provided
  if (modelImages && modelImages.length > 0) {
    for (const [index, imageUrl] of modelImages.entries()) {
      const cloudinaryInfo = extractCloudinaryInfo(imageUrl);

      const fileId = await convex.mutation(api.files.storeFileMetadata, {
        userId,
        filename: `model-${index + 1}-${Date.now()}.${cloudinaryInfo.format}`,
        contentType: `image/${cloudinaryInfo.format}`,
        size: cloudinaryInfo.size || 0,
        storageId: cloudinaryInfo.publicId,
        category: "model_image" as const,
        metadata: {
          width: cloudinaryInfo.width,
          height: cloudinaryInfo.height,
          format: cloudinaryInfo.format,
          originalUrl: imageUrl,
          isPrimary: index === 0,
          imageOrder: index,
        },
      });

      storedImages.modelImages.push({ url: imageUrl, fileId });
    }
  }

  return storedImages;
}

// Helper function to link images to generation
async function linkImagesToGeneration(
  generationId: Id<"generations">,
  storedImages: {
    productImages: Array<{ url: string; fileId: Id<"files"> }>;
    modelImages: Array<{ url: string; fileId: Id<"files"> }>;
  }
) {
  // Link product images to generation
  for (const image of storedImages.productImages) {
    await convex.mutation(api.files.updateFileMetadata, {
      fileId: image.fileId,
      metadata: {
        generationId,
      },
    });
  }

  // Link model images to generation
  for (const image of storedImages.modelImages) {
    await convex.mutation(api.files.updateFileMetadata, {
      fileId: image.fileId,
      metadata: {
        generationId,
      },
    });
  }
}

// Helper function to extract Cloudinary information from URL
function extractCloudinaryInfo(url: string): {
  publicId: string;
  format: string;
  width?: number;
  height?: number;
  size?: number;
} {
  // Extract the public ID from Cloudinary URL
  // Example: https://res.cloudinary.com/demo/image/upload/c_fill,w_400,h_400/sample.jpg
  const match = url.match(/\/upload\/(?:[^\/]+\/)*(.+?)\.(\w+)(?:\?|$)/);
  const publicId = match?.[1] || url;
  const format = match?.[2] || "jpg";

  // Extract dimensions from URL if available (from transformations)
  const widthMatch = url.match(/w_(\d+)/);
  const heightMatch = url.match(/h_(\d+)/);

  return {
    publicId,
    format,
    width: widthMatch ? parseInt(widthMatch[1]) : undefined,
    height: heightMatch ? parseInt(heightMatch[1]) : undefined,
    size: undefined, // Could be extracted from Cloudinary API if needed
  };
}
```

**Enhanced Features:**

1. **Complete Image Storage**: All images are stored both in generation record and files table
2. **Dual Storage Strategy**:
   - Generation record contains all image URLs for quick access
   - Files table contains detailed metadata and relationships
3. **Image Order Tracking**: Maintains the order of images for proper reconstruction
4. **Enhanced Metadata**: Extracts dimensions and format from Cloudinary URLs
5. **Backward Compatibility**: Still supports single image fields for existing code
6. **Complete Traceability**: Every image is linked to its generation for easy cleanup

**Database Schema Updates:**

The schema now supports:

- `productImages: string[]` - Array of all product image URLs
- `modelImages?: string[]` - Array of all model image URLs
- `resultImages?: string[]` - Array of generated image URLs (for future use)
- Maintains `productImageUrl`, `modelImageUrl` for backward compatibility

**Benefits:**

- **Comprehensive Storage**: No image data is lost
- **Fast Access**: Generation record contains all URLs for immediate use
- **Detailed Tracking**: Files table provides metadata and relationships
- **Future-Proof**: Easy to add more image types or processing
- **Cleanup Support**: Can easily find and remove orphaned images

3. **Image Metadata**: Tracks image order, primary status, and links to generation
4. **File Organization**: Properly categorizes images as "product_image" or "model_image"
5. **Generation Linking**: Links all images to the specific generation for easy retrieval

**Database Integration:**

- Uses existing `files` table to store image metadata
- Links images to generation via `generationId` in file metadata
- Maintains backward compatibility with existing generation schema
- Enables future features like image reordering, deletion, and advanced processing

**Benefits:**

- **Complete Image Tracking**: All uploaded images are properly stored and tracked
- **Scalable**: Can easily add more image types or metadata in the future
- **Consistent**: Uses the same file storage pattern as other parts of the app
- **Queryable**: Can easily retrieve all images for a generation or user

### Step 7: Error Handling

#### Custom Error Class

```typescript
class APIError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public details?: string
  ) {
    super(message);
    this.name = "APIError";
  }
}
```

#### Error Handler

```typescript
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
        code: "VALIDATION_ERROR",
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
      code: "SERVER_ERROR",
    },
    { status: 500 }
  );
}
```

### Step 8: Utility Functions

```typescript
function calculateTokenCost(model: string, quality: string): number {
  const baseCost = 1; // Base cost for generation

  const qualityMultipliers = {
    standard: 1,
    high: 1.5,
    ultra: 2,
  };

  return Math.ceil(baseCost * (qualityMultipliers[quality] || 1));
}

function getEstimatedTime(quality: string): string {
  const estimatedTimes = {
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
```

---

## Validation Strategy

### 1. Input Validation Layers

#### Layer 1: Schema Validation (Zod)

- Basic type checking
- Format validation
- Range validation
- Required field validation

#### Layer 2: Business Logic Validation

- Token balance verification
- Rate limiting checks
- Queue capacity validation
- Image URL verification

#### Layer 3: Security Validation

- Authentication verification
- Authorization checks
- Input sanitization
- CSRF protection

### 2. Validation Error Handling

```typescript
interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  data?: any;
}
```

### 3. Custom Validation Functions

```typescript
// Validate image URLs are from Cloudinary
function validateCloudinaryURL(url: string): boolean {
  return url.includes("res.cloudinary.com") && url.includes("/image/upload/");
}

// Validate custom prompt for harmful content
function validatePrompt(prompt: string): boolean {
  const bannedWords = ["explicit", "violent", "harmful"]; // Extend as needed
  return !bannedWords.some((word) => prompt.toLowerCase().includes(word));
}

// Validate aspect ratio compatibility with model
function validateAspectRatioCompatibility(
  model: string,
  aspectRatio: string
): boolean {
  const compatibilityMap = {
    "gpt-4.1-dalle-3": ["1:1", "16:9", "9:16", "3:2", "2:3"],
  };

  return compatibilityMap[model]?.includes(aspectRatio) ?? false;
}
```

---

## Error Handling

### 1. Error Categories

#### Authentication Errors (401)

- Missing session
- Invalid session
- Expired session

#### Validation Errors (400)

- Invalid request schema
- Invalid image URLs
- Insufficient tokens
- Invalid parameters

#### Rate Limiting Errors (429)

- Too many requests
- Quota exceeded

#### Server Errors (500)

- Database connection issues
- External API failures
- Unexpected errors

#### Service Unavailable (503)

- Queue at capacity
- Maintenance mode
- External service down

### 2. Error Response Format

```typescript
interface ErrorResponse {
  success: false;
  error: string; // Human-readable message
  code: string; // Machine-readable code
  details?: string; // Additional context
  timestamp: string; // ISO timestamp
  requestId?: string; // For debugging
  validationErrors?: Array<{
    field: string;
    message: string;
  }>;
}
```

### 3. Error Logging Strategy

```typescript
function logError(error: Error, context: any) {
  const errorLog = {
    timestamp: new Date().toISOString(),
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
    },
    context: {
      userId: context.userId,
      endpoint: "/api/generate",
      method: "POST",
      userAgent: context.userAgent,
      ip: context.ip,
    },
    requestData: context.requestData, // Sanitized request data
  };

  console.error("API Error:", JSON.stringify(errorLog, null, 2));

  // In production, send to error tracking service
  // await sendToErrorTracking(errorLog);
}
```

---

## Security Considerations

### 1. Authentication & Authorization

#### Session Validation

```typescript
async function validateSession(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new APIError(
      "Authentication required",
      "AUTHENTICATION_REQUIRED",
      401
    );
  }

  // Optional: Check if user account is active/verified
  const user = await convex.query(api.users.getUser, {
    userId: session.user.id as Id<"users">,
  });

  if (!user || user.status === "disabled") {
    throw new APIError("Account not active", "ACCOUNT_DISABLED", 403);
  }

  return { session, user };
}
```

### 2. Input Sanitization

```typescript
function sanitizeInput(data: any): any {
  if (typeof data === "string") {
    // Remove potentially harmful characters
    return data
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/javascript:/gi, "")
      .trim();
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeInput);
  }

  if (typeof data === "object" && data !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }

  return data;
}
```

### 3. Rate Limiting

```typescript
// Implement sliding window rate limiting
class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  isAllowed(identifier: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const timestamps = this.requests.get(identifier) || [];

    // Remove old timestamps
    const validTimestamps = timestamps.filter(
      (timestamp) => now - timestamp < windowMs
    );

    if (validTimestamps.length >= limit) {
      return false;
    }

    validTimestamps.push(now);
    this.requests.set(identifier, validTimestamps);

    return true;
  }
}

const rateLimiter = new RateLimiter();
```

### 4. CORS and Headers

```typescript
function setSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  return response;
}
```

---

## Testing Strategy

### 1. Unit Tests

#### Test File: `__tests__/api/generate.test.ts`

```typescript
import { POST } from "@/app/api/generate/route";
import { NextRequest } from "next/server";

describe("/api/generate", () => {
  beforeEach(() => {
    // Setup test environment
    jest.clearAllMocks();
  });

  describe("Authentication", () => {
    it("should return 401 for unauthenticated requests", async () => {
      const request = new NextRequest("http://localhost/api/generate", {
        method: "POST",
        body: JSON.stringify({
          productImages: ["https://example.com/image.jpg"],
          style: "realistic",
          aspectRatio: "1:1",
          quality: "standard",
          model: "gpt-4.1-dalle-3",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.code).toBe("AUTHENTICATION_REQUIRED");
    });
  });

  describe("Validation", () => {
    it("should validate required product images", async () => {
      // Mock authenticated session
      jest
        .spyOn(require("next-auth/next"), "getServerSession")
        .mockResolvedValue({ user: { id: "user123" } });

      const request = new NextRequest("http://localhost/api/generate", {
        method: "POST",
        body: JSON.stringify({
          productImages: [], // Empty array should fail
          style: "realistic",
          aspectRatio: "1:1",
          quality: "standard",
          model: "gpt-4.1-dalle-3",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe("VALIDATION_ERROR");
      expect(data.validationErrors).toContainEqual({
        field: "productImages",
        message: "At least one product image is required",
      });
    });

    it("should validate image URL format", async () => {
      // Test invalid URLs, token validation, etc.
    });

    it("should validate token balance", async () => {
      // Test insufficient tokens scenario
    });
  });

  describe("Success Cases", () => {
    it("should create generation successfully", async () => {
      // Mock all dependencies
      jest
        .spyOn(require("next-auth/next"), "getServerSession")
        .mockResolvedValue({ user: { id: "user123" } });

      // Mock Convex calls
      const mockConvex = {
        query: jest.fn(),
        mutation: jest.fn(),
      };

      const request = new NextRequest("http://localhost/api/generate", {
        method: "POST",
        body: JSON.stringify({
          productImages: ["https://res.cloudinary.com/test/image.jpg"],
          style: "realistic",
          aspectRatio: "1:1",
          quality: "standard",
          model: "gpt-4.1-dalle-3",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty("_id");
      expect(data.data.status).toBe("pending");
    });
  });
});
```

### 2. Integration Tests

```typescript
describe("Generation API Integration", () => {
  it("should handle full generation flow", async () => {
    // Test complete flow from API call to database record creation
  });

  it("should integrate with Convex mutations", async () => {
    // Test Convex integration
  });

  it("should handle external service failures gracefully", async () => {
    // Test error scenarios
  });
});
```

### 3. Load Tests

```typescript
describe("Generation API Load Tests", () => {
  it("should handle concurrent requests", async () => {
    const requests = Array(10)
      .fill(null)
      .map(() =>
        fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validPayload),
        })
      );

    const responses = await Promise.all(requests);

    // Verify rate limiting and response times
    expect(responses.filter((r) => r.ok).length).toBeLessThanOrEqual(10);
  });
});
```

---

## Performance Optimization

### 1. Response Time Optimization

#### Async Operations

```typescript
// Parallelize independent operations
async function optimizedValidation(data: GenerateRequestBody, userId: string) {
  const [userValidation, imageValidation, queueCheck] =
    await Promise.allSettled([
      validateUserAndTokens(userId, data),
      validateImageUrls(data.productImages, data.modelImages),
      checkQueueCapacity(),
    ]);

  // Handle results
  if (userValidation.status === "rejected") {
    throw userValidation.reason;
  }
  if (imageValidation.status === "rejected") {
    throw imageValidation.reason;
  }
  if (queueCheck.status === "rejected") {
    throw queueCheck.reason;
  }

  return userValidation.value;
}
```

#### Caching Strategy

```typescript
// Cache user data to reduce database calls
const userCache = new Map<string, { user: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getCachedUser(userId: string) {
  const cached = userCache.get(userId);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.user;
  }

  const user = await convex.query(api.users.getUser, {
    userId: userId as Id<"users">,
  });

  userCache.set(userId, { user, timestamp: Date.now() });

  return user;
}
```

### 2. Memory Optimization

```typescript
// Limit request body size
const MAX_REQUEST_SIZE = 1024 * 1024; // 1MB

async function validateRequestSize(request: NextRequest) {
  const contentLength = request.headers.get("content-length");

  if (contentLength && parseInt(contentLength) > MAX_REQUEST_SIZE) {
    throw new APIError("Request too large", "REQUEST_TOO_LARGE", 413);
  }
}
```

### 3. Database Query Optimization

```typescript
// Optimize database queries with proper indexing
async function optimizedUserQuery(userId: string) {
  // Use indexed query for better performance
  return await convex.query(api.users.getUserWithTokenInfo, {
    userId: userId as Id<"users">,
  });
}
```

---

## Deployment Considerations

### 1. Environment Variables

```bash
# Required environment variables
NEXT_PUBLIC_CONVEX_URL=https://your-convex-deployment.convex.cloud
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=https://yourdomain.com

# Rate limiting configuration
RATE_LIMIT_ENABLED=true
MAX_REQUESTS_PER_HOUR=10
QUEUE_MAX_SIZE=50

# Feature flags
GENERATION_ENABLED=true
DEBUG_MODE=false
```

### 2. Monitoring and Logging

```typescript
// Add performance monitoring
async function monitoredHandler(request: NextRequest) {
  const startTime = Date.now();

  try {
    const result = await POST(request);

    // Log successful requests
    console.log({
      endpoint: "/api/generate",
      method: "POST",
      duration: Date.now() - startTime,
      status: result.status,
      timestamp: new Date().toISOString(),
    });

    return result;
  } catch (error) {
    // Log errors with context
    console.error({
      endpoint: "/api/generate",
      method: "POST",
      duration: Date.now() - startTime,
      error: error.message,
      timestamp: new Date().toISOString(),
    });

    throw error;
  }
}
```

### 3. Health Checks

```typescript
// Add endpoint health check
export async function GET() {
  try {
    // Verify database connectivity
    await convex.query(api.health.ping);

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
```

---

## Migration and Rollback Strategy

### 1. Gradual Rollout

```typescript
// Feature flag for gradual rollout
const FEATURE_FLAGS = {
  newGenerationEndpoint: process.env.NEW_GENERATION_ENDPOINT === "true",
  enhancedValidation: process.env.ENHANCED_VALIDATION === "true",
};

export async function POST(request: NextRequest) {
  if (!FEATURE_FLAGS.newGenerationEndpoint) {
    return NextResponse.json(
      { error: "Endpoint not available" },
      { status: 503 }
    );
  }

  // Continue with implementation
}
```

### 2. Backward Compatibility

```typescript
// Support both old and new request formats during migration
function normalizeRequest(body: any): GenerateRequestBody {
  // Handle legacy format
  if (body.productImage && !body.productImages) {
    body.productImages = [body.productImage];
  }

  if (body.modelImage && !body.modelImages) {
    body.modelImages = [body.modelImage];
  }

  return body;
}
```

### 3. Rollback Plan

```typescript
// Circuit breaker pattern for quick rollback
class CircuitBreaker {
  private failures = 0;
  private lastFailTime = 0;
  private state: "closed" | "open" | "half-open" = "closed";

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      if (Date.now() - this.lastFailTime > 60000) {
        // 1 minute
        this.state = "half-open";
      } else {
        throw new Error("Circuit breaker is open");
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = "closed";
  }

  private onFailure() {
    this.failures++;
    this.lastFailTime = Date.now();

    if (this.failures >= 5) {
      this.state = "open";
    }
  }
}
```

---

## Conclusion

This comprehensive implementation plan provides a robust foundation for the generation form submission endpoint. The plan emphasizes:

1. **Security**: Authentication, validation, and input sanitization
2. **Reliability**: Error handling, rate limiting, and circuit breakers
3. **Performance**: Caching, parallel processing, and optimization
4. **Maintainability**: Clear structure, testing, and monitoring
5. **Scalability**: Queue management and resource optimization

The implementation should be done incrementally, with thorough testing at each step, and proper monitoring in place before production deployment.

---

## Next Steps

1. **Week 4**: Implement basic endpoint structure and validation
2. **Week 5**: Add AI integration and queue management
3. **Week 6**: Implement rate limiting and security features
4. **Week 7**: Add monitoring, logging, and performance optimization
5. **Week 8**: Production deployment with gradual rollout

This plan ensures a production-ready endpoint that can handle the expected load while maintaining security and reliability standards.

---

## Schema Updates Required

Before implementing this API endpoint, ensure the following Convex schema updates are applied:

### 1. Update Generations Table

The `generations` table needs to support multiple images:

```typescript
// In convex/schema.ts
generations: defineTable({
  // ...existing fields...

  // Backward compatibility fields
  productImageUrl: v.string(),
  modelImageUrl: v.optional(v.string()),
  resultImageUrl: v.optional(v.string()),

  // New multiple image support
  productImages: v.array(v.string()), // Array of product image URLs
  modelImages: v.optional(v.array(v.string())), // Array of model image URLs
  resultImages: v.optional(v.array(v.string())), // Array of generated image URLs

  // ...existing fields...
});
```

### 2. Update Files Table Metadata

The `files` table metadata needs to support image ordering:

```typescript
// In convex/schema.ts
metadata: v.optional(
  v.object({
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    format: v.optional(v.string()),
    generationId: v.optional(v.id("generations")),
    originalUrl: v.optional(v.string()),
    isPrimary: v.optional(v.boolean()),
    imageOrder: v.optional(v.number()), // NEW: Track image order
  })
),
```

### 3. Update Convex Functions

Ensure the following functions are updated in `convex/aiGenerations.ts`:

- `createEnhancedGeneration` - Now accepts `productImages` and `modelImages` arrays
- `updateFileMetadata` - Supports the new `imageOrder` metadata field

### 4. Migration Considerations

For existing generations:

- Old generations will continue to work with single image fields
- New generations will populate both single and multiple image fields
- Consider running a migration script to populate arrays from existing single images

---
