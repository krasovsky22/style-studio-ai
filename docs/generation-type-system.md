# Generation Type System & Workflow

This document explains the unified type system and workflow for AI generation in Style Studio AI.

## Overview

The generation system has been refactored to provide a clean, type-safe interface that combines prompt engineering and generation services into a single, easy-to-use workflow.

## Key Components

### 1. Type Definitions (`/src/types/generation.ts`)

#### Core Types

- **`GenerationOptions`** - Main input type for generation requests
- **`PromptResult`** - Output from prompt engineering process
- **`GenerationResult`** - Result from generation service
- **`GenerationStatus`** - Real-time status updates
- **`GenerationApiRequest`** - API endpoint request format
- **`GenerationApiResponse`** - API endpoint response format

#### Type Relationships

```typescript
GenerationApiRequest → GenerationOptions → PromptResult → GenerationResult
```

### 2. Unified Workflow (`/src/services/generation-workflow.ts`)

The `GenerationWorkflow` class provides a single interface for all generation operations:

```typescript
import { generationWorkflow } from "@/services/generation-workflow";

// Start complete generation
const result = await generationWorkflow.startGeneration(options);

// Generate prompt only
const prompt = generationWorkflow.generatePrompt(options);

// Monitor status
const status = await generationWorkflow.getStatus(replicateId);
```

### 3. Core Services

#### Prompt Engineering (`/src/lib/prompt-engineering.ts`)

- Analyzes product images
- Generates optimized AI prompts
- Handles style variations and quality settings

#### Generation Service (`/src/services/generation.ts`)

- Manages Replicate API interactions
- Validates inputs and handles errors
- Provides status tracking and polling

## Usage in API Routes

### Before (Complex)

```typescript
// OLD - Multiple imports and manual coordination
import { promptEngineer } from "@/lib/prompt-engineering";
import { generationService } from "@/services/generation";

const promptResult = promptEngineer.generatePrompt(options);
await generationService.startGeneration(promptResult); // Type mismatch!
```

### After (Simple)

```typescript
// NEW - Single import, unified workflow
import { generationWorkflow } from "@/services/generation-workflow";

const result = await generationWorkflow.startGeneration(options);
```

## Type Safety Benefits

1. **Input Validation** - `GenerationOptions` ensures all required fields
2. **API Consistency** - `GenerationApiRequest/Response` standardizes endpoints
3. **No Type Mismatches** - Services work together seamlessly
4. **IntelliSense Support** - Full TypeScript autocomplete and error checking

## Example Implementation

### API Route (`/src/app/api/generate/route.ts`)

```typescript
import { generationWorkflow } from "@/services/generation-workflow";
import { GenerationOptions } from "@/types/generation";

export async function POST(request: NextRequest) {
  // Validate request
  const validationResult = generationSchema.safeParse(await request.json());
  const options = validationResult.data as GenerationOptions;

  // Start generation (validation + prompt + generation)
  const result = await generationWorkflow.startGeneration(options);

  // Return structured response
  return NextResponse.json({
    generationId: generation,
    replicateId: result.replicateId,
    estimatedTime: result.estimatedTime,
    prompt: result.promptResult.prompt,
  });
}
```

### Frontend Component

```typescript
import { GenerationOptions } from "@/types/generation";

const handleSubmit = async (formData: FormData) => {
  const options: GenerationOptions = {
    productImageUrl: formData.productImage,
    modelImageUrl: formData.modelImage,
    style: formData.style,
    aspectRatio: formData.aspectRatio,
    quality: formData.quality,
    model: formData.model,
    customPrompt: formData.customPrompt,
  };

  const response = await fetch("/api/generate", {
    method: "POST",
    body: JSON.stringify(options),
  });
};
```

## Available Methods

### GenerationWorkflow Methods

- `startGeneration(options)` - Complete generation workflow
- `getStatus(replicateId)` - Check generation status
- `pollGeneration(replicateId, onUpdate?)` - Poll until completion
- `cancelGeneration(replicateId)` - Cancel running generation
- `retryGeneration(options, maxRetries?)` - Retry failed generation
- `estimateTokenCost(options)` - Calculate token cost
- `getAvailableModels()` - List available AI models
- `generatePrompt(options)` - Generate prompt only
- `validatePrompt(prompt)` - Validate prompt content

### Individual Service Access

You can still access individual services if needed:

```typescript
import { promptEngineer } from "@/lib/prompt-engineering";
import { generationService } from "@/services/generation";
```

## Error Handling

The unified workflow provides consistent error handling:

```typescript
try {
  const result = await generationWorkflow.startGeneration(options);
  // Handle success
} catch (error) {
  // All errors are properly typed and include context
  console.error("Generation failed:", error.message);
}
```

## Migration Guide

### Updating Existing Code

1. **Replace multiple imports** with single workflow import
2. **Use `startGeneration()`** instead of manual prompt + generation steps
3. **Update type imports** from `/types/generation`
4. **Simplify error handling** with unified try/catch

### Benefits of Migration

- ✅ Fewer imports and dependencies
- ✅ Type safety and IntelliSense
- ✅ Consistent error handling
- ✅ Easier testing and debugging
- ✅ Future-proof architecture

## Testing

Use the validation utilities in `/src/lib/type-validation.ts` to test type compatibility:

```typescript
import { validateTypeCompatibility } from "@/lib/type-validation";

// Ensures all types work together correctly
validateTypeCompatibility();
```

## Next Steps

This unified type system provides the foundation for:

- Batch generation operations
- Advanced error recovery
- Real-time status updates
- Queue management
- Performance monitoring

The architecture is designed to scale with future requirements while maintaining simplicity and type safety.
