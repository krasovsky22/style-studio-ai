# AI Agent Integration Guide - Style Studio AI Convex Backend

## Overview for AI Agents

This guide provides AI agents with practical patterns and workflows for interacting with the Style Studio AI Convex backend. It focuses on common use cases, error handling, and best practices for automated systems.

## Authentication Patterns

### User Context Resolution

```typescript
// Always start with user resolution
const user = await getCurrentUserOrThrow(ctx);

// For operations requiring tokens
const user = await requireTokens(ctx, estimatedCost);

// For OAuth-based operations
const userId = await createOrUpdateUserFromAuth(ctx);
```

### Session Management

```typescript
// Track user sessions for analytics
await logUserAction(ctx.runMutation, {
  userId: user._id,
  action: "login",
  sessionId: generateSessionId(),
  ipAddress: getClientIP(),
  metadata: {
    userAgent: request.headers["user-agent"],
  },
});
```

## Image Generation Workflows

### Complete Generation Process

```typescript
async function executeImageGeneration(ctx, params) {
  // 1. User Authentication & Token Validation
  const user = await requireTokens(ctx, params.estimatedTokenCost);

  // 2. File Validation
  const productFiles = await validateFiles(
    ctx,
    params.productImageFiles,
    user._id
  );
  const modelFiles = params.modelImageFiles
    ? await validateFiles(ctx, params.modelImageFiles, user._id)
    : [];

  // 3. Create Generation Record
  const generationId = await ctx.runMutation(api.generations.startGeneration, {
    userId: user._id,
    productImageFiles: params.productImageFiles,
    modelImageFiles: params.modelImageFiles,
    prompt: enhancePrompt(params.prompt, params.style),
    parameters: {
      model: params.model || "stable-diffusion-xl",
      style: params.style || "realistic",
      quality: params.quality || "standard",
      aspectRatio: params.aspectRatio || "1:1",
      ...params.parameters,
    },
    estimatedTokenCost: params.estimatedTokenCost,
  });

  // 4. Deduct Tokens
  await ctx.runMutation(api.tokens.deductTokens, {
    userId: user._id,
    amount: params.estimatedTokenCost,
    reason: "AI image generation",
    generationId,
  });

  // 5. Start Processing
  await ctx.runMutation(api.generations.updateGenerationStatus, {
    generationId,
    status: "processing",
  });

  return generationId;
}

async function validateFiles(ctx, fileIds, userId) {
  const files = await Promise.all(
    fileIds.map((id) => ctx.runQuery(api.files.getFile, { fileId: id }))
  );

  // Validate file ownership and existence
  for (const file of files) {
    if (!file) throw createError("File not found", "NOT_FOUND");
    if (file.userId !== userId)
      throw createError("File access denied", "FORBIDDEN");
  }

  return files;
}

function enhancePrompt(basePrompt, style) {
  const stylePreset = STYLE_PRESETS[style];
  return `${basePrompt}, ${stylePreset?.prompt || ""}`;
}
```

### Generation Status Updates

```typescript
async function updateGenerationProgress(
  ctx,
  generationId,
  status,
  additionalData = {}
) {
  const updateArgs = {
    generationId,
    status,
    ...additionalData,
  };

  try {
    await ctx.runMutation(api.generations.updateGenerationStatus, updateArgs);

    // Log status change
    const generation = await ctx.runQuery(api.generations.getGeneration, {
      id: generationId,
    });
    if (generation) {
      await ctx.runMutation(api.usage.logUserAction, {
        userId: generation.userId,
        action:
          status === "completed" ? "generation_completed" : "generation_failed",
        metadata: {
          generationId,
          processingTime: additionalData.processingTime,
          errorMessage: additionalData.error,
        },
      });
    }
  } catch (error) {
    console.error(`Failed to update generation ${generationId}:`, error);
    throw error;
  }
}

// Usage examples
await updateGenerationProgress(ctx, generationId, "processing");
await updateGenerationProgress(ctx, generationId, "completed", {
  resultImageFiles: resultFileIds,
  processingTime: 5000,
});
await updateGenerationProgress(ctx, generationId, "failed", {
  error: "AI service unavailable",
});
```

### File Upload and Management

```typescript
async function handleFileUpload(ctx, uploadData) {
  // 1. Validate file
  if (uploadData.size > FILE_LIMITS.maxSize) {
    throw createError(ERROR_MESSAGES.file.tooLarge, "FILE_TOO_LARGE");
  }

  if (!FILE_LIMITS.allowedTypes.includes(uploadData.contentType)) {
    throw createError(ERROR_MESSAGES.file.invalidType, "INVALID_FILE_TYPE");
  }

  // 2. Get user
  const user = await getCurrentUserOrThrow(ctx);

  // 3. Store file metadata
  const fileId = await ctx.runMutation(api.files.storeFileMetadata, {
    userId: user._id,
    filename: uploadData.filename,
    contentType: uploadData.contentType,
    size: uploadData.size,
    storageId: uploadData.storageId,
    category: uploadData.category,
    metadata: {
      width: uploadData.width,
      height: uploadData.height,
      format: uploadData.format,
    },
  });

  return fileId;
}

async function storeGenerationResults(ctx, generationId, resultImages) {
  const generation = await ctx.runQuery(api.generations.getGeneration, {
    id: generationId,
  });
  if (!generation) throw createError("Generation not found", "NOT_FOUND");

  const fileIds = [];

  for (let i = 0; i < resultImages.length; i++) {
    const image = resultImages[i];
    const fileId = await ctx.runMutation(
      api.files.storeGenerationFileMetadata,
      {
        userId: generation.userId,
        generationId,
        filename: `generation_${generationId}_${i}.${image.format}`,
        contentType: `image/${image.format}`,
        size: image.size,
        storageId: image.storageId,
        category: "generated_image",
        imageOrder: i,
        isPrimary: i === 0, // First image is primary
        metadata: {
          width: image.width,
          height: image.height,
          format: image.format,
          originalUrl: image.cloudinaryUrl,
        },
      }
    );

    fileIds.push(fileId);
  }

  return fileIds;
}
```

## Error Handling Patterns

### Comprehensive Error Handler

```typescript
async function safeExecute(ctx, operation, fallbackAction = null) {
  try {
    return await operation();
  } catch (error) {
    console.error("Operation failed:", error);

    // Handle specific error types
    if (error.code === "INSUFFICIENT_TOKENS") {
      // Could trigger token purchase flow
      if (fallbackAction) await fallbackAction("INSUFFICIENT_TOKENS");
    } else if (error.code === "UNAUTHORIZED") {
      // Redirect to authentication
      if (fallbackAction) await fallbackAction("UNAUTHORIZED");
    } else if (error.code === "PROCESSING_ERROR") {
      // Retry logic or alternative processing
      if (fallbackAction) await fallbackAction("PROCESSING_ERROR");
    }

    // Re-throw for upstream handling
    throw error;
  }
}

// Usage
await safeExecute(
  ctx,
  () => generateImage(params),
  async (errorCode) => {
    if (errorCode === "INSUFFICIENT_TOKENS") {
      await suggestTokenPurchase(ctx, params.userId);
    }
  }
);
```

### Token Refund on Failure

```typescript
async function handleGenerationFailure(ctx, generationId, error) {
  const generation = await ctx.runQuery(api.generations.getGeneration, {
    id: generationId,
  });
  if (!generation) return;

  // Refund tokens if generation used tokens
  if (generation.tokensUsed > 0) {
    await ctx.runMutation(api.tokens.addTokens, {
      userId: generation.userId,
      amount: generation.tokensUsed,
      reason: `Generation failed: ${error}`,
      generationId,
    });
  }

  // Update generation status
  await ctx.runMutation(api.generations.updateGenerationStatus, {
    generationId,
    status: "failed",
    error: error.toString(),
  });
}
```

## Analytics and Monitoring

### Usage Tracking

```typescript
async function trackDetailedUsage(ctx, userId, action, details) {
  await ctx.runMutation(api.usage.logUserAction, {
    userId,
    action,
    metadata: {
      ...details,
      timestamp: Date.now(),
      version: "v2.0", // Track API version
      source: "ai-agent", // Identify automated actions
    },
    sessionId: details.sessionId,
    ipAddress: details.ipAddress,
  });
}

// Track generation performance
await trackDetailedUsage(ctx, userId, "generation_completed", {
  generationId,
  tokensUsed: 1,
  processingTime: endTime - startTime,
  modelUsed: "stable-diffusion-xl",
  qualitySetting: "high",
  successRate: calculateSuccessRate(userId),
  retryCount: 0,
});
```

### Performance Monitoring

```typescript
async function getGenerationMetrics(
  ctx,
  userId,
  timeRange = 24 * 60 * 60 * 1000
) {
  const since = Date.now() - timeRange;

  const usage = await ctx.runQuery(api.usage.getUserUsageHistory, {
    userId,
    limit: 1000,
  });

  const generationActions = usage.filter(
    (u) =>
      u.timestamp > since &&
      [
        "generation_started",
        "generation_completed",
        "generation_failed",
      ].includes(u.action)
  );

  const metrics = {
    totalGenerations: generationActions.filter(
      (u) => u.action === "generation_started"
    ).length,
    completedGenerations: generationActions.filter(
      (u) => u.action === "generation_completed"
    ).length,
    failedGenerations: generationActions.filter(
      (u) => u.action === "generation_failed"
    ).length,
    avgProcessingTime: calculateAverageProcessingTime(generationActions),
    successRate: 0,
    tokensUsed: generationActions.reduce(
      (sum, u) => sum + (u.metadata?.tokensUsed || 0),
      0
    ),
  };

  metrics.successRate =
    metrics.totalGenerations > 0
      ? (metrics.completedGenerations / metrics.totalGenerations) * 100
      : 0;

  return metrics;
}
```

## Token Economy Management

### Dynamic Token Pricing

```typescript
async function calculateTokenCost(params) {
  let baseCost = 1; // Default token cost

  // Quality multiplier
  const qualityMultipliers = {
    draft: 0.5,
    standard: 1.0,
    high: 1.5,
  };

  // Resolution multiplier
  const resolutionMultipliers = {
    "1:1": 1.0,
    "16:9": 1.2,
    "9:16": 1.2,
    "3:2": 1.1,
    "2:3": 1.1,
  };

  const qualityMultiplier = qualityMultipliers[params.quality] || 1.0;
  const resolutionMultiplier = resolutionMultipliers[params.aspectRatio] || 1.0;

  // Model-specific costs
  const modelMultipliers = {
    "stable-diffusion-xl": 1.0,
    "dall-e-3": 2.0,
    midjourney: 1.5,
  };

  const modelMultiplier = modelMultipliers[params.model] || 1.0;

  return Math.ceil(
    baseCost * qualityMultiplier * resolutionMultiplier * modelMultiplier
  );
}

async function validateTokenTransaction(ctx, userId, operation, cost) {
  const user = await ctx.runQuery(api.users.getUserById, { userId });
  if (!user || user.tokenBalance < cost) {
    throw createError(
      `Insufficient tokens. Required: ${cost}, Available: ${user?.tokenBalance || 0}`,
      "INSUFFICIENT_TOKENS"
    );
  }

  // Deduct tokens immediately for atomic operation
  return await ctx.runMutation(api.tokens.deductTokens, {
    userId,
    amount: cost,
    reason: operation,
    generationId: generateTemporaryId(), // Will be updated with actual ID
  });
}
```

### Token Purchase Integration

```typescript
async function initiatePurchase(ctx, userId, packageName) {
  const packages = {
    starter: { tokens: 10, price: 299 }, // $2.99
    standard: { tokens: 50, price: 999 }, // $9.99
    pro: { tokens: 200, price: 2999 }, // $29.99
    enterprise: { tokens: 1000, price: 9999 }, // $99.99
  };

  const package = packages[packageName];
  if (!package) throw createError("Invalid package", "VALIDATION_ERROR");

  const purchaseId = await ctx.runMutation(api.tokens.createTokenPurchase, {
    userId,
    amount: package.price,
    tokensReceived: package.tokens,
    packageName,
    packageDisplayName: `${package.tokens} Tokens`,
    paymentMethod: "stripe",
  });

  return {
    purchaseId,
    amount: package.price,
    tokens: package.tokens,
    stripeClientSecret: await createStripePaymentIntent(package.price),
  };
}
```

## Advanced Query Patterns

### Efficient Data Fetching

```typescript
async function getUserDashboardData(ctx, userId) {
  // Fetch all required data in parallel
  const [user, recentGenerations, recentUsage, storageUsage, tokenPurchases] =
    await Promise.all([
      ctx.runQuery(api.users.getUserById, { userId }),
      ctx.runQuery(api.generations.getUserGenerations, { userId, limit: 10 }),
      ctx.runQuery(api.usage.getUserUsageHistory, { userId, limit: 50 }),
      ctx.runQuery(api.files.getUserStorageUsage, { userId }),
      ctx.runQuery(api.tokens.getUserTokenPurchases, { userId, limit: 5 }),
    ]);

  // Process and combine data
  const stats = await ctx.runQuery(api.users.getUserStats, {
    email: user.email,
  });

  return {
    user: {
      ...user,
      stats,
    },
    recentActivity: {
      generations: recentGenerations,
      usage: recentUsage,
    },
    storage: storageUsage,
    billing: {
      tokenBalance: user.tokenBalance,
      recentPurchases: tokenPurchases,
    },
  };
}
```

### Complex Analytics Queries

```typescript
async function getSystemAnalytics(ctx, timeRange = 7 * 24 * 60 * 60 * 1000) {
  const since = Date.now() - timeRange;

  // This would need to be implemented with proper aggregation
  const usage = await ctx.runQuery(api.usage.getUserUsageHistory, {
    userId: null, // System-wide query (would need modification)
    limit: 10000,
  });

  const analytics = {
    userGrowth: calculateUserGrowth(usage, since),
    generationTrends: analyzeGenerationTrends(usage, since),
    tokenUsage: analyzeTokenUsage(usage, since),
    errorRates: calculateErrorRates(usage, since),
    popularModels: getPopularModels(usage, since),
  };

  return analytics;
}
```

## Integration Patterns

### Webhook Handling

```typescript
async function handleStripeWebhook(ctx, event) {
  switch (event.type) {
    case "payment_intent.succeeded":
      const paymentIntent = event.data.object;
      await ctx.runMutation(api.tokens.completeTokenPurchase, {
        purchaseId: paymentIntent.metadata.purchaseId,
        stripePaymentIntentId: paymentIntent.id,
      });
      break;

    case "payment_intent.payment_failed":
      await ctx.runMutation(api.tokens.failTokenPurchase, {
        purchaseId: paymentIntent.metadata.purchaseId,
        error: "Payment failed",
      });
      break;
  }
}

async function handleReplicateWebhook(ctx, event) {
  const { id, status, output, error } = event;

  // Find generation by replicate ID
  const generation = await findGenerationByReplicateId(ctx, id);
  if (!generation) return;

  switch (status) {
    case "succeeded":
      const resultFiles = await processReplicateOutput(
        ctx,
        output,
        generation._id
      );
      await ctx.runMutation(api.generations.updateGenerationStatus, {
        generationId: generation._id,
        status: "completed",
        resultImageFiles: resultFiles,
      });
      break;

    case "failed":
      await handleGenerationFailure(ctx, generation._id, error);
      break;
  }
}
```

### Batch Processing

```typescript
async function processBatchGenerations(ctx, generationRequests) {
  const results = [];

  for (const request of generationRequests) {
    try {
      const generationId = await executeImageGeneration(ctx, request);
      results.push({ success: true, generationId, request: request.id });
    } catch (error) {
      results.push({
        success: false,
        error: error.message,
        request: request.id,
      });
    }
  }

  // Log batch processing results
  await ctx.runMutation(api.usage.logUserAction, {
    userId: request.userId,
    action: "generation_started",
    metadata: {
      batchSize: generationRequests.length,
      successCount: results.filter((r) => r.success).length,
      failureCount: results.filter((r) => !r.success).length,
    },
  });

  return results;
}
```

This integration guide provides AI agents with comprehensive patterns for effectively working with the Style Studio AI Convex backend, focusing on practical implementation and error handling.
