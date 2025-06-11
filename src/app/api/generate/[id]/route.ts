import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { fetchQuery } from "convex/nextjs";

interface GenerationStatusParams {
  params: {
    id: string;
  };
}

export async function GET(
  request: NextRequest,
  { params }: GenerationStatusParams
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const generationId = params.id as Id<"generations">;

    // Fetch generation status from Convex
    const generation = await fetchQuery(api.generations.getGeneration, {
      id: generationId,
    });

    if (!generation) {
      return NextResponse.json(
        { error: "Generation not found" },
        { status: 404 }
      );
    }

    // Check if user owns this generation
    if (generation.userId !== session.user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json(generation);
  } catch (error) {
    console.error("Failed to fetch generation status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
