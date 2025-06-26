import { Doc, Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

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

// Enhanced functions for AI integration

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
