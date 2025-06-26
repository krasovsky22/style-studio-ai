# Convex Configuration & Constants Reference - Style Studio AI

## Application Constants (`convex/constants.ts`)

### User Configuration

#### `USER_INITIAL_FREE_TOKENS = 10`

**Description**: Number of free tokens granted to new users upon registration.

**Usage**:

- Applied in `createUser()` and `createOrGetUser()` mutations
- Sets initial `tokenBalance` and `freeTokensGranted` values

### Style Presets

#### `STYLE_PRESETS`

**Description**: Predefined style configurations for AI image generation.

```typescript
{
  realistic: {
    name: "Realistic",
    prompt: "photorealistic, high quality, detailed",
    description: "Natural, lifelike appearance",
  },
  fashion: {
    name: "Fashion",
    prompt: "fashion photography, studio lighting, professional",
    description: "Professional fashion shoot style",
  },
  artistic: {
    name: "Artistic",
    prompt: "artistic, creative, stylized",
    description: "Creative and artistic interpretation",
  },
  vintage: {
    name: "Vintage",
    prompt: "vintage style, retro, classic",
    description: "Vintage and retro aesthetic",
  },
  minimalist: {
    name: "Minimalist",
    prompt: "minimalist, clean, simple",
    description: "Clean and minimal style",
  },
}
```

**Usage**: Frontend style selector components and prompt enhancement.

### Quality Settings

#### `QUALITY_SETTINGS`

**Description**: AI generation quality configurations affecting processing time and output quality.

```typescript
{
  draft: {
    name: "Draft",
    description: "Fast generation, lower quality",
    steps: 20,           // Inference steps
    guidance: 7.5,       // Guidance scale
  },
  standard: {
    name: "Standard",
    description: "Balanced quality and speed",
    steps: 30,
    guidance: 8.5,
  },
  high: {
    name: "High",
    description: "High quality, slower generation",
    steps: 50,
    guidance: 9.5,
  },
}
```

**Usage**:

- Quality selector in generation forms
- AI model parameter configuration
- Token cost calculation (higher quality = more tokens)

### File Upload Limits

#### `FILE_LIMITS`

**Description**: File upload restrictions and validation rules.

```typescript
{
  maxSize: 10 * 1024 * 1024,  // 10MB in bytes
  allowedTypes: [
    "image/jpeg",
    "image/png",
    "image/webp"
  ],
  allowedExtensions: [
    ".jpg",
    ".jpeg",
    ".png",
    ".webp"
  ],
}
```

**Usage**:

- Frontend file upload validation
- Backend file processing validation
- Error message generation

### Error Messages

#### `ERROR_MESSAGES`

**Description**: Standardized error messages for consistent user experience.

```typescript
{
  auth: {
    unauthorized: "You must be logged in to perform this action",
    forbidden: "You don't have permission to perform this action",
    invalidToken: "Invalid or expired authentication token",
  },
  user: {
    notFound: "User not found",
    emailExists: "User with this email already exists",
    invalidEmail: "Please provide a valid email address",
  },
  generation: {
    notFound: "Generation not found",
    limitExceeded: "You have exceeded your generation limit for this billing period",
    invalidParameters: "Invalid generation parameters provided",
    processingFailed: "Generation processing failed",
    maxRetriesExceeded: "Maximum retry attempts exceeded",
  },
  file: {
    notFound: "File not found",
    tooLarge: "File size exceeds the limit",
    invalidType: "File type not supported",
    uploadFailed: "File upload failed",
  },
  validation: {
    required: "This field is required",
    invalidFormat: "Invalid format",
    tooShort: "Value is too short",
    tooLong: "Value is too long",
  },
}
```

#### `SUCCESS_MESSAGES`

**Description**: Standardized success messages for user feedback.

```typescript
{
  user: {
    created: "Account created successfully",
    updated: "Profile updated successfully",
    deleted: "Account deleted successfully",
  },
  generation: {
    created: "Generation started successfully",
    completed: "Generation completed successfully",
    cancelled: "Generation cancelled successfully",
    retried: "Generation retry initiated",
  },
  file: {
    uploaded: "File uploaded successfully",
    deleted: "File deleted successfully",
  },
}
```

### Rate Limiting

#### `RATE_LIMITS`

**Description**: API rate limiting configurations by user tier.

```typescript
{
  generation: {
    free: { requests: 5, window: 60 * 60 * 1000 },      // 5 per hour
    basic: { requests: 10, window: 60 * 60 * 1000 },    // 10 per hour
    pro: { requests: 30, window: 60 * 60 * 1000 },      // 30 per hour
    enterprise: { requests: 100, window: 60 * 60 * 1000 }, // 100 per hour
  },
  api: {
    free: { requests: 100, window: 60 * 60 * 1000 },    // 100 per hour
    basic: { requests: 500, window: 60 * 60 * 1000 },   // 500 per hour
    pro: { requests: 2000, window: 60 * 60 * 1000 },    // 2000 per hour
    enterprise: { requests: 10000, window: 60 * 60 * 1000 }, // 10000 per hour
  },
}
```

**Properties**:

- `requests`: Maximum number of requests
- `window`: Time window in milliseconds

### Email Templates

#### `EMAIL_TEMPLATES`

**Description**: Email template configurations for automated notifications.

```typescript
{
  welcome: {
    subject: "Welcome to Style Studio AI!",
    template: "welcome",
  },
  generationCompleted: {
    subject: "Your generation is ready!",
    template: "generation-completed",
  },
  usageLimitWarning: {
    subject: "Usage Limit Warning",
    template: "usage-limit-warning",
  },
}
```

### Webhook Events

#### `WEBHOOK_EVENTS`

**Description**: External service webhook event identifiers.

```typescript
{
  stripe: {
    invoicePaymentSucceeded: "invoice.payment_succeeded",
    invoicePaymentFailed: "invoice.payment_failed",
  },
  replicate: {
    predictionStarted: "prediction.started",
    predictionCompleted: "prediction.completed",
    predictionFailed: "prediction.failed",
    predictionCancelled: "prediction.cancelled",
  },
}
```

**Usage**: Webhook endpoint routing and event handling.

### Caching Configuration

#### `CACHE_DURATIONS`

**Description**: Cache duration settings for different data types.

```typescript
{
  user: 5 * 60 * 1000,        // 5 minutes
  generation: 30 * 1000,      // 30 seconds
  analytics: 60 * 60 * 1000,  // 1 hour
}
```

**Usage**: Cache invalidation and refresh strategies.

### Feature Flags

#### `FEATURE_FLAGS`

**Description**: Feature availability by user tier and system configuration.

```typescript
{
  batchProcessing: {
    enabled: true,
    requiredTier: "pro",
  },
  apiAccess: {
    enabled: true,
    requiredTier: "pro",
  },
  advancedAnalytics: {
    enabled: true,
    requiredTier: "enterprise",
  },
  whiteLabel: {
    enabled: false,
    requiredTier: "enterprise",
  },
}
```

**Properties**:

- `enabled`: Global feature toggle
- `requiredTier`: Minimum user tier required

### Timeout Configuration

#### `TIMEOUTS`

**Description**: Timeout settings for various operations.

```typescript
{
  generation: 5 * 60 * 1000,  // 5 minutes for AI generation
  upload: 30 * 1000,          // 30 seconds for file uploads
  api: 10 * 1000,             // 10 seconds for API calls
}
```

## Schema Validation (`convex/schema.ts`)

### Data Type Definitions

#### String Fields

- `v.string()`: Basic string validation
- `v.optional(v.string())`: Optional string fields

#### Numeric Fields

- `v.number()`: Number validation (integers and floats)
- Timestamps use `v.number()` for Unix timestamps

#### ID References

- `v.id("tableName")`: Foreign key references
- `v.array(v.id("tableName"))`: Array of foreign keys

#### Union Types

- `v.union(v.literal("value1"), v.literal("value2"))`: Enumerated values
- Status fields use unions for state validation

#### Object Types

- `v.object({...})`: Structured data validation
- `v.optional(v.object({...}))`: Optional structured data

### Index Configurations

#### Single Field Indexes

```typescript
.index("by_email", ["email"])
.index("by_status", ["status"])
.index("by_timestamp", ["timestamp"])
```

#### Compound Indexes

```typescript
.index("by_user_and_status", ["userId", "status"])
.index("by_user_and_created_at", ["userId", "createdAt"])
```

#### Index Naming Convention

- `by_field`: Single field index
- `by_field1_and_field2`: Compound index
- Ordered by query frequency and selectivity

## Error Handling (`convex/utils.ts`)

### Error Creation Utility

#### `createError(message: string, code?: string)`

**Description**: Creates standardized ConvexError instances.

```typescript
// Basic error
throw createError("User not found");

// Error with code
throw createError("Insufficient tokens", "INSUFFICIENT_TOKENS");

// Error handling pattern
try {
  const result = await riskyOperation();
} catch (error) {
  throw createError(`Operation failed: ${error.message}`, "PROCESSING_ERROR");
}
```

### Standard Error Codes

#### Authentication Errors

- `UNAUTHORIZED`: User not authenticated
- `FORBIDDEN`: User lacks required permissions
- `INVALID_TOKEN`: Authentication token invalid/expired

#### Validation Errors

- `VALIDATION_ERROR`: Input validation failed
- `REQUIRED_FIELD`: Required field missing
- `INVALID_FORMAT`: Field format incorrect

#### Business Logic Errors

- `INSUFFICIENT_TOKENS`: Not enough tokens
- `GENERATION_LIMIT_EXCEEDED`: Rate limit exceeded
- `PROCESSING_FAILED`: AI generation failed

#### Resource Errors

- `NOT_FOUND`: Requested resource doesn't exist
- `ALREADY_EXISTS`: Resource creation conflict
- `FILE_TOO_LARGE`: File exceeds size limit

#### System Errors

- `INTERNAL_ERROR`: Unexpected system error
- `SERVICE_UNAVAILABLE`: External service unavailable
- `TIMEOUT`: Operation timeout

## Environment Configuration

### Required Environment Variables

#### Database Configuration

- `CONVEX_DEPLOYMENT`: Convex deployment URL
- `CONVEX_DEPLOY_KEY`: Deployment key for production

#### Authentication

- `AUTH0_DOMAIN`: Auth0 domain for OAuth
- `AUTH0_CLIENT_ID`: Auth0 client identifier
- `AUTH0_CLIENT_SECRET`: Auth0 client secret

#### External Services

- `OPENAI_API_KEY`: OpenAI API access key
- `REPLICATE_API_TOKEN`: Replicate.com API token
- `CLOUDINARY_CLOUD_NAME`: Cloudinary cloud name
- `CLOUDINARY_API_KEY`: Cloudinary API key
- `CLOUDINARY_API_SECRET`: Cloudinary API secret

#### Payment Processing

- `STRIPE_SECRET_KEY`: Stripe secret key
- `STRIPE_PUBLISHABLE_KEY`: Stripe publishable key
- `STRIPE_WEBHOOK_SECRET`: Stripe webhook secret

### Development vs Production

#### Development Settings

- Lower rate limits for testing
- Mock external services
- Verbose error messages
- Debug logging enabled

#### Production Settings

- Production rate limits
- Real external service integration
- User-friendly error messages
- Audit logging enabled

## Usage Patterns

### Constants in Frontend

```typescript
import { STYLE_PRESETS, QUALITY_SETTINGS } from "@/constants/generation";

// Style selector component
const styleOptions = Object.entries(STYLE_PRESETS).map(([key, preset]) => ({
  value: key,
  label: preset.name,
  description: preset.description,
}));

// Quality selector
const qualityOptions = Object.entries(QUALITY_SETTINGS).map(
  ([key, setting]) => ({
    value: key,
    label: setting.name,
    description: setting.description,
  })
);
```

### Error Handling in Components

```typescript
import { ERROR_MESSAGES } from "@/constants/messages";

try {
  await generateImage(params);
} catch (error) {
  const message =
    error.code === "INSUFFICIENT_TOKENS"
      ? ERROR_MESSAGES.generation.limitExceeded
      : ERROR_MESSAGES.generation.processingFailed;

  setError(message);
}
```

### Feature Flag Usage

```typescript
import { FEATURE_FLAGS } from "@/constants/features";

const canAccessAPI = user.tier === "pro" && FEATURE_FLAGS.apiAccess.enabled;
const showBatchUpload =
  user.tier !== "free" && FEATURE_FLAGS.batchProcessing.enabled;
```

This configuration reference provides comprehensive documentation of all constants, settings, and configuration patterns used throughout the Style Studio AI Convex backend.
