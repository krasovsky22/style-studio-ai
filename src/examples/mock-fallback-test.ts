// src/examples/mock-fallback-test.ts
/**
 * Mock Fallback System Test
 *
 * This example demonstrates both the primary (Picsum) and fallback (Canvas)
 * image generation systems in the mock service.
 */

import { generateMockImages } from "../services/mock-image-generation";
import { ImageGenerationRequest } from "../services/openai";

/**
 * Test the primary system (Picsum Photos)
 */
export async function testPrimarySystem() {
  console.log("🌐 Testing Primary System (Picsum Photos)");

  const request: ImageGenerationRequest = {
    prompt: "A beautiful fashion model in elegant attire",
    model: "dall-e-3-standard",
    quality: "high",
    aspectRatio: "1:1",
    style: "fashion",
    productImages: ["https://example.com/dress.jpg"],
    modelImages: ["https://example.com/model.jpg"],
    parameters: {},
  };

  try {
    const result = await generateMockImages(request);

    if (result.success) {
      console.log("✅ Primary system working!");
      console.log(`Generated ${result.images.length} images`);
      console.log(
        `Total size: ${result.images.reduce((acc, img) => acc + img.byteLength, 0)} bytes`
      );
      return { success: true, system: "primary" };
    } else {
      console.log("❌ Primary system failed:", result.error);
      return { success: false, system: "primary", error: result.error };
    }
  } catch (error) {
    console.log("💥 Primary system error:", error);
    return { success: false, system: "primary", error: String(error) };
  }
}

/**
 * Test the fallback system by simulating network failure
 */
export async function testFallbackSystem() {
  console.log("🎨 Testing Fallback System (Canvas Generation)");

  // Temporarily override fetch to simulate network failure
  const originalFetch = global.fetch;
  global.fetch = (() =>
    Promise.reject(new Error("Network unavailable"))) as typeof fetch;

  const request: ImageGenerationRequest = {
    prompt: "A stylish casual outfit with modern aesthetics",
    model: "dall-e-3-standard",
    quality: "high",
    aspectRatio: "16:9",
    style: "casual",
    productImages: ["https://example.com/shirt.jpg"],
    modelImages: [],
    parameters: {},
  };

  try {
    const result = await generateMockImages(request);

    // Restore original fetch
    global.fetch = originalFetch;

    if (result.success) {
      console.log("✅ Fallback system working!");
      console.log(`Generated ${result.images.length} canvas-based images`);
      console.log(
        `Average size: ${Math.round(result.images.reduce((acc, img) => acc + img.byteLength, 0) / result.images.length)} bytes per image`
      );
      return { success: true, system: "fallback" };
    } else {
      console.log("❌ Fallback system failed:", result.error);
      return { success: false, system: "fallback", error: result.error };
    }
  } catch (error) {
    // Restore original fetch in case of error
    global.fetch = originalFetch;
    console.log("💥 Fallback system error:", error);
    return { success: false, system: "fallback", error: String(error) };
  }
}

/**
 * Test different canvas styles and patterns
 */
export async function testCanvasVariations() {
  console.log("🎨 Testing Canvas Style Variations");

  const styles = ["realistic", "artistic", "fashion", "elegant", "casual"];
  const results: Array<{
    style: string;
    success: boolean;
    imageCount: number;
    avgSize: number;
    processingTime?: number;
  }> = [];

  // Override fetch to force canvas generation
  const originalFetch = global.fetch;
  global.fetch = (() =>
    Promise.reject(new Error("Forced canvas mode"))) as typeof fetch;

  try {
    for (const style of styles) {
      console.log(`\n🎯 Testing style: ${style}`);

      const request: ImageGenerationRequest = {
        prompt: `A ${style} fashion photograph`,
        model: "dall-e-3-standard",
        quality: "high",
        aspectRatio: "1:1",
        style: style,
        productImages: [`https://example.com/${style}.jpg`],
        modelImages: [],
        parameters: {},
      };

      const result = await generateMockImages(request);

      results.push({
        style,
        success: result.success,
        imageCount: result.images.length,
        avgSize:
          result.images.length > 0
            ? Math.round(
                result.images.reduce((acc, img) => acc + img.byteLength, 0) /
                  result.images.length
              )
            : 0,
        processingTime: result.metadata?.processingTime,
      });

      console.log(
        `📊 ${style}: ${result.success ? "Success" : "Failed"}, ${result.images.length} images, ${result.metadata?.processingTime}ms`
      );
    }
  } finally {
    // Always restore original fetch
    global.fetch = originalFetch;
  }

  console.log("\n📈 Canvas Style Variations Results:");
  console.table(results);

  return results;
}

/**
 * Run comprehensive fallback tests
 */
export async function runFallbackTests() {
  console.log("🧪 Running Mock Fallback System Tests\n");

  type TestResult = { success: boolean; system: string; error?: string };
  type VariationResult = {
    style: string;
    success: boolean;
    imageCount: number;
    avgSize: number;
    processingTime?: number;
  };

  const results: {
    primary: TestResult | null;
    fallback: TestResult | null;
    variations: VariationResult[];
  } = {
    primary: null,
    fallback: null,
    variations: [],
  };

  try {
    // Test primary system
    console.log("=".repeat(60));
    results.primary = await testPrimarySystem();

    // Test fallback system
    console.log("\n" + "=".repeat(60));
    results.fallback = await testFallbackSystem();

    // Test canvas variations
    console.log("\n" + "=".repeat(60));
    results.variations = await testCanvasVariations();

    console.log("\n✅ All fallback tests completed!");
    console.log("📊 Test Summary:");
    console.log(
      `Primary System: ${results.primary.success ? "✅ PASS" : "❌ FAIL"}`
    );
    console.log(
      `Fallback System: ${results.fallback.success ? "✅ PASS" : "❌ FAIL"}`
    );
    console.log(
      `Canvas Variations: ${results.variations.every((r) => r.success) ? "✅ PASS" : "❌ FAIL"}`
    );

    return results;
  } catch (error) {
    console.error("❌ Fallback tests failed:", error);
    throw error;
  }
}

// Export for potential Node.js usage
if (typeof require !== "undefined" && require.main === module) {
  runFallbackTests().catch(console.error);
}
