import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { API_ERROR_CODES } from "@/constants/api-errors";
import {
  fileManagementService,
  FileCategory,
} from "@/services/file-management";
import { Id } from "../../../../convex/_generated/dataModel";

const uploadSchema = z.object({
  category: z
    .enum(["product_image", "model_image", "generated_image", "profile_image"])
    .default("product_image"),
  generationId: z.string().optional(),
  isPrimary: z.boolean().optional(),
  imageOrder: z.number().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required",
          code: API_ERROR_CODES.AUTHENTICATION_REQUIRED,
        },
        { status: 401 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const category = (formData.get("category") as string) || "product_image";
    const generationId = formData.get("generationId") as string | null;
    const isPrimary = formData.get("isPrimary") === "true";
    const imageOrder = formData.get("imageOrder")
      ? parseInt(formData.get("imageOrder") as string, 10)
      : undefined;

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: "No file provided",
          code: API_ERROR_CODES.VALIDATION_ERROR,
        },
        { status: 400 }
      );
    }

    // Validate form data
    const validationResult = uploadSchema.safeParse({
      category,
      generationId: generationId || undefined,
      isPrimary,
      imageOrder,
    });
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid parameters",
          code: API_ERROR_CODES.VALIDATION_ERROR,
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          success: false,
          error: "File too large. Maximum size is 10MB",
          code: API_ERROR_CODES.VALIDATION_ERROR,
        },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid file type. Only JPEG, PNG, and WebP are allowed",
          code: API_ERROR_CODES.VALIDATION_ERROR,
        },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();

    // Upload using file management service
    const uploadResult = await fileManagementService.uploadImage(
      bytes,
      session.user.id as Id<"users">,
      {
        category: validationResult.data.category as FileCategory,
        filename: file.name,
        generationId: validationResult.data.generationId as
          | Id<"generations">
          | undefined,
        isPrimary: validationResult.data.isPrimary,
        imageOrder: validationResult.data.imageOrder,
      }
    );

    return NextResponse.json({
      success: true,
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      fileId: uploadResult.fileId,
      metadata: uploadResult.metadata,
    });
  } catch (error) {
    console.error("Upload error:", error);

    // Handle specific file management errors
    if (error instanceof Error && error.name === "FileManagementError") {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: "FILE_MANAGEMENT_ERROR",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to upload image",
        code: API_ERROR_CODES.SERVER_ERROR,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required",
          code: API_ERROR_CODES.AUTHENTICATION_REQUIRED,
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("fileId");

    // Try to delete by fileId first (preferred), then by publicId
    if (fileId) {
      await fileManagementService.deleteFile(
        fileId as Id<"files">,
        session.user.id as Id<"users">
      );
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "File ID required",
          code: API_ERROR_CODES.VALIDATION_ERROR,
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Delete error:", error);

    // Handle specific file management errors
    if (error instanceof Error && error.name === "FileManagementError") {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: "FILE_MANAGEMENT_ERROR",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete image",
        code: API_ERROR_CODES.SERVER_ERROR,
      },
      { status: 500 }
    );
  }
}
