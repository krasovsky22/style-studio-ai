import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Store file metadata
export const storeFileMetadata = mutation({
  args: {
    userId: v.id("users"),
    filename: v.string(),
    contentType: v.string(),
    size: v.number(),
    storageId: v.string(),
    category: v.union(
      v.literal("product_image"),
      v.literal("model_image"),
      v.literal("generated_image"),
      v.literal("profile_image")
    ),
    metadata: v.optional(
      v.object({
        width: v.optional(v.number()),
        height: v.optional(v.number()),
        format: v.optional(v.string()),
        generationId: v.optional(v.id("generations")),
      })
    ),
  },
  handler: async (ctx, args) => {
    const fileId = await ctx.db.insert("files", {
      userId: args.userId,
      filename: args.filename,
      contentType: args.contentType,
      size: args.size,
      storageId: args.storageId,
      category: args.category,
      uploadedAt: Date.now(),
      metadata: args.metadata,
    });

    // Log file upload
    await ctx.db.insert("usage", {
      userId: args.userId,
      action: "image_uploaded",
      timestamp: Date.now(),
      metadata: {
        imageSize: `${args.size} bytes`,
      },
    });

    return fileId;
  },
});

// Get file by ID
export const getFile = query({
  args: { fileId: v.id("files") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.fileId);
  },
});

// Get file by storage ID
export const getFileByStorageId = query({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("files")
      .withIndex("by_storage_id", (q) => q.eq("storageId", args.storageId))
      .first();
  },
});

// Get user's files by category
export const getUserFiles = query({
  args: {
    userId: v.id("users"),
    category: v.optional(
      v.union(
        v.literal("product_image"),
        v.literal("model_image"),
        v.literal("generated_image"),
        v.literal("profile_image")
      )
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("files")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc");

    if (args.category) {
      query = ctx.db
        .query("files")
        .withIndex("by_category", (q) => q.eq("category", args.category!))
        .filter((q) => q.eq(q.field("userId"), args.userId))
        .order("desc");
    }

    const limit = args.limit || 50;
    return await query.take(limit);
  },
});

// Delete file
export const deleteFile = mutation({
  args: { fileId: v.id("files") },
  handler: async (ctx, args) => {
    const file = await ctx.db.get(args.fileId);
    if (!file) {
      throw new Error("File not found");
    }

    // Delete the file record
    await ctx.db.delete(args.fileId);

    // Note: The actual file in Convex storage should be deleted separately
    // using ctx.storage.delete(file.storageId) in the calling code

    return { storageId: file.storageId };
  },
});

// Get user's storage usage
export const getUserStorageUsage = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const files = await ctx.db
      .query("files")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const usage = {
      totalFiles: files.length,
      totalSize: 0,
      byCategory: {
        product_image: { count: 0, size: 0 },
        model_image: { count: 0, size: 0 },
        generated_image: { count: 0, size: 0 },
        profile_image: { count: 0, size: 0 },
      },
    };

    files.forEach((file) => {
      usage.totalSize += file.size;
      usage.byCategory[file.category].count++;
      usage.byCategory[file.category].size += file.size;
    });

    return usage;
  },
});

// Clean up orphaned files (files not referenced by generations)
export const cleanupOrphanedFiles = mutation({
  args: { olderThanDays: v.number() },
  handler: async (ctx, args) => {
    const cutoffDate = Date.now() - args.olderThanDays * 24 * 60 * 60 * 1000;

    const oldFiles = await ctx.db
      .query("files")
      .withIndex("by_uploaded_at")
      .filter((q) => q.lt(q.field("uploadedAt"), cutoffDate))
      .collect();

    const orphanedFiles = [];

    for (const file of oldFiles) {
      // Check if file is referenced by any generation
      if (file.metadata?.generationId) {
        const generation = await ctx.db.get(file.metadata.generationId);
        if (!generation) {
          // Generation was deleted, this file is orphaned
          orphanedFiles.push(file);
        }
      } else if (file.category === "generated_image") {
        // Generated images should always have a generation reference
        orphanedFiles.push(file);
      }
    }

    const deletedFiles = [];
    for (const file of orphanedFiles) {
      await ctx.db.delete(file._id);
      deletedFiles.push(file.storageId);
    }

    return { deletedCount: deletedFiles.length, storageIds: deletedFiles };
  },
});

// Get recent files for admin
export const getRecentFiles = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 100;
    return await ctx.db
      .query("files")
      .withIndex("by_uploaded_at")
      .order("desc")
      .take(limit);
  },
});

// Get file statistics
export const getFileStatistics = query({
  args: {},
  handler: async (ctx) => {
    const files = await ctx.db.query("files").collect();

    const stats = {
      totalFiles: files.length,
      totalSize: 0,
      byCategory: {
        product_image: { count: 0, size: 0 },
        model_image: { count: 0, size: 0 },
        generated_image: { count: 0, size: 0 },
        profile_image: { count: 0, size: 0 },
      },
      averageFileSize: 0,
    };

    files.forEach((file) => {
      stats.totalSize += file.size;
      stats.byCategory[file.category].count++;
      stats.byCategory[file.category].size += file.size;
    });

    stats.averageFileSize =
      stats.totalFiles > 0 ? Math.round(stats.totalSize / stats.totalFiles) : 0;

    return stats;
  },
});
