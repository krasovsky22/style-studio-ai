# Convex API Methods Reference - Style Studio AI

## Authentication Methods (`convex/auth.ts`)

### Core Authentication Functions

#### `getCurrentUser(ctx: QueryCtx | MutationCtx): Promise<Doc<"users"> | null>`

**Description**: Retrieves the currently authenticated user from the context.

**Parameters**:

- `ctx`: Convex query or mutation context

**Returns**: User document or null if not authenticated

**Implementation Details**:

- First attempts to find user by external ID (OAuth)
- Falls back to email lookup if external ID not found
- Returns null for unauthenticated requests

```typescript
const user = await getCurrentUser(ctx);
if (user) {
  console.log(`User: ${user.name} (${user.email})`);
}
```

#### `getCurrentUserOrThrow(ctx: QueryCtx | MutationCtx): Promise<Doc<"users">>`

**Description**: Gets the current user or throws an authentication error.

**Parameters**:

- `ctx`: Convex query or mutation context

**Returns**: User document (guaranteed non-null)

**Throws**: ConvexError with code "UNAUTHORIZED" if not authenticated

```typescript
try {
  const user = await getCurrentUserOrThrow(ctx);
  // User is guaranteed to exist
} catch (error) {
  // Handle authentication error
}
```

#### `requireTokens(ctx: QueryCtx | MutationCtx, tokensRequired: number = 1): Promise<Doc<"users">>`

**Description**: Validates that the current user has sufficient tokens.

**Parameters**:

- `ctx`: Convex query or mutation context
- `tokensRequired`: Number of tokens required (default: 1)

**Returns**: User document if tokens are sufficient

**Throws**:

- ConvexError "UNAUTHORIZED" if not authenticated
- ConvexError "INSUFFICIENT_TOKENS" if token balance too low

```typescript
const user = await requireTokens(ctx, 5);
// User has at least 5 tokens available
```

#### `createOrUpdateUserFromAuth(ctx: MutationCtx): Promise<Id<"users">>`

**Description**: Creates new user or updates existing user from OAuth identity.

**Parameters**:

- `ctx`: Convex mutation context

**Returns**: User ID

**Throws**:

- ConvexError "NO_IDENTITY" if no auth identity found
- ConvexError "EMAIL_REQUIRED" for new users without email

**Side Effects**:

- Creates new user with 5 free tokens if not exists
- Updates lastLoginAt timestamp
- Logs login action to usage table

## User Management (`convex/users.ts`)

### Mutations

#### `createUser(args: CreateUserArgs): Promise<Id<"users">>`

**Description**: Creates a new user account with initial token balance.

**Parameters**:

```typescript
{
  email: string;           // User's email address
  name: string;            // Display name
  profileImage?: string;   // Profile picture URL
  externalId?: string;     // OAuth provider ID
  provider?: string;       // OAuth provider name
}
```

**Returns**: New user ID

**Side Effects**:

- Grants initial free tokens (USER_INITIAL_FREE_TOKENS)
- Auto-verifies email for OAuth users
- Logs user creation action

**Validation**:

- Throws error if email already exists
- Email format validation through Convex schema

#### `updateUser(args: UpdateUserArgs): Promise<Doc<"users"> | null>`

**Description**: Updates user profile information.

**Parameters**:

```typescript
{
  userId: Id<"users">;
  updates: {
    name?: string;
    profileImage?: string;
    emailVerified?: number;
  };
}
```

**Returns**: Updated user document

#### `createOrGetUser(args: CreateOrGetUserArgs): Promise<Id<"users">>`

**Description**: OAuth-friendly user creation that handles existing users.

**Parameters**: Same as createUser

**Returns**: User ID (existing or newly created)

**Behavior**:

- Updates existing user's OAuth info and login time
- Creates new user if email not found
- Always logs login action

### Queries

#### `getUserById(args: { userId: Id<"users"> }): Promise<Doc<"users"> | null>`

**Description**: Retrieves user by ID.

#### `getUserByEmail(args: { email: string }): Promise<Doc<"users"> | null>`

**Description**: Finds user by email address.

#### `getUserStats(args: { email: string }): Promise<UserStats | null>`

**Description**: Calculates user statistics including generation metrics.

**Returns**:

```typescript
{
  totalGenerations: number; // All-time generation count
  successfulGenerations: number; // Completed generations
  monthlyGenerations: number; // This month's generations
  successRate: number; // Success rate percentage
}
```

## Generation Management (`convex/generations.ts`)

### Core Generation Methods

#### `startGeneration(args: StartGenerationArgs): Promise<Id<"generations">>`

**Description**: Initiates a new AI image generation with token validation.

**Parameters**:

```typescript
{
  userId: Id<"users">;
  productImageFiles: Id<"files">[];      // Required product images
  modelImageFiles?: Id<"files">[];       // Optional model images
  prompt: string;                        // Generation prompt
  negativePrompt?: string;               // Negative prompt
  parameters: {
    model: string;                       // AI model identifier
    style: string;                       // Style preset
    quality: string;                     // Quality setting
    aspectRatio: string;                 // Image aspect ratio
    seed?: number;                       // Random seed
  };
  estimatedTokenCost: number;            // Expected token cost
}
```

**Returns**: Generation ID

**Validation**:

- Verifies user exists and has sufficient tokens
- Validates file ownership and existence
- Checks file categories match expected types

**Side Effects**:

- Creates generation record with "pending" status
- Logs generation start action
- Does NOT deduct tokens (done separately)

#### `updateGenerationStatus(args: UpdateStatusArgs): Promise<Id<"generations">>`

**Description**: Updates generation status and handles completion/failure.

**Parameters**:

```typescript
{
  generationId: Id<"generations">;
  status: "processing" | "uploading" | "completed" | "failed" | "cancelled";
  resultImageFiles?: Id<"files">[];     // Result images for completion
  error?: string;                       // Error message for failures
  cloudinaryPublicId?: string;          // External service ID
}
```

**Returns**: Generation ID

**Side Effects**:

- Updates generation status and completion time
- Handles token deduction/refund based on outcome
- Logs completion/failure action
- Records processing time for completed generations

#### `createEnhancedGeneration(args: EnhancedGenerationArgs): Promise<Id<"generations">>`

**Description**: Advanced generation creation with detailed parameters.

**Parameters**: Extended parameter set with additional AI model controls:

```typescript
{
  // ... basic parameters ...
  parameters: {
    model: string;
    style?: string;
    quality?: string;
    strength?: number;              // Generation strength (0-1)
    aspectRatio?: string;
    guidance_scale?: number;        // AI guidance parameter
    num_inference_steps?: number;   // AI inference steps
    seed?: number;
  };
  tokensUsed: number;              // Actual tokens consumed
}
```

### Query Methods

#### `getGeneration(args: { id: Id<"generations"> }): Promise<Doc<"generations"> | null>`

**Description**: Retrieves generation by ID.

#### `getUserGenerations(args: GetUserGenerationsArgs): Promise<Doc<"generations">[]>`

**Description**: Gets user's generations with pagination and filtering.

**Parameters**:

```typescript
{
  userId: Id<"users">;
  limit?: number;           // Max results (default: 20)
  status?: GenerationStatus; // Optional status filter
}
```

**Returns**: Array of generation documents ordered by creation time (desc)

#### `getUserGenerationsWithFiles(args: GetUserGenerationsArgs): Promise<GenerationWithFiles[]>`

**Description**: Gets generations with populated file details.

**Returns**: Generations with resolved file metadata for easier frontend consumption

## File Management (`convex/files.ts`)

### File Storage Methods

#### `storeFileMetadata(args: StoreFileArgs): Promise<Id<"files">>`

**Description**: Stores metadata for uploaded files.

**Parameters**:

```typescript
{
  userId: Id<"users">;
  filename: string;
  contentType: string;        // MIME type
  size: number;              // File size in bytes
  storageId: string;         // Convex storage ID
  category: FileCategory;    // File classification
  metadata?: {
    width?: number;
    height?: number;
    format?: string;
    generationId?: Id<"generations">;
    originalUrl?: string;    // Cloudinary URL
    isPrimary?: boolean;     // Primary image flag
    imageOrder?: number;     // Order in result set
  };
}
```

**Returns**: File ID

**Side Effects**:

- Logs image upload action
- Validates file size and type through schema

#### `storeGenerationFileMetadata(args: GenerationFileArgs): Promise<Id<"files">>`

**Description**: Enhanced file storage specifically for generation results.

**Additional Features**:

- Associates file with specific generation
- Handles image ordering and primary selection
- Optimized for batch result storage

### File Retrieval Methods

#### `getFile(args: { fileId: Id<"files"> }): Promise<Doc<"files"> | null>`

**Description**: Retrieves single file metadata.

#### `getFilesByIds(args: { ids: Id<"files">[] }): Promise<(Doc<"files"> | null)[]>`

**Description**: Batch retrieval of multiple files.

#### `getUserFiles(args: GetUserFilesArgs): Promise<Doc<"files">[]>`

**Description**: Gets user's files with optional filtering.

**Parameters**:

```typescript
{
  userId: Id<"users">;
  category?: FileCategory;   // Optional category filter
  limit?: number;           // Max results (default: 50)
}
```

#### `getGenerationImages(args: { generationId: Id<"generations"> }): Promise<Doc<"files">[]>`

**Description**: Gets all images associated with a generation.

#### `getGenerationImagesOrdered(args: { generationId: Id<"generations"> }): Promise<Doc<"files">[]>`

**Description**: Gets generation images in proper display order.

**Returns**: Files sorted by imageOrder metadata field

### File Management Methods

#### `deleteFile(args: { fileId: Id<"files"> }): Promise<{ storageId: string }>`

**Description**: Deletes file metadata (storage cleanup handled separately).

**Returns**: Storage ID for external cleanup

#### `getUserStorageUsage(args: { userId: Id<"users"> }): Promise<StorageUsage>`

**Description**: Calculates user's storage usage statistics.

**Returns**:

```typescript
{
  totalFiles: number;
  totalSize: number;
  byCategory: {
    product_image: {
      count: number;
      size: number;
    }
    model_image: {
      count: number;
      size: number;
    }
    generated_image: {
      count: number;
      size: number;
    }
    profile_image: {
      count: number;
      size: number;
    }
  }
}
```

## Token Management (`convex/tokens.ts`)

### Purchase Management

#### `createTokenPurchase(args: CreatePurchaseArgs): Promise<Id<"tokenPurchases">>`

**Description**: Initiates a new token purchase transaction.

**Parameters**:

```typescript
{
  userId: Id<"users">;
  amount: number;              // Amount in cents
  tokensReceived: number;      // Tokens to receive
  packageName: string;         // Package identifier
  packageDisplayName: string;  // Human-readable name
  paymentMethod?: string;      // Payment method
}
```

**Returns**: Purchase ID

**Side Effects**:

- Creates purchase with "pending" status
- Generates unique transaction ID
- Logs purchase initiation

#### `completeTokenPurchase(args: CompletePurchaseArgs): Promise<Id<"tokenPurchases">>`

**Description**: Completes purchase after successful payment.

**Parameters**:

```typescript
{
  purchaseId: Id<"tokenPurchases">;
  stripePaymentIntentId?: string;
}
```

**Side Effects**:

- Updates purchase status to "completed"
- Adds tokens to user balance
- Updates totalTokensPurchased
- Atomic operation for consistency

#### `failTokenPurchase(args: FailPurchaseArgs): Promise<Id<"tokenPurchases">>`

**Description**: Marks purchase as failed with error message.

### Token Operations

#### `deductTokens(args: DeductTokensArgs): Promise<number>`

**Description**: Atomically deducts tokens from user balance.

**Parameters**:

```typescript
{
  userId: Id<"users">;
  amount: number;
  reason: string;
  generationId: Id<"generations">;
}
```

**Returns**: New token balance

**Validation**:

- Throws error if insufficient balance
- Ensures atomic operation

#### `addTokens(args: AddTokensArgs): Promise<number>`

**Description**: Adds tokens back to user balance (for refunds).

**Use Cases**:

- Failed generation refunds
- Manual token grants
- Processing error compensation

#### `grantFreeTokens(args: GrantTokensArgs): Promise<Id<"users">>`

**Description**: Admin function to grant free tokens.

**Parameters**:

```typescript
{
  userId: Id<"users">;
  tokens: number;
  reason?: string;
}
```

**Side Effects**:

- Updates token balance and freeTokensGranted
- Logs token grant action

### Purchase Queries

#### `getUserTokenPurchases(args: GetPurchasesArgs): Promise<Doc<"tokenPurchases">[]>`

**Description**: Gets user's purchase history with pagination.

## Usage Analytics (`convex/usage.ts`)

### Action Logging

#### `logUserAction(args: LogActionArgs): Promise<Id<"usage">>`

**Description**: Records user actions for analytics and auditing.

**Parameters**:

```typescript
{
  userId: Id<"users">;
  action: UserAction;          // Action type
  metadata?: {
    generationId?: Id<"generations">;
    tokenPurchaseId?: Id<"tokenPurchases">;
    tokensUsed?: number;
    tokensReceived?: number;
    errorMessage?: string;
    processingTime?: number;
    modelUsed?: string;
    imageSize?: string;
    userAgent?: string;
    reason?: string;
    transactionType?: "debit" | "credit";
    balanceAfter?: number;
    refund?: boolean;
  };
  ipAddress?: string;
  sessionId?: string;
}
```

**Action Types**:

- `generation_started`
- `generation_completed`
- `generation_failed`
- `image_uploaded`
- `image_downloaded`
- `tokens_purchased`
- `login`
- `logout`

### Usage Queries

#### `getUserUsageHistory(args: GetUsageArgs): Promise<Doc<"usage">[]>`

**Description**: Retrieves user's action history with filtering.

**Parameters**:

```typescript
{
  userId: Id<"users">;
  limit?: number;           // Max results (default: 50)
  action?: UserAction;      // Optional action filter
}
```

**Returns**: Usage records ordered by timestamp (desc)

## Error Handling

### Standard Error Patterns

All Convex functions use standardized error handling:

```typescript
import { createError } from "./utils";

// Authentication errors
throw createError("Authentication required", "UNAUTHORIZED");

// Validation errors
throw createError("Invalid email format", "VALIDATION_ERROR");

// Business logic errors
throw createError("Insufficient tokens", "INSUFFICIENT_TOKENS");

// Resource errors
throw createError("Generation not found", "NOT_FOUND");
```

### Common Error Codes

- `UNAUTHORIZED`: Authentication required
- `INSUFFICIENT_TOKENS`: Not enough tokens for operation
- `NOT_FOUND`: Requested resource doesn't exist
- `VALIDATION_ERROR`: Input validation failed
- `PROCESSING_ERROR`: External service or processing error
- `DUPLICATE_ERROR`: Resource already exists
- `RATE_LIMITED`: Too many requests

### Error Recovery Patterns

1. **Token Deduction**: Automatically refund on generation failure
2. **File Cleanup**: Handle orphaned files from failed operations
3. **Status Recovery**: Provide retry mechanisms for transient failures
4. **User Notification**: Log errors for user feedback

This comprehensive API reference provides detailed documentation for all Convex methods used in Style Studio AI, enabling AI agents to understand and interact with the system effectively.
