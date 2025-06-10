import { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create a new generation request
export const createGeneration = mutation({
  args: {
    userId: v.id("users"),
    productImageUrl: v.string(),
    modelImageUrl: v.optional(v.string()),
    prompt: v.string(),
    parameters: v.object({
      model: v.string(),
      style: v.optional(v.string()),
      quality: v.optional(v.string()),
      aspectRatio: v.optional(v.string()),
      seed: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check user's token balance
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    if (user.tokenBalance < 1) {
      throw new Error(
        "Insufficient tokens. Please purchase more tokens to continue."
      );
    }

    const generationId = await ctx.db.insert("generations", {
      userId: args.userId,
      status: "pending",
      createdAt: now,
      productImageUrl: args.productImageUrl,
      modelImageUrl: args.modelImageUrl,
      prompt: args.prompt,
      parameters: args.parameters,
      tokensUsed: 0, // Will be set to 1 when generation completes successfully
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

    return generationId;
  },
});

// Update generation status
export const updateGenerationStatus = mutation({
  args: {
    generationId: v.id("generations"),
    status: v.union(
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled")
    ),
    resultImageUrl: v.optional(v.string()),
    error: v.optional(v.string()),
    replicateId: v.optional(v.string()),
    cloudinaryPublicId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const generation = await ctx.db.get(args.generationId);
    if (!generation) {
      throw new Error("Generation not found");
    }

    const now = Date.now();
    const updates: Partial<Doc<"generations">> = {
      status: args.status,
    };

    if (args.status === "completed" || args.status === "failed") {
      updates.completedAt = now;
      updates.processingTime = now - generation.createdAt;
    }

    if (args.resultImageUrl) {
      updates.resultImageUrl = args.resultImageUrl;
    }

    if (args.error) {
      updates.error = args.error;
    }

    if (args.replicateId) {
      updates.replicateId = args.replicateId;
    }

    if (args.cloudinaryPublicId) {
      updates.cloudinaryPublicId = args.cloudinaryPublicId;
    }

    await ctx.db.patch(args.generationId, updates);

    // Handle token usage based on generation result
    const user = await ctx.db.get(generation.userId);
    if (user) {
      if (args.status === "completed") {
        // Deduct 1 token for successful generation
        await ctx.db.patch(generation.userId, {
          tokenBalance: Math.max(0, user.tokenBalance - 1),
          totalTokensUsed: user.totalTokensUsed + 1,
        });

        // Update generation with tokens used
        await ctx.db.patch(args.generationId, {
          tokensUsed: 1,
        });
      } else if (args.status === "failed") {
        // Don't deduct tokens for failed generations
        await ctx.db.patch(args.generationId, {
          tokensUsed: 0,
        });
      }
    }

    // Log completion or failure
    const action =
      args.status === "completed"
        ? "generation_completed"
        : "generation_failed";
    await ctx.db.insert("usage", {
      userId: generation.userId,
      action,
      timestamp: now,
      metadata: {
        generationId: args.generationId,
        tokensUsed: args.status === "completed" ? 1 : 0,
        processingTime: updates.processingTime,
        errorMessage: args.error,
      },
    });

    return args.generationId;
  },
});

// Get generation by ID
export const getGeneration = query({
  args: { generationId: v.id("generations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.generationId);
  },
});

// Get user's generations with pagination
export const getUserGenerations = query({
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
    let query = ctx.db
      .query("generations")
      .withIndex("by_user_and_created_at", (q) => q.eq("userId", args.userId))
      .order("desc");

    if (args.status) {
      query = ctx.db
        .query("generations")
        .withIndex("by_user_and_status", (q) =>
          q.eq("userId", args.userId).eq("status", args.status!)
        )
        .order("desc");
    }

    const limit = args.limit || 20;
    return await query.take(limit);
  },
});

// Get recent generations (for admin/analytics)
export const getRecentGenerations = query({
  args: {
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
    let query = ctx.db
      .query("generations")
      .withIndex("by_created_at")
      .order("desc");

    if (args.status) {
      query = ctx.db
        .query("generations")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc");
    }

    const limit = args.limit || 50;
    return await query.take(limit);
  },
});

// Retry a failed generation
export const retryGeneration = mutation({
  args: { generationId: v.id("generations") },
  handler: async (ctx, args) => {
    const generation = await ctx.db.get(args.generationId);
    if (!generation) {
      throw new Error("Generation not found");
    }

    if (generation.status !== "failed") {
      throw new Error("Can only retry failed generations");
    }

    if (generation.retryCount >= 3) {
      throw new Error("Maximum retry attempts exceeded");
    }

    await ctx.db.patch(args.generationId, {
      status: "pending",
      retryCount: generation.retryCount + 1,
      error: undefined,
    });

    // Log retry attempt
    await ctx.db.insert("usage", {
      userId: generation.userId,
      action: "generation_started",
      timestamp: Date.now(),
      metadata: {
        generationId: args.generationId,
        modelUsed: generation.parameters.model,
      },
    });

    return args.generationId;
  },
});

// Delete a generation
export const deleteGeneration = mutation({
  args: { generationId: v.id("generations") },
  handler: async (ctx, args) => {
    const generation = await ctx.db.get(args.generationId);
    if (!generation) {
      throw new Error("Generation not found");
    }

    await ctx.db.delete(args.generationId);
    return true;
  },
});

// Get generation statistics for a user
export const getUserGenerationStats = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const generations = await ctx.db
      .query("generations")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const stats = {
      total: generations.length,
      completed: 0,
      failed: 0,
      pending: 0,
      processing: 0,
      cancelled: 0,
    };

    generations.forEach((gen) => {
      stats[gen.status]++;
    });

    return stats;
  },
});
