// src/examples/mock-generation-example.ts
/**
 * Mock Image Generation Example
 *
 * This example demonstrates how to use the mock image generation feature
 * for development and testing purposes.
 */

import { generateImages } from "@/lib/openai";
import { ImageGenerationRequest } from "@/lib/openai";
import { getEnvironmentInfo } from "@/lib/environment";

/**
 * Example function showing how to use mock image generation
 */
export async function exampleMockGeneration() {
  console.log("🚀 Starting Mock Image Generation Example");
  console.log("Environment Info:", getEnvironmentInfo());

  // Example generation request
  const request: ImageGenerationRequest = {
    prompt:
      "A stylish casual outfit with jeans and a comfortable sweater, worn by a professional model in a modern studio setting",
    model: "dall-e-3-standard",
    quality: "high",
    aspectRatio: "1:1",
    style: "realistic",
    productImages: [
      "https://example.com/product1.jpg", // These would be real URLs in production
      "https://example.com/product2.jpg",
    ],
    modelImages: ["https://example.com/model1.jpg"],
    customPrompt: "Make it look professional and modern",
    parameters: {
      guidance_scale: 7.5,
      num_inference_steps: 50,
      strength: 0.8,
      seed: 12345,
    },
  };

  try {
    console.log("🎨 Generating images...");
    console.log("Request:", {
      model: request.model,
      quality: request.quality,
      aspectRatio: request.aspectRatio,
      promptLength: request.prompt.length,
      productImageCount: request.productImages?.length || 0,
      modelImageCount: request.modelImages?.length || 0,
    });

    const result = await generateImages(request);

    if (result.success) {
      console.log("✅ Generation successful!");
      console.log("Generated images:", result.images.length);
      console.log("Processing time:", result.metadata?.processingTime, "ms");
      console.log("Model used:", result.metadata?.model);

      // Log image buffer sizes for verification
      result.images.forEach((image, index) => {
        console.log(`📸 Image ${index + 1}: ${image.byteLength} bytes`);
      });

      return {
        success: true,
        imageCount: result.images.length,
        totalSize: result.images.reduce((acc, img) => acc + img.byteLength, 0),
        processingTime: result.metadata?.processingTime,
      };
    } else {
      console.error("❌ Generation failed:", result.error);
      return {
        success: false,
        error: result.error,
      };
    }
  } catch (error) {
    console.error("💥 Unexpected error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Example showing different quality settings
 */
export async function exampleQualityComparison() {
  console.log("🔍 Testing different quality settings...");

  const baseRequest: Omit<ImageGenerationRequest, "quality"> = {
    prompt: "A beautiful fashion model wearing an elegant dress",
    model: "dall-e-3-standard",
    aspectRatio: "1:1",
    style: "fashion",
    productImages: ["https://example.com/dress.jpg"],
    modelImages: ["https://example.com/model.jpg"],
    parameters: {},
  };

  const qualities = ["auto", "medium", "low"] as const;
  const results = [];

  for (const quality of qualities) {
    console.log(`\n🎯 Testing quality: ${quality}`);
    const startTime = Date.now();

    const result = await generateImages({
      ...baseRequest,
      quality,
    });

    const endTime = Date.now();
    const processingTime = endTime - startTime;

    results.push({
      quality,
      success: result.success,
      imageCount: result.images.length,
      processingTime,
      totalSize: result.images.reduce((acc, img) => acc + img.byteLength, 0),
    });

    console.log(
      `⏱️  ${quality} quality: ${processingTime}ms, ${result.images.length} images`
    );
  }

  console.log("\n📊 Quality Comparison Results:");
  console.table(results);

  return results;
}

/**
 * Example showing different aspect ratios
 */
export async function exampleAspectRatios() {
  console.log("📐 Testing different aspect ratios...");

  const baseRequest: Omit<ImageGenerationRequest, "aspectRatio"> = {
    prompt: "A stylish outfit showcase",
    model: "dall-e-3-standard",
    quality: "auto",
    style: "realistic",
    productImages: ["https://example.com/outfit.jpg"],
    parameters: {},
  };

  const aspectRatios = ["1:1", "16:9", "9:16", "4:3", "3:4"] as const;
  const results = [];

  for (const aspectRatio of aspectRatios) {
    console.log(`\n📏 Testing aspect ratio: ${aspectRatio}`);

    const result = await generateImages({
      ...baseRequest,
      aspectRatio,
    });

    results.push({
      aspectRatio,
      success: result.success,
      imageCount: result.images.length,
      averageSize:
        result.images.length > 0
          ? Math.round(
              result.images.reduce((acc, img) => acc + img.byteLength, 0) /
                result.images.length
            )
          : 0,
    });

    console.log(
      `📸 ${aspectRatio}: ${result.success ? "Success" : "Failed"}, ${result.images.length} images`
    );
  }

  console.log("\n📊 Aspect Ratio Results:");
  console.table(results);

  return results;
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  console.log("🎭 Running Mock Image Generation Examples\n");

  try {
    // Basic generation example
    console.log("=".repeat(50));
    console.log("1. Basic Mock Generation");
    console.log("=".repeat(50));
    await exampleMockGeneration();

    // Quality comparison
    console.log("\n" + "=".repeat(50));
    console.log("2. Quality Comparison");
    console.log("=".repeat(50));
    await exampleQualityComparison();

    // Aspect ratio testing
    console.log("\n" + "=".repeat(50));
    console.log("3. Aspect Ratio Testing");
    console.log("=".repeat(50));
    await exampleAspectRatios();

    console.log("\n✅ All examples completed successfully!");
  } catch (error) {
    console.error("❌ Examples failed:", error);
  }
}

// Export for potential Node.js usage
if (typeof require !== "undefined" && require.main === module) {
  runAllExamples().catch(console.error);
}
