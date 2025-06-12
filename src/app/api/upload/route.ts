import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { v2 as cloudinary } from "cloudinary";
import { z } from "zod";
import { API_ERROR_CODES } from "@/constants/api-errors";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Cloudinary upload result type
interface CloudinaryUploadResult {
  width: number;
  height: number;
  format: string;
  bytes: number;
  public_id: string;
  secure_url: string;
}

const uploadSchema = z.object({
  category: z
    .enum(["product_image", "model_image", "generated_image", "profile_image"])
    .default("product_image"),
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

    // Validate category
    const validationResult = uploadSchema.safeParse({ category });
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid category",
          code: API_ERROR_CODES.VALIDATION_ERROR,
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
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary
    const uploadResult = await new Promise<CloudinaryUploadResult>(
      (resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              resource_type: "image",
              folder: `style-studio-ai/${validationResult.data.category}`,
              public_id: `${session.user.id}_${Date.now()}`,
              transformation: [{ quality: "auto" }, { fetch_format: "auto" }],
            },
            (error, result) => {
              if (error) {
                reject(error);
              } else if (result) {
                resolve({
                  width: result.width,
                  height: result.height,
                  format: result.format,
                  bytes: result.bytes,
                  public_id: result.public_id,
                  secure_url: result.secure_url,
                });
              } else {
                reject(new Error("Upload failed - no result"));
              }
            }
          )
          .end(buffer);
      }
    );

    // Extract metadata
    const metadata = {
      width: uploadResult.width,
      height: uploadResult.height,
      format: uploadResult.format,
      bytes: uploadResult.bytes,
      publicId: uploadResult.public_id,
      secureUrl: uploadResult.secure_url,
    };

    return NextResponse.json({
      success: true,
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      metadata,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload image" },
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
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const publicId = searchParams.get("publicId");

    if (!publicId) {
      return NextResponse.json(
        { error: "Public ID is required" },
        { status: 400 }
      );
    }

    // Delete from Cloudinary
    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result === "ok") {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: "Failed to delete image" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete image" },
      { status: 500 }
    );
  }
}
