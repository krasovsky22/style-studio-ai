import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Enhanced AI integration functions for real-time updates and better generation management

// Real-time subscription for generation status
export const subscribeToGeneration = query({
  args: { generationId: v.id("generations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.generationId);
  },
});

// Real-time subscription for user's generations with live updates
export const subscribeToUserGenerations = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("processing"),
        v.literal("completed"),
        v.literal("failed"),
        v.literal("cancelled")
      )
    ),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;

    let query = ctx.db
      .query("generations")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc");

    if (args.status) {
      query = ctx.db
        .query("generations")
        .withIndex("by_user_and_status", (q) =>
          q.eq("userId", args.userId).eq("status", args.status!)
        )
        .order("desc");
    }

    return await query.take(limit);
  },
});

// Enhanced generation creation with better token handling
export const createEnhancedGeneration = mutation({
  args: {
    userId: v.id("users"),
    productImageUrl: v.string(),
    modelImageUrl: v.optional(v.string()),
    prompt: v.string(),
    negativePrompt: v.optional(v.string()),
    parameters: v.object({
      model: v.string(),
      style: v.string(),
      quality: v.string(),
      aspectRatio: v.string(),
      seed: v.optional(v.number()),
    }),
    estimatedTokenCost: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get user and validate token balance
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    if (user.tokenBalance < args.estimatedTokenCost) {
      throw new Error(
        `Insufficient tokens. Required: ${args.estimatedTokenCost}, Available: ${user.tokenBalance}`
      );
    }

    // Create generation record
    const generationId = await ctx.db.insert("generations", {
      userId: args.userId,
      status: "pending",
      createdAt: now,
      productImageUrl: args.productImageUrl,
      modelImageUrl: args.modelImageUrl,
      prompt: args.prompt,
      parameters: args.parameters,
      tokensUsed: 0, // Will be set when generation completes
      retryCount: 0,
    });

    // Log generation start
    await ctx.db.insert("usage", {
      userId: args.userId,
      action: "generation_started",
      timestamp: now,
      metadata: {
        generationId,
        modelUsed: args.parameters.model,
      },
    });

    return { generationId, estimatedCost: args.estimatedTokenCost };
  },
});

// Update generation with Replicate results
export const updateGenerationFromReplicate = mutation({
  args: {
    generationId: v.id("generations"),
    replicateId: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled")
    ),
    resultImageUrl: v.optional(v.string()),
    error: v.optional(v.string()),
    processingTime: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const generation = await ctx.db.get(args.generationId);
    if (!generation) {
      throw new Error("Generation not found");
    }

    const updateData: {
      status: "pending" | "processing" | "completed" | "failed" | "cancelled";
      replicateId: string;
      resultImageUrl?: string;
      error?: string;
      processingTime?: number;
      completedAt?: number;
      tokensUsed?: number;
    } = {
      status: args.status,
      replicateId: args.replicateId,
    };

    if (args.resultImageUrl) {
      updateData.resultImageUrl = args.resultImageUrl;
    }

    if (args.error) {
      updateData.error = args.error;
    }

    if (args.processingTime) {
      updateData.processingTime = args.processingTime;
    }

    if (args.status === "completed") {
      updateData.completedAt = Date.now();
      updateData.tokensUsed = 1; // Charge token on successful completion

      // Update user's token balance and usage
      const user = await ctx.db.get(generation.userId);
      if (user) {
        await ctx.db.patch(generation.userId, {
          tokenBalance: Math.max(0, user.tokenBalance - 1),
          totalTokensUsed: user.totalTokensUsed + 1,
        });
      }

      // Log successful generation
      await ctx.db.insert("usage", {
        userId: generation.userId,
        action: "generation_completed",
        timestamp: Date.now(),
        metadata: {
          generationId: args.generationId,
          tokensUsed: 1,
          processingTime: args.processingTime,
          modelUsed: generation.parameters.model,
        },
      });
    } else if (args.status === "failed") {
      // Log failed generation
      await ctx.db.insert("usage", {
        userId: generation.userId,
        action: "generation_failed",
        timestamp: Date.now(),
        metadata: {
          generationId: args.generationId,
          errorMessage: args.error,
          modelUsed: generation.parameters.model,
        },
      });
    }

    await ctx.db.patch(args.generationId, updateData);

    return { success: true };
  },
});

// Cancel a generation
export const cancelUserGeneration = mutation({
  args: {
    generationId: v.id("generations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const generation = await ctx.db.get(args.generationId);

    if (!generation) {
      throw new Error("Generation not found");
    }

    if (generation.userId !== args.userId) {
      throw new Error("Unauthorized: Cannot cancel another user's generation");
    }

    if (generation.status === "completed" || generation.status === "failed") {
      throw new Error("Cannot cancel completed or failed generation");
    }

    await ctx.db.patch(args.generationId, {
      status: "cancelled",
      completedAt: Date.now(),
    });

    // Log cancellation
    await ctx.db.insert("usage", {
      userId: args.userId,
      action: "generation_failed", // Use same action for analytics
      timestamp: Date.now(),
      metadata: {
        generationId: args.generationId,
        errorMessage: "Cancelled by user",
        modelUsed: generation.parameters.model,
      },
    });

    return { success: true };
  },
});

// Retry a failed generation
export const retryFailedGeneration = mutation({
  args: {
    generationId: v.id("generations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const originalGeneration = await ctx.db.get(args.generationId);

    if (!originalGeneration) {
      throw new Error("Original generation not found");
    }

    if (originalGeneration.userId !== args.userId) {
      throw new Error("Unauthorized: Cannot retry another user's generation");
    }

    if (originalGeneration.status !== "failed") {
      throw new Error("Can only retry failed generations");
    }

    // Check user's token balance
    const user = await ctx.db.get(args.userId);
    if (!user || user.tokenBalance < 1) {
      throw new Error("Insufficient tokens for retry");
    }

    // Create new generation with same parameters
    const now = Date.now();
    const newGenerationId = await ctx.db.insert("generations", {
      userId: args.userId,
      status: "pending",
      createdAt: now,
      productImageUrl: originalGeneration.productImageUrl,
      modelImageUrl: originalGeneration.modelImageUrl,
      prompt: originalGeneration.prompt,
      parameters: originalGeneration.parameters,
      tokensUsed: 0,
      retryCount: originalGeneration.retryCount + 1,
    });

    // Log retry
    await ctx.db.insert("usage", {
      userId: args.userId,
      action: "generation_started",
      timestamp: now,
      metadata: {
        generationId: newGenerationId,
        modelUsed: originalGeneration.parameters.model,
      },
    });

    return { generationId: newGenerationId };
  },
});

// Get pending generations for processing
export const getPendingGenerationsForProcessing = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;

    return await ctx.db
      .query("generations")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .order("asc") // Process oldest first
      .take(limit);
  },
});

// Get generation analytics
export const getGenerationMetrics = query({
  args: {
    timeframe: v.optional(
      v.union(
        v.literal("24h"),
        v.literal("7d"),
        v.literal("30d"),
        v.literal("all")
      )
    ),
    userId: v.id("users"), // Required user filter
  },
  handler: async (ctx, args) => {
    const timeframe = args.timeframe || "7d";
    let startTime = 0;

    const now = Date.now();
    switch (timeframe) {
      case "24h":
        startTime = now - 24 * 60 * 60 * 1000;
        break;
      case "7d":
        startTime = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case "30d":
        startTime = now - 30 * 24 * 60 * 60 * 1000;
        break;
      case "all":
        startTime = 0;
        break;
    }

    const query = ctx.db
      .query("generations")
      .withIndex("by_user_and_created_at", (q) => q.eq("userId", args.userId))
      .filter((q) => q.gte(q.field("createdAt"), startTime));

    const generations = await query.collect();

    const analytics = {
      total: generations.length,
      byStatus: {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        cancelled: 0,
      },
      byModel: {} as Record<string, number>,
      averageProcessingTime: 0,
      successRate: 0,
      totalTokensUsed: 0,
    };

    let totalProcessingTime = 0;
    let processedCount = 0;

    generations.forEach((gen) => {
      analytics.byStatus[gen.status]++;
      analytics.totalTokensUsed += gen.tokensUsed;

      const model = gen.parameters.model;
      analytics.byModel[model] = (analytics.byModel[model] || 0) + 1;

      if (gen.processingTime) {
        totalProcessingTime += gen.processingTime;
        processedCount++;
      }
    });

    if (processedCount > 0) {
      analytics.averageProcessingTime = totalProcessingTime / processedCount;
    }

    const completedCount = analytics.byStatus.completed;
    if (generations.length > 0) {
      analytics.successRate = (completedCount / generations.length) * 100;
    }

    return analytics;
  },
});
