# Convex API Reference - Style Studio AI

## Overview

This document provides comprehensive documentation for the Convex backend API of Style Studio AI, an AI-powered image generation platform. The system manages users, AI image generations, file storage, token-based payments, and analytics.

## Database Schema

### Users Table

Stores user account information and token balance.

```typescript
users: {
  _id: Id<"users">
  email: string                    // User's email address (unique)
  name: string                     // Display name
  profileImage?: string            // Profile picture URL
  emailVerified?: number           // Email verification timestamp
  createdAt: number               // Account creation timestamp
  lastLoginAt: number             // Last login timestamp

  // Token System
  tokenBalance: number            // Current available tokens
  totalTokensPurchased: number    // Lifetime tokens purchased
  totalTokensUsed: number         // Lifetime tokens consumed
  freeTokensGranted: number       // Free tokens given to user

  // OAuth Integration
  externalId?: string             // External provider ID
  provider?: string               // OAuth provider ("google", "github", etc.)
}
```

**Indexes:**

- `by_email`: Find users by email address
- `by_external_id`: Find users by OAuth provider ID

### Generations Table

Manages AI image generation requests and results.

```typescript
generations: {
  _id: Id<"generations">
  userId: Id<"users">             // User who created the generation
  status: "pending" | "uploading" | "processing" | "completed" | "failed" | "cancelled"
  createdAt: number               // Generation start timestamp
  completedAt?: number            // Generation completion timestamp

  // Input Images (File References)
  productImageFiles?: Id<"files">[]  // Product images for generation
  modelImageFiles?: Id<"files">[]    // Model/reference images
  resultImageFiles?: Id<"files">[]   // Generated result images

  // Generation Configuration
  prompt: string                  // Text prompt for generation
  parameters: {
    model: string                 // AI model to use
    style?: string               // Style preset
    quality?: string             // Quality setting
    strength?: number            // Generation strength (0-1)
    aspectRatio?: string         // Image aspect ratio
    guidance_scale?: number      // Guidance scale for generation
    num_inference_steps?: number // Inference steps
    seed?: number                // Random seed for reproducibility
  }

  // Processing Information
  processingTime?: number         // Time taken in milliseconds
  tokensUsed: number             // Tokens consumed for this generation
  error?: string                 // Error message if failed
  retryCount: number             // Number of retry attempts

  // External Service Integration
  replicateId?: string           // Replicate.com prediction ID
  cloudinaryPublicId?: string    // Cloudinary image ID
}
```

**Indexes:**

- `by_user`: Get all generations for a user
- `by_status`: Query by generation status
- `by_created_at`: Order by creation time
- `by_user_and_status`: User-specific status queries
- `by_user_and_created_at`: User generations ordered by time

### Files Table

Manages file metadata for all uploaded and generated images.

```typescript
files: {
  _id: Id<"files">
  userId: Id<"users">             // File owner
  filename: string                // Original filename
  contentType: string             // MIME type
  size: number                    // File size in bytes
  storageId: string               // Convex storage ID
  uploadedAt: number              // Upload timestamp

  // File Classification
  category: "product_image" | "model_image" | "generated_image" | "profile_image"

  // Optional Metadata
  metadata?: {
    width?: number                // Image width in pixels
    height?: number               // Image height in pixels
    format?: string               // Image format (jpg, png, etc.)
    generationId?: Id<"generations"> // Associated generation
    originalUrl?: string          // Original Cloudinary URL
    isPrimary?: boolean           // Primary image flag
    imageOrder?: number           // Order in image array (0-based)
  }
}
```

**Indexes:**

- `by_user`: Get all files for a user
- `by_category`: Query by file category
- `by_storage_id`: Find file by Convex storage ID
- `by_uploaded_at`: Order by upload time

### Token Purchases Table

Tracks token purchase transactions and payment processing.

```typescript
tokenPurchases: {
  _id: Id<"tokenPurchases">
  userId: Id<"users">             // Purchaser
  amount: number                  // Amount paid in cents
  tokensReceived: number          // Tokens purchased
  status: "pending" | "completed" | "failed" | "refunded"
  createdAt: number               // Purchase initiation timestamp
  completedAt?: number            // Purchase completion timestamp

  // Payment Processing
  stripePaymentIntentId?: string  // Stripe payment intent ID
  transactionId: string           // Internal transaction ID
  paymentMethod?: string          // Payment method used

  // Package Information
  packageName: string             // Package identifier
  packageDisplayName: string      // Human-readable package name

  // Error Handling
  error?: string                  // Error message if failed
  refundReason?: string           // Reason for refund
}
```

**Indexes:**

- `by_user`: Get all purchases for a user
- `by_status`: Query by purchase status
- `by_created_at`: Order by creation time
- `by_stripe_payment_intent`: Find by Stripe payment ID
- `by_transaction_id`: Find by internal transaction ID
- `by_user_and_status`: User-specific status queries

### Usage Table

Analytics and activity tracking for all user actions.

```typescript
usage: {
  _id: Id<"usage">
  userId: Id<"users">             // User who performed the action
  action: "generation_started" | "generation_completed" | "generation_failed" |
          "image_uploaded" | "image_downloaded" | "tokens_purchased" |
          "login" | "logout"
  timestamp: number               // Action timestamp

  // Additional Context
  metadata?: {
    generationId?: Id<"generations">
    tokenPurchaseId?: Id<"tokenPurchases">
    tokensUsed?: number
    tokensReceived?: number
    errorMessage?: string
    processingTime?: number
    modelUsed?: string
    imageSize?: string
    userAgent?: string
    reason?: string
  }

  // Session Information
  ipAddress?: string              // User's IP address
  sessionId?: string              // Session identifier
}
```

**Indexes:**

- `by_user`: Get all actions for a user
- `by_action`: Query by action type
- `by_timestamp`: Order by timestamp
- `by_user_and_action`: User-specific action queries
- `by_user_and_timestamp`: User actions ordered by time

## API Methods

### Authentication (`convex/auth.ts`)

#### `getCurrentUser(ctx)`

Retrieves the currently authenticated user.

```typescript
// Returns the user document or null if not authenticated
const user = await getCurrentUser(ctx);
```

#### `getCurrentUserOrThrow(ctx)`

Gets the current user or throws an error if not authenticated.

```typescript
// Throws error if user not found
const user = await getCurrentUserOrThrow(ctx);
```

#### `requireTokens(ctx, tokensRequired)`

Validates that the current user has sufficient tokens.

```typescript
// Throws error if insufficient tokens
const user = await requireTokens(ctx, 5);
```

#### `createOrUpdateUserFromAuth(ctx)`

Creates or updates user from authentication identity (OAuth).

```typescript
// Returns user ID
const userId = await createOrUpdateUserFromAuth(ctx);
```

### User Management (`convex/users.ts`)

#### `createUser(args)`

Creates a new user account.

```typescript
const userId = await ctx.runMutation(api.users.createUser, {
  email: "user@example.com",
  name: "John Doe",
  profileImage: "https://example.com/avatar.jpg", // optional
  externalId: "oauth_user_id", // optional
  provider: "google", // optional
});
```

#### `getUserById(args)`

Retrieves user by ID.

```typescript
const user = await ctx.runQuery(api.users.getUserById, {
  userId: "user_id",
});
```

#### `getUserByEmail(args)`

Finds user by email address.

```typescript
const user = await ctx.runQuery(api.users.getUserByEmail, {
  email: "user@example.com",
});
```

#### `updateUser(args)`

Updates user profile information.

```typescript
const user = await ctx.runMutation(api.users.updateUser, {
  userId: "user_id",
  updates: {
    name: "New Name",
    profileImage: "https://example.com/new-avatar.jpg",
  },
});
```

#### `getUserStats(args)`

Gets user statistics including generation counts and success rate.

```typescript
const stats = await ctx.runQuery(api.users.getUserStats, {
  email: "user@example.com",
});
```

### Generation Management (`convex/generations.ts`)

#### `startGeneration(args)`

Initiates a new AI image generation.

```typescript
const generationId = await ctx.runMutation(api.generations.startGeneration, {
  userId: "user_id",
  productImageFiles: ["file_id_1", "file_id_2"],
  modelImageFiles: ["file_id_3"], // optional
  prompt: "A professional model wearing the product",
  negativePrompt: "blurry, low quality", // optional
  parameters: {
    model: "stable-diffusion-xl",
    style: "fashion",
    quality: "high",
    aspectRatio: "16:9",
    seed: 12345,
  },
  estimatedTokenCost: 1,
});
```

#### `updateGenerationStatus(args)`

Updates the status and results of a generation.

```typescript
const generationId = await ctx.runMutation(
  api.generations.updateGenerationStatus,
  {
    generationId: "gen_id",
    status: "completed",
    resultImageFiles: ["result_file_id_1", "result_file_id_2"],
    cloudinaryPublicId: "cloudinary_id",
  }
);
```

#### `getGeneration(args)`

Retrieves a generation by ID.

```typescript
const generation = await ctx.runQuery(api.generations.getGeneration, {
  id: "generation_id",
});
```

#### `getUserGenerations(args)`

Gets user's generations with optional filtering and pagination.

```typescript
const generations = await ctx.runQuery(api.generations.getUserGenerations, {
  userId: "user_id",
  limit: 20,
  status: "completed", // optional filter
});
```

#### `getUserGenerationsWithFiles(args)`

Gets user generations with associated file details.

```typescript
const generationsWithFiles = await ctx.runQuery(
  api.generations.getUserGenerationsWithFiles,
  {
    userId: "user_id",
    limit: 10,
    status: "completed",
  }
);
```

### File Management (`convex/files.ts`)

#### `storeFileMetadata(args)`

Stores metadata for an uploaded file.

```typescript
const fileId = await ctx.runMutation(api.files.storeFileMetadata, {
  userId: "user_id",
  filename: "product.jpg",
  contentType: "image/jpeg",
  size: 1024000,
  storageId: "convex_storage_id",
  category: "product_image",
  metadata: {
    width: 1920,
    height: 1080,
    format: "jpeg",
  },
});
```

#### `getFile(args)`

Retrieves file metadata by ID.

```typescript
const file = await ctx.runQuery(api.files.getFile, {
  fileId: "file_id",
});
```

#### `getUserFiles(args)`

Gets user's files with optional category filtering.

```typescript
const files = await ctx.runQuery(api.files.getUserFiles, {
  userId: "user_id",
  category: "generated_image", // optional
  limit: 50,
});
```

#### `deleteFile(args)`

Deletes a file and its metadata.

```typescript
const result = await ctx.runMutation(api.files.deleteFile, {
  fileId: "file_id",
});
```

#### `getGenerationImages(args)`

Gets all images associated with a generation.

```typescript
const images = await ctx.runQuery(api.files.getGenerationImages, {
  generationId: "generation_id",
});
```

### Token Management (`convex/tokens.ts`)

#### `createTokenPurchase(args)`

Initiates a new token purchase.

```typescript
const purchaseId = await ctx.runMutation(api.tokens.createTokenPurchase, {
  userId: "user_id",
  amount: 999, // $9.99 in cents
  tokensReceived: 100,
  packageName: "standard",
  packageDisplayName: "Standard Pack",
  paymentMethod: "card",
});
```

#### `completeTokenPurchase(args)`

Completes a token purchase after successful payment.

```typescript
const purchaseId = await ctx.runMutation(api.tokens.completeTokenPurchase, {
  purchaseId: "purchase_id",
  stripePaymentIntentId: "pi_stripe_id",
});
```

#### `deductTokens(args)`

Deducts tokens from user balance (atomic operation).

```typescript
const newBalance = await ctx.runMutation(api.tokens.deductTokens, {
  userId: "user_id",
  amount: 1,
  reason: "AI image generation",
  generationId: "generation_id",
});
```

#### `addTokens(args)`

Adds tokens to user balance (for refunds).

```typescript
const newBalance = await ctx.runMutation(api.tokens.addTokens, {
  userId: "user_id",
  amount: 1,
  reason: "Generation failed",
  generationId: "generation_id",
});
```

#### `getUserTokenPurchases(args)`

Gets user's token purchase history.

```typescript
const purchases = await ctx.runQuery(api.tokens.getUserTokenPurchases, {
  userId: "user_id",
  limit: 20,
});
```

### Usage Analytics (`convex/usage.ts`)

#### `logUserAction(args)`

Logs a user action for analytics.

```typescript
const usageId = await ctx.runMutation(api.usage.logUserAction, {
  userId: "user_id",
  action: "generation_completed",
  metadata: {
    generationId: "generation_id",
    tokensUsed: 1,
    processingTime: 5000,
    modelUsed: "stable-diffusion-xl",
  },
  ipAddress: "192.168.1.1",
  sessionId: "session_123",
});
```

#### `getUserUsageHistory(args)`

Gets user's action history.

```typescript
const history = await ctx.runQuery(api.usage.getUserUsageHistory, {
  userId: "user_id",
  limit: 100,
  action: "generation_completed", // optional filter
});
```

## Constants and Configuration

### Default Values (`convex/constants.ts`)

- **USER_INITIAL_FREE_TOKENS**: 10 free tokens for new users
- **STYLE_PRESETS**: Available style presets (realistic, fashion, artistic, vintage, minimalist)
- **QUALITY_SETTINGS**: Quality configurations (draft, standard, high)
- **FILE_LIMITS**: Upload limits (10MB max, JPEG/PNG/WebP only)

### Error Handling

All mutations use standardized error handling through `createError()` utility:

```typescript
throw createError("Insufficient tokens", "INSUFFICIENT_TOKENS");
```

Common error codes:

- `UNAUTHORIZED`: Authentication required
- `INSUFFICIENT_TOKENS`: Not enough tokens
- `NOT_FOUND`: Resource not found
- `VALIDATION_ERROR`: Invalid input data
- `PROCESSING_ERROR`: Generation processing failed

## Usage Patterns

### Typical Generation Flow

1. **User Authentication**: Verify user with `getCurrentUserOrThrow()`
2. **Token Validation**: Check token balance with `requireTokens()`
3. **File Upload**: Store input images with `storeFileMetadata()`
4. **Start Generation**: Create generation with `startGeneration()`
5. **Process**: Update status as generation progresses
6. **Complete**: Store results and update status to "completed"
7. **Analytics**: Log completion with `logUserAction()`

### File Management

- Files are stored using Convex's built-in file storage
- Metadata is tracked separately in the `files` table
- Images are categorized by purpose (product, model, generated, profile)
- Generated images can be ordered and marked as primary

### Token Economy

- Users start with free tokens
- Tokens are deducted atomically before generation
- Failed generations refund tokens
- Purchase history is tracked for billing
- Usage analytics help optimize token costs

This documentation provides the foundation for AI agents to understand and interact with the Style Studio AI Convex backend effectively.
