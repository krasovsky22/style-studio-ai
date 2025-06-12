import { Doc } from "./_generated/dataModel";
import { mutation, query, action } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";

// Create a new generation request
export const createGeneration = mutation({
  args: {
    userId: v.id("users"),
    productImages: v.array(v.id("files")),
    modelImages: v.optional(v.array(v.id("files"))),
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
      productImages: args.productImages,
      modelImages: args.modelImages || [],
      resultImages: [],
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
    resultImages: v.optional(v.array(v.id("files"))),
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

    if (args.resultImages) {
      updates.resultImages = args.resultImages;
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
  args: { id: v.id("generations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
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

// Enhanced functions for AI integration

// Process generation queue - called by background job
export const processGenerationQueue = action({
  args: {},
  handler: async (ctx) => {
    // Get pending generations
    const pendingGenerations = await ctx.runQuery(
      api.generations.getPendingGenerations
    );

    for (const generation of pendingGenerations.slice(0, 5)) {
      // Process max 5 at a time
      try {
        // Update status to processing
        await ctx.runMutation(api.generations.updateGenerationStatus, {
          generationId: generation._id,
          status: "processing",
        });

        // Here you would integrate with Replicate API
        // For now, we'll simulate the process
        console.log(`Processing generation ${generation._id}`);
      } catch (error) {
        console.error(`Failed to process generation ${generation._id}:`, error);

        // Update generation with error
        await ctx.runMutation(api.generations.updateGenerationStatus, {
          generationId: generation._id,
          status: "failed",
          error: String(error),
        });
      }
    }
  },
});

// Update generation from Replicate webhook/polling
export const updateFromReplicate = mutation({
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
    resultImages: v.optional(v.array(v.id("files"))),
    error: v.optional(v.string()),
    processingTime: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const generation = await ctx.db.get(args.generationId);
    if (!generation) {
      throw new Error("Generation not found");
    }

    const updateData: Partial<Doc<"generations">> = {
      status: args.status,
      replicateId: args.replicateId,
    };

    if (args.resultImages) {
      updateData.resultImages = args.resultImages;
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

// Start a new generation with enhanced validation
export const startGeneration = mutation({
  args: {
    userId: v.id("users"),
    productImages: v.array(v.id("files")),
    modelImages: v.optional(v.array(v.id("files"))),
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
      productImages: args.productImages,
      modelImages: args.modelImages || [],
      resultImages: [],
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

// Enhanced generation creation function with full image support and token validation
export const createEnhancedGeneration = mutation({
  args: {
    userId: v.id("users"),
    productImages: v.array(v.string()), // Cloudinary URLs
    modelImages: v.optional(v.array(v.string())), // Cloudinary URLs
    prompt: v.string(),
    parameters: v.object({
      model: v.string(),
      style: v.optional(v.string()),
      quality: v.optional(v.string()),
      strength: v.optional(v.number()),
      aspectRatio: v.optional(v.string()),
      guidance_scale: v.optional(v.number()),
      num_inference_steps: v.optional(v.number()),
      seed: v.optional(v.number()),
    }),
    tokensUsed: v.number(),
  },
  handler: async (ctx, args) => {
    // Validate user exists and has sufficient tokens
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    if (user.tokenBalance < args.tokensUsed) {
      throw new Error("Insufficient token balance");
    }

    // Deduct tokens from user balance (optimistic deduction)
    await ctx.db.patch(args.userId, {
      tokenBalance: user.tokenBalance - args.tokensUsed,
      totalTokensUsed: (user.totalTokensUsed || 0) + args.tokensUsed,
    });

    // Create generation record
    const generationId = await ctx.db.insert("generations", {
      userId: args.userId,
      status: "pending",
      productImages: args.productImages,
      modelImages: args.modelImages,
      prompt: args.prompt,
      parameters: args.parameters,
      tokensUsed: args.tokensUsed,
      retryCount: 0,
      createdAt: Date.now(),
    });

    // Log user action with metadata matching the usage schema
    await ctx.db.insert("usage", {
      userId: args.userId,
      action: "generation_started",
      timestamp: Date.now(),
      metadata: {
        generationId,
        tokensUsed: args.tokensUsed,
        modelUsed: args.parameters.model,
      },
    });

    return generationId;
  },
});

// Real-time subscription for generation status
export const subscribeToGeneration = query({
  args: { generationId: v.id("generations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.generationId);
  },
});

// Real-time subscription for user's generations
export const subscribeToUserGenerations = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;

    return await ctx.db
      .query("generations")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);
  },
});

// Get pending generations for queue processing
export const getPendingGenerations = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("generations")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .order("asc") // Process oldest first
      .take(10);
  },
});

// Cancel a generation
export const cancelGeneration = mutation({
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

// Get generation analytics for admin
export const getGenerationAnalytics = query({
  args: {
    timeframe: v.optional(
      v.union(
        v.literal("24h"),
        v.literal("7d"),
        v.literal("30d"),
        v.literal("all")
      )
    ),
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

    const generations = await ctx.db
      .query("generations")
      .withIndex("by_created_at")
      .filter((q) => q.gte(q.field("createdAt"), startTime))
      .collect();

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
    };

    let totalProcessingTime = 0;
    let processedCount = 0;

    generations.forEach((gen) => {
      analytics.byStatus[gen.status]++;

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

// Retry a failed generation
export const retryGeneration = mutation({
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
      productImages: originalGeneration.productImages,
      modelImages: originalGeneration.modelImages,
      resultImages: [],
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

// Helper function to get generation with image URLs (new approach using Cloudinary URLs)
export const getGenerationWithFiles = query({
  args: { generationId: v.id("generations") },
  handler: async (ctx, args) => {
    const generation = await ctx.db.get(args.generationId);
    if (!generation) {
      return null;
    }

    // For the new approach, images are stored as Cloudinary URLs directly
    // No need to fetch file records or storage URLs
    return {
      ...generation,
      productImagesWithUrls: (generation.productImages || []).map((url) => ({
        url,
      })),
      modelImagesWithUrls: (generation.modelImages || []).map((url) => ({
        url,
      })),
      resultImagesWithUrls: (generation.resultImages || []).map((url) => ({
        url,
      })),
    };
  },
});

// Helper function to get user generations with file details
export const getUserGenerationsWithFiles = query({
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
    const generations = await query.take(limit);

    // For the new approach, images are stored as Cloudinary URLs directly
    const generationsWithFiles = generations.map((generation) => ({
      ...generation,
      productImagesWithUrls: (generation.productImages || []).map((url) => ({
        url,
      })),
      modelImagesWithUrls: (generation.modelImages || []).map((url) => ({
        url,
      })),
      resultImagesWithUrls: (generation.resultImages || []).map((url) => ({
        url,
      })),
    }));

    return generationsWithFiles;
  },
});

// Helper function to add result images to a generation (using Cloudinary URLs)
export const addResultImages = mutation({
  args: {
    generationId: v.id("generations"),
    resultImageUrls: v.array(v.string()), // Changed from file IDs to URLs
  },
  handler: async (ctx, args) => {
    const generation = await ctx.db.get(args.generationId);
    if (!generation) {
      throw new Error("Generation not found");
    }

    // Add new result images to the existing array
    const updatedResultImages = [
      ...(generation.resultImages || []),
      ...args.resultImageUrls,
    ];

    await ctx.db.patch(args.generationId, {
      resultImages: updatedResultImages,
    });

    return { success: true, totalResultImages: updatedResultImages.length };
  },
});

// Helper function to add image URL to generation (new approach)
export const addImageUrlToGeneration = mutation({
  args: {
    generationId: v.id("generations"),
    userId: v.id("users"),
    imageUrl: v.string(), // Cloudinary URL
    imageType: v.union(
      v.literal("product"),
      v.literal("model"),
      v.literal("result")
    ),
  },
  handler: async (ctx, args) => {
    const generation = await ctx.db.get(args.generationId);
    if (!generation) {
      throw new Error("Generation not found");
    }

    if (generation.userId !== args.userId) {
      throw new Error("Unauthorized: Cannot modify another user's generation");
    }

    // Add URL to appropriate image array in generation
    let updateField: string;
    let currentImages: string[];

    switch (args.imageType) {
      case "product":
        updateField = "productImages";
        currentImages = generation.productImages || [];
        break;
      case "model":
        updateField = "modelImages";
        currentImages = generation.modelImages || [];
        break;
      case "result":
        updateField = "resultImages";
        currentImages = generation.resultImages || [];
        break;
      default:
        throw new Error("Invalid image type");
    }

    const updatedImages = [...currentImages, args.imageUrl];
    await ctx.db.patch(args.generationId, {
      [updateField]: updatedImages,
    });

    return { success: true, imageUrl: args.imageUrl };
  },
});
