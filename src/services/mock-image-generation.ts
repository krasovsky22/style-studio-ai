// src/services/mock-image-generation.ts
/**
 * Mock Image Generation Service
 *
 * This service provides placeholder images for development and testing purposes
 * without consuming OpenAI API credits. It uses a two-tier fallback system:
 *
 * 1. **Primary**: Fetch realistic images from Picsum Photos API
 * 2. **Fallback**: Generate canvas-based images with custom styling and overlays
 *
 * The fallback system ensures the mock generation always works, even offline.
 */

import { ImageGenerationRequest, ImageGenerationResponse } from "../lib/openai";

/**
 * Generates mock placeholder images as ArrayBuffers
 */
export async function generateMockImages(
  request: ImageGenerationRequest
): Promise<ImageGenerationResponse> {
  const startTime = Date.now();

  try {
    console.log("🎭 Mock Image Generation - Generating placeholder images...", {
      model: request.model,
      quality: request.quality,
      aspectRatio: request.aspectRatio,
      prompt: request.prompt.substring(0, 100) + "...",
    });

    // Simulate realistic processing time based on quality
    const processingTime = getSimulatedProcessingTime(request.quality);
    await new Promise((resolve) => setTimeout(resolve, processingTime));

    // Generate placeholder images
    const images = await createPlaceholderImages(request);

    const actualProcessingTime = Date.now() - startTime;

    console.log("✅ Mock Image Generation - Completed successfully", {
      imageCount: images.length,
      processingTime: actualProcessingTime,
    });

    return {
      success: true,
      images,
      metadata: {
        model: request.model,
        prompt: request.prompt,
        processingTime: actualProcessingTime,
      },
    };
  } catch (error) {
    console.error("❌ Mock Image Generation - Failed:", error);

    return {
      success: false,
      images: [],
      error: error instanceof Error ? error.message : "Mock generation failed",
      metadata: {
        model: request.model,
        prompt: request.prompt,
        processingTime: Date.now() - startTime,
      },
    };
  }
}

/**
 * Creates placeholder images as ArrayBuffers
 */
async function createPlaceholderImages(
  request: ImageGenerationRequest
): Promise<ArrayBuffer[]> {
  const images: ArrayBuffer[] = [];
  const imageCount = 3; // Generate 3 placeholder images like the real API

  for (let i = 0; i < imageCount; i++) {
    const placeholderImage = await createSinglePlaceholderImage(request, i);
    images.push(placeholderImage);
  }

  return images;
}

/**
 * Creates a unique seed for consistent placeholder generation
 */
function createSeed(request: ImageGenerationRequest, index: number): string {
  const promptHash = request.prompt
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);

  return `${request.model}-${request.quality}-${request.aspectRatio}-${promptHash}-${index}`;
}

/**
 * Adds mock overlay information to an existing image buffer
 */
async function addMockImageOverlay(
  imageBuffer: ArrayBuffer,
  request: ImageGenerationRequest,
  index: number
): Promise<ArrayBuffer> {
  // For now, just return the original buffer
  // In a more sophisticated implementation, you could:
  // 1. Decode the image
  // 2. Add text overlay with generation info
  // 3. Re-encode the image
  console.log(
    `📝 Adding mock overlay to image ${index + 1} for ${request.model}`
  );
  return imageBuffer;
}

/**
 * Creates a single placeholder image as ArrayBuffer using placeholder service
 */
async function createSinglePlaceholderImage(
  request: ImageGenerationRequest,
  index: number
): Promise<ArrayBuffer> {
  try {
    // Get dimensions based on aspect ratio
    const dimensions = getImageDimensions(request.aspectRatio);

    // Create a unique seed based on request parameters
    const seed = createSeed(request, index);

    // Use a placeholder image service that generates unique images
    const placeholderUrl = `https://picsum.photos/seed/${seed}/${dimensions.width}/${dimensions.height}`;

    console.log(`🖼️  Generating mock image ${index + 1}/3:`, placeholderUrl);

    // Fetch the placeholder image
    const response = await fetch(placeholderUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch placeholder image: ${response.statusText}`
      );
    }

    const imageBuffer = await response.arrayBuffer();

    // Add some randomness to make images look different
    return await addMockImageOverlay(imageBuffer, request, index);
  } catch (error) {
    console.warn(
      "Failed to fetch online placeholder, using local generation:",
      error
    );
    // Fallback to local canvas generation
    return createLocalPlaceholderImage(request, index);
  }
}

/**
 * Creates a local placeholder image using canvas (fallback method)
 */
async function createLocalPlaceholderImage(
  request: ImageGenerationRequest,
  index: number
): Promise<ArrayBuffer> {
  console.log(`🎨 Creating local canvas placeholder image ${index + 1}/3`);

  // Get dimensions based on aspect ratio
  const dimensions = getImageDimensions(request.aspectRatio);

  // Create canvas for generating placeholder image
  const canvas = createCanvas(dimensions.width, dimensions.height);
  const ctx = canvas.getContext("2d")!;

  // Generate gradient background based on style
  const colors = getColorsForStyle(request.style || "realistic");
  const gradient = ctx.createLinearGradient(
    0,
    0,
    dimensions.width,
    dimensions.height
  );
  gradient.addColorStop(0, colors.primary);
  gradient.addColorStop(0.5, colors.secondary);
  gradient.addColorStop(1, colors.accent);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, dimensions.width, dimensions.height);

  // Add overlay pattern
  addOverlayPattern(ctx, dimensions, index);

  // Add text overlay with generation info
  addTextOverlay(ctx, dimensions, request, index);

  // Convert canvas to ArrayBuffer
  return await canvasToArrayBuffer(canvas);
}

/**
 * Gets image dimensions based on aspect ratio
 */
function getImageDimensions(aspectRatio: string): {
  width: number;
  height: number;
} {
  const ratioMap: Record<string, { width: number; height: number }> = {
    "1:1": { width: 1024, height: 1024 },
    "16:9": { width: 1792, height: 1024 },
    "9:16": { width: 1024, height: 1792 },
    "4:3": { width: 1024, height: 768 },
    "3:4": { width: 768, height: 1024 },
  };

  return ratioMap[aspectRatio] || ratioMap["1:1"];
}

// ============================================================================
// CANVAS-BASED IMAGE GENERATION (Fallback SYSTEM)
// ============================================================================
// These functions create images locally when external services are unavailable

/**
 * Gets color scheme based on style
 */
function getColorsForStyle(style: string): {
  primary: string;
  secondary: string;
  accent: string;
} {
  const styleColors: Record<
    string,
    { primary: string; secondary: string; accent: string }
  > = {
    realistic: {
      primary: "#4F46E5",
      secondary: "#7C3AED",
      accent: "#EC4899",
    },
    artistic: {
      primary: "#F59E0B",
      secondary: "#EF4444",
      accent: "#8B5CF6",
    },
    fashion: {
      primary: "#EC4899",
      secondary: "#F59E0B",
      accent: "#10B981",
    },
    elegant: {
      primary: "#6B7280",
      secondary: "#374151",
      accent: "#D1D5DB",
    },
    casual: {
      primary: "#10B981",
      secondary: "#06B6D4",
      accent: "#F59E0B",
    },
  };

  return styleColors[style] || styleColors.realistic;
}

/**
 * Adds overlay pattern to the canvas
 */
function addOverlayPattern(
  ctx: CanvasRenderingContext2D,
  dimensions: { width: number; height: number },
  index: number
): void {
  // Add subtle pattern overlay
  ctx.globalAlpha = 0.1;

  const patternSize = 50;
  const patterns = ["dots", "stripes", "grid"];
  const pattern = patterns[index % patterns.length];

  ctx.fillStyle = "#FFFFFF";

  switch (pattern) {
    case "dots":
      for (let x = 0; x < dimensions.width; x += patternSize) {
        for (let y = 0; y < dimensions.height; y += patternSize) {
          ctx.beginPath();
          ctx.arc(x, y, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;

    case "stripes":
      for (let x = 0; x < dimensions.width; x += patternSize) {
        ctx.fillRect(x, 0, 10, dimensions.height);
      }
      break;

    case "grid":
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#FFFFFF";
      for (let x = 0; x < dimensions.width; x += patternSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, dimensions.height);
        ctx.stroke();
      }
      for (let y = 0; y < dimensions.height; y += patternSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(dimensions.width, y);
        ctx.stroke();
      }
      break;
  }

  ctx.globalAlpha = 1;
}

/**
 * Adds text overlay with generation information
 */
function addTextOverlay(
  ctx: CanvasRenderingContext2D,
  dimensions: { width: number; height: number },
  request: ImageGenerationRequest,
  index: number
): void {
  // Configure text style
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 24px Arial";
  ctx.textAlign = "center";
  ctx.shadowColor = "#000000";
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;

  const centerX = dimensions.width / 2;
  const centerY = dimensions.height / 2;

  // Main title
  ctx.fillText("STYLE STUDIO AI", centerX, centerY - 60);

  // Subtitle
  ctx.font = "18px Arial";
  ctx.fillText("Mock Generated Image", centerX, centerY - 30);

  // Generation details
  ctx.font = "14px Arial";
  ctx.fillText(`Model: ${request.model}`, centerX, centerY + 10);
  ctx.fillText(`Quality: ${request.quality}`, centerX, centerY + 30);
  ctx.fillText(`Image ${index + 1}/3`, centerX, centerY + 50);

  // Timestamp
  ctx.font = "12px Arial";
  ctx.fillText(new Date().toLocaleString(), centerX, centerY + 80);

  // Reset shadow
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

/**
 * Simulates realistic processing time based on quality
 */
function getSimulatedProcessingTime(quality: string): number {
  const timeMap: Record<string, number> = {
    auto: 1000, // 1 second
    standard: 1500, // 1.5 seconds
    high: 2000, // 2 seconds
    ultra: 3000, // 3 seconds
  };

  return timeMap[quality] || 1500;
}

/**
 * Creates a canvas element (works in both browser and Node.js environments)
 */
function createCanvas(width: number, height: number): HTMLCanvasElement {
  if (typeof window !== "undefined") {
    // Browser environment
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
  } else {
    // Node.js environment - create a minimal canvas implementation
    // This is a simplified version that works with the 2D context
    const canvas = {
      width,
      height,
      getContext: (type: string) => {
        if (type === "2d") {
          return createMockCanvasContext(width, height);
        }
        return null;
      },
    } as HTMLCanvasElement;
    return canvas;
  }
}

/**
 * Creates a mock canvas context for Node.js environment
 */
function createMockCanvasContext(
  width: number,
  height: number
): CanvasRenderingContext2D {
  // This is a simplified mock that provides the basic interface
  // In a real implementation, you might want to use a library like 'canvas' for Node.js
  const context = {
    fillStyle: "#000000",
    strokeStyle: "#000000",
    lineWidth: 1,
    font: "10px sans-serif",
    textAlign: "start" as CanvasTextAlign,
    globalAlpha: 1,
    shadowColor: "transparent",
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,

    fillRect: () => {},
    strokeRect: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    arc: () => {},
    fill: () => {},
    stroke: () => {},
    fillText: () => {},
    createLinearGradient: () => ({
      addColorStop: () => {},
    }),

    // Mock canvas reference
    canvas: { width, height },
  } as unknown as CanvasRenderingContext2D;

  return context;
}

/**
 * Converts canvas to ArrayBuffer
 */
async function canvasToArrayBuffer(
  canvas: HTMLCanvasElement
): Promise<ArrayBuffer> {
  if (typeof window !== "undefined" && canvas.toBlob) {
    // Browser environment
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          blob.arrayBuffer().then(resolve).catch(reject);
        } else {
          reject(new Error("Failed to create blob from canvas"));
        }
      }, "image/png");
    });
  } else {
    // Node.js environment - create a simple PNG-like buffer
    return createSimplePlaceholderBuffer();
  }
}

/**
 * Creates a simple placeholder buffer for Node.js environment
 */
function createSimplePlaceholderBuffer(): ArrayBuffer {
  // Create a more realistic placeholder with actual image data
  // This generates a simple gradient PNG that's recognizable as a placeholder
  const width = 1024;
  const height = 1024;
  const pixelCount = width * height;

  // Create RGBA pixel data for a gradient
  const imageData = new Uint8Array(pixelCount * 4);

  for (let i = 0; i < pixelCount; i++) {
    const x = i % width;
    const y = Math.floor(i / width);
    const offset = i * 4;

    // Create a gradient effect
    const r = Math.floor((x / width) * 255);
    const g = Math.floor((y / height) * 255);
    const b = Math.floor(((x + y) / (width + height)) * 255);

    imageData[offset] = r; // Red
    imageData[offset + 1] = g; // Green
    imageData[offset + 2] = b; // Blue
    imageData[offset + 3] = 255; // Alpha
  }

  // For simplicity, we'll create a minimal buffer that represents image data
  // In a real implementation, you'd encode this as a proper PNG
  return imageData.buffer;
}
