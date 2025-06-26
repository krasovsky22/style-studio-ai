import { Doc, Id } from "./_generated/dataModel";
import { mutation, query, action } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";

// Create a new generation request (updated for Convex v7 file references)
export const createGeneration = mutation({
  args: {
    userId: v.id("users"),
    productImageFiles: v.array(v.id("files")),
    modelImageFiles: v.optional(v.array(v.id("files"))),
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

    // Validate that all file references exist and belong to the user
    const productFiles = await Promise.all(
      args.productImageFiles.map((fileId) => ctx.db.get(fileId))
    );

    const modelFiles = args.modelImageFiles
      ? await Promise.all(
          args.modelImageFiles.map((fileId) => ctx.db.get(fileId))
        )
      : [];

    // Check file ownership and existence
    for (const file of [...productFiles, ...modelFiles]) {
      if (!file) {
        throw new Error("One or more files not found");
      }
      if (file.userId !== args.userId) {
        throw new Error(
          "Unauthorized: Cannot use files that don't belong to you"
        );
      }
    }

    const generationId = await ctx.db.insert("generations", {
      userId: args.userId,
      status: "pending",
      createdAt: now,
      productImageFiles: args.productImageFiles,
      modelImageFiles: args.modelImageFiles || [],
      resultImageFiles: [],
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

// Update generation status (updated for file references)
export const updateGenerationStatus = mutation({
  args: {
    generationId: v.id("generations"),
    status: v.union(
      v.literal("processing"),
      v.literal("uploading"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled")
    ),
    resultImageFiles: v.optional(v.array(v.id("files"))), // File references
    error: v.optional(v.string()),
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

    // Handle result files (preferred approach)
    if (args.resultImageFiles) {
      // Validate that all result files exist
      const resultFiles = await Promise.all(
        args.resultImageFiles.map((fileId) => ctx.db.get(fileId))
      );

      for (const file of resultFiles) {
        if (!file) {
          throw new Error("One or more result files not found");
        }
      }

      updates.resultImageFiles = args.resultImageFiles;
    }

    if (args.error) {
      updates.error = args.error;
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

// Update generation from Replicate webhook/polling (enhanced for file references)
export const updateFromReplicate = mutation({
  args: {
    generationId: v.id("generations"),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled")
    ),
    resultImageFiles: v.optional(v.array(v.id("files"))), // File references
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
    };

    // Handle result files (preferred approach)
    if (args.resultImageFiles) {
      // Validate that all result files exist
      const resultFiles = await Promise.all(
        args.resultImageFiles.map((fileId) => ctx.db.get(fileId))
      );

      for (const file of resultFiles) {
        if (!file) {
          throw new Error("One or more result files not found");
        }
      }

      updateData.resultImageFiles = args.resultImageFiles;
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

// Start a new generation with enhanced validation (updated for file references)
export const startGeneration = mutation({
  args: {
    userId: v.id("users"),
    productImageFiles: v.array(v.id("files")),
    modelImageFiles: v.optional(v.array(v.id("files"))),
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

    // Validate that all file references exist and belong to the user
    const productFiles = await Promise.all(
      args.productImageFiles.map((fileId) => ctx.db.get(fileId))
    );

    const modelFiles = args.modelImageFiles
      ? await Promise.all(
          args.modelImageFiles.map((fileId) => ctx.db.get(fileId))
        )
      : [];

    // Check file ownership and existence
    for (const file of [...productFiles, ...modelFiles]) {
      if (!file) {
        throw new Error("One or more files not found");
      }
      if (file.userId !== args.userId) {
        throw new Error(
          "Unauthorized: Cannot use files that don't belong to you"
        );
      }
    }

    // Create generation record
    const generationId = await ctx.db.insert("generations", {
      userId: args.userId,
      status: "pending",
      createdAt: now,
      productImageFiles: args.productImageFiles,
      modelImageFiles: args.modelImageFiles || [],
      resultImageFiles: [],
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

// Enhanced generation creation function with file references (Convex v7)
export const createEnhancedGeneration = mutation({
  args: {
    userId: v.id("users"),
    productImageFiles: v.array(v.id("files")), // File references (required)
    modelImageFiles: v.optional(v.array(v.id("files"))), // File references (optional)
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

    // Validate product images are provided
    if (!args.productImageFiles || args.productImageFiles.length === 0) {
      throw new Error("At least one product image file is required");
    }

    // Validate file references
    const productFiles = await Promise.all(
      args.productImageFiles.map((fileId) => ctx.db.get(fileId))
    );

    for (const file of productFiles) {
      if (!file) {
        throw new Error("One or more product files not found");
      }
      if (file.userId !== args.userId) {
        throw new Error(
          "Unauthorized: Cannot use files that don't belong to you"
        );
      }
    }

    if (args.modelImageFiles && args.modelImageFiles.length > 0) {
      const modelFiles = await Promise.all(
        args.modelImageFiles.map((fileId) => ctx.db.get(fileId))
      );

      for (const file of modelFiles) {
        if (!file) {
          throw new Error("One or more model files not found");
        }
        if (file.userId !== args.userId) {
          throw new Error(
            "Unauthorized: Cannot use files that don't belong to you"
          );
        }
      }
    }

    // Deduct tokens from user balance (optimistic deduction)
    await ctx.db.patch(args.userId, {
      tokenBalance: user.tokenBalance - args.tokensUsed,
      totalTokensUsed: (user.totalTokensUsed || 0) + args.tokensUsed,
    });

    // Create generation record with file references
    const generationId = await ctx.db.insert("generations", {
      userId: args.userId,
      status: "pending",
      productImageFiles: args.productImageFiles,
      modelImageFiles: args.modelImageFiles || [],
      resultImageFiles: [],
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
        uploading: 0,
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

    // Create new generation with same parameters (using file references if available)
    const now = Date.now();
    const newGenerationId = await ctx.db.insert("generations", {
      userId: args.userId,
      status: "pending",
      createdAt: now,
      productImageFiles: originalGeneration.productImageFiles,
      modelImageFiles: originalGeneration.modelImageFiles,
      resultImageFiles: [],
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

// Helper function to get generation with file URLs (updated for Convex v7 file references)
export const getGenerationWithFiles = query({
  args: { generationId: v.id("generations") },
  handler: async (ctx, args) => {
    const generation = await ctx.db.get(args.generationId);
    if (!generation) {
      return null;
    }

    // Get file URLs for file references
    const getFileUrls = async (fileIds?: Array<string>) => {
      if (!fileIds || fileIds.length === 0) return [];

      const fileResults = [];
      for (const fileId of fileIds) {
        try {
          const file = await ctx.db.get(fileId as Id<"files">);
          if (file) {
            // Type assertion to access file properties
            const fileDoc = file as Doc<"files">;
            const url = await ctx.storage.getUrl(fileDoc.storageId);
            if (url) {
              fileResults.push({
                fileId: fileDoc._id,
                url,
                filename: fileDoc.filename,
                contentType: fileDoc.contentType,
                size: fileDoc.size,
                metadata: fileDoc.metadata,
              });
            }
          }
        } catch (error) {
          console.error(`Failed to get file ${fileId}:`, error);
        }
      }

      return fileResults;
    };

    // Get URLs for file references (primary approach)
    const [productFilesWithUrls, modelFilesWithUrls, resultFilesWithUrls] =
      await Promise.all([
        getFileUrls(generation.productImageFiles),
        getFileUrls(generation.modelImageFiles),
        getFileUrls(generation.resultImageFiles),
      ]);

    return {
      ...generation,
      productFilesWithUrls,
      modelFilesWithUrls,
      resultFilesWithUrls,
    };
  },
});

// Helper function to get user generations with file details (updated for Convex v7)
export const getUserGenerationsWithFiles = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("uploading"),
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

    // Helper function to get file URLs
    const getFileUrls = async (fileIds?: Array<string>) => {
      if (!fileIds || fileIds.length === 0) return [];

      const fileResults = [];
      for (const fileId of fileIds) {
        try {
          const file = await ctx.db.get(fileId as Id<"files">);
          if (file) {
            // Type assertion to access file properties
            const fileDoc = file as Doc<"files">;
            const url = await ctx.storage.getUrl(fileDoc.storageId);
            if (url) {
              fileResults.push({
                fileId: fileDoc._id,
                url,
                filename: fileDoc.filename,
                contentType: fileDoc.contentType,
                size: fileDoc.size,
                metadata: fileDoc.metadata,
              });
            }
          }
        } catch (error) {
          console.error(`Failed to get file ${fileId}:`, error);
        }
      }

      return fileResults;
    };

    // Process each generation to include file URLs
    const generationsWithFiles = await Promise.all(
      generations.map(async (generation) => {
        const [productFilesWithUrls, modelFilesWithUrls, resultFilesWithUrls] =
          await Promise.all([
            getFileUrls(generation.productImageFiles),
            getFileUrls(generation.modelImageFiles),
            getFileUrls(generation.resultImageFiles),
          ]);

        return {
          ...generation,
          productFilesWithUrls,
          modelFilesWithUrls,
          resultFilesWithUrls,
        };
      })
    );

    return generationsWithFiles;
  },
});

// Helper function to add result files to a generation (using file references)
export const addResultFiles = mutation({
  args: {
    generationId: v.id("generations"),
    resultFileIds: v.array(v.id("files")),
  },
  handler: async (ctx, args) => {
    const generation = await ctx.db.get(args.generationId);
    if (!generation) {
      throw new Error("Generation not found");
    }

    // Validate that all result files exist
    const resultFiles = await Promise.all(
      args.resultFileIds.map((fileId) => ctx.db.get(fileId))
    );

    for (const file of resultFiles) {
      if (!file) {
        throw new Error("One or more result files not found");
      }
    }

    // Add new result files to the existing array
    const updatedResultFiles = [
      ...(generation.resultImageFiles || []),
      ...args.resultFileIds,
    ];

    await ctx.db.patch(args.generationId, {
      resultImageFiles: updatedResultFiles,
    });

    return { success: true, totalResultFiles: updatedResultFiles.length };
  },
});

// Helper function to add file reference to generation (primary approach)
export const addFileToGeneration = mutation({
  args: {
    generationId: v.id("generations"),
    userId: v.id("users"),
    fileId: v.id("files"),
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

    // Validate that the file exists and belongs to the user
    const file = await ctx.db.get(args.fileId);
    if (!file) {
      throw new Error("File not found");
    }

    if (file.userId !== args.userId) {
      throw new Error(
        "Unauthorized: Cannot use files that don't belong to you"
      );
    }

    // Add file ID to appropriate array in generation
    let updateField: string;
    let currentFiles: Array<string>;

    switch (args.imageType) {
      case "product":
        updateField = "productImageFiles";
        currentFiles = generation.productImageFiles || [];
        break;
      case "model":
        updateField = "modelImageFiles";
        currentFiles = generation.modelImageFiles || [];
        break;
      case "result":
        updateField = "resultImageFiles";
        currentFiles = generation.resultImageFiles || [];
        break;
      default:
        throw new Error("Invalid image type");
    }

    const updatedFiles = [...currentFiles, args.fileId];
    await ctx.db.patch(args.generationId, {
      [updateField]: updatedFiles,
    });

    return { success: true, fileId: args.fileId };
  },
});

// Comprehensive generation query with file references
export const getGenerationComplete = query({
  args: { generationId: v.id("generations") },
  handler: async (ctx, args) => {
    const generation = await ctx.db.get(args.generationId);
    if (!generation) {
      return null;
    }

    // Helper function to get file data
    const getFileData = async (fileId: string) => {
      try {
        const file = await ctx.db.get(fileId as Id<"files">);
        if (!file) return null;

        // Type assertion to access file properties
        const fileDoc = file as Doc<"files">;
        const url = await ctx.storage.getUrl(fileDoc.storageId);
        return {
          fileId: fileDoc._id,
          url,
          filename: fileDoc.filename,
          contentType: fileDoc.contentType,
          size: fileDoc.size,
          uploadedAt: fileDoc.uploadedAt,
          metadata: fileDoc.metadata,
        };
      } catch (error) {
        console.error(`Failed to get file ${fileId}:`, error);
        return null;
      }
    };

    // Process file references
    const productFiles = generation.productImageFiles
      ? await Promise.all(generation.productImageFiles.map(getFileData))
      : [];

    const modelFiles = generation.modelImageFiles
      ? await Promise.all(generation.modelImageFiles.map(getFileData))
      : [];

    const resultFiles = generation.resultImageFiles
      ? await Promise.all(generation.resultImageFiles.map(getFileData))
      : [];

    // Filter out null results
    const validProductFiles = productFiles.filter(Boolean);
    const validModelFiles = modelFiles.filter(Boolean);
    const validResultFiles = resultFiles.filter(Boolean);

    return {
      ...generation,
      productFiles: validProductFiles,
      modelFiles: validModelFiles,
      resultFiles: validResultFiles,
      hasFiles:
        validProductFiles.length > 0 ||
        validModelFiles.length > 0 ||
        validResultFiles.length > 0,
      totalProductImages: validProductFiles.length,
      totalModelImages: validModelFiles.length,
      totalResultImages: validResultFiles.length,
    };
  },
});
