/**
 * Basic image analysis utilities for processing product and model images
 *
 * Note: This implementation handles both client-side and server-side environments.
 * - Client-side: Uses browser Image API for full analysis
 * - Server-side: Uses file metadata and intelligent defaults
 *
 * In production, you might use more sophisticated image analysis APIs or
 * machine learning models like:
 * - Sharp (Node.js image processing)
 * - Jimp (JavaScript image processing)
 * - Google Vision API
 * - Amazon Rekognition
 * - Custom ML models for clothing detection
 */

export interface ImageAnalysisResult {
  width: number;
  height: number;
  aspectRatio: string;
  dominantColors: string[];
  brightness: "dark" | "medium" | "bright";
  format: string;
  fileSize: number;
  quality: "low" | "medium" | "high";
}

export interface ProductAnalysis extends ImageAnalysisResult {
  productType: string;
  confidence: number;
  suggestedStyle: "realistic" | "artistic" | "minimal";
  detectedFeatures: string[];
}

/**
 * Analyze image from URL or File object
 */
export async function analyzeImage(
  source: string | File
): Promise<ImageAnalysisResult> {
  if (typeof source === "string") {
    return await analyzeImageFromUrl(source);
  } else {
    return await analyzeImageFromFile(source);
  }
}

/**
 * Analyze image from URL
 */
async function analyzeImageFromUrl(url: string): Promise<ImageAnalysisResult> {
  // Check if we're in a browser environment
  if (typeof window === "undefined") {
    // Server-side: Use metadata extraction from URL
    return analyzeImageFromUrlServer(url);
  }

  // Client-side: Use Image object
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      const result: ImageAnalysisResult = {
        width: img.naturalWidth,
        height: img.naturalHeight,
        aspectRatio: calculateAspectRatio(img.naturalWidth, img.naturalHeight),
        dominantColors: extractColorsFromFilename(url),
        brightness: estimateBrightness(url),
        format: getFormatFromUrl(url),
        fileSize: 0, // Can't determine from URL alone
        quality: estimateQuality(img.naturalWidth, img.naturalHeight),
      };

      resolve(result);
    };

    img.onerror = () => {
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
}

/**
 * Server-side image analysis from URL (simplified)
 */
async function analyzeImageFromUrlServer(
  url: string
): Promise<ImageAnalysisResult> {
  try {
    // In a production environment, you would use a proper image analysis library
    // For now, we'll extract what we can from the URL and make reasonable assumptions
    const format = getFormatFromUrl(url);

    // Default dimensions (would be fetched from actual image in production)
    const width = 1024;
    const height = 1024;

    return {
      width,
      height,
      aspectRatio: calculateAspectRatio(width, height),
      dominantColors: extractColorsFromFilename(url),
      brightness: estimateBrightness(url),
      format,
      fileSize: 0, // Can't determine from URL alone
      quality: "medium", // Default assumption
    };
  } catch (error) {
    console.error("Failed to analyze image from URL:", error);
    throw new Error("Failed to analyze image from URL");
  }
}

/**
 * Analyze image from File object
 */
async function analyzeImageFromFile(file: File): Promise<ImageAnalysisResult> {
  // Check if we're in a browser environment
  if (typeof window === "undefined") {
    // Server-side: Use file metadata only
    return analyzeImageFromFileServer(file);
  }

  // Client-side: Use FileReader and Image
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.onload = () => {
        const result: ImageAnalysisResult = {
          width: img.naturalWidth,
          height: img.naturalHeight,
          aspectRatio: calculateAspectRatio(
            img.naturalWidth,
            img.naturalHeight
          ),
          dominantColors: extractColorsFromFilename(file.name),
          brightness: "medium", // Would need actual pixel analysis
          format: file.type.split("/")[1] || "unknown",
          fileSize: file.size,
          quality: estimateQuality(img.naturalWidth, img.naturalHeight),
        };

        resolve(result);
      };

      img.onerror = () => reject(new Error("Failed to process image"));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

/**
 * Server-side image analysis from File object (simplified)
 */
async function analyzeImageFromFileServer(
  file: File
): Promise<ImageAnalysisResult> {
  try {
    // Extract what we can from file metadata
    const format = file.type.split("/")[1] || "unknown";

    // Default dimensions (would be extracted from actual image data in production)
    const width = 1024;
    const height = 1024;

    return {
      width,
      height,
      aspectRatio: calculateAspectRatio(width, height),
      dominantColors: extractColorsFromFilename(file.name),
      brightness: "medium", // Default assumption
      format,
      fileSize: file.size,
      quality: estimateQuality(width, height),
    };
  } catch (error) {
    console.error("Failed to analyze image file:", error);
    throw new Error("Failed to analyze image file");
  }
}

/**
 * Analyze product image for clothing detection
 */
export async function analyzeProductImage(
  source: string | File
): Promise<ProductAnalysis> {
  const baseAnalysis = await analyzeImage(source);
  const filename = typeof source === "string" ? source : source.name;

  // Detect product type
  const productType = detectProductType(filename);

  // Calculate confidence based on various factors
  const confidence = calculateProductConfidence(filename, baseAnalysis);

  // Suggest style based on image characteristics
  const suggestedStyle = suggestStyleForProduct(baseAnalysis, productType);

  // Detect features from filename and image characteristics
  const detectedFeatures = detectProductFeatures(filename, baseAnalysis);

  return {
    ...baseAnalysis,
    productType,
    confidence,
    suggestedStyle,
    detectedFeatures,
  };
}

/**
 * Calculate aspect ratio string from dimensions
 */
function calculateAspectRatio(width: number, height: number): string {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(width, height);
  const ratioW = width / divisor;
  const ratioH = height / divisor;

  // Map to common aspect ratios
  const commonRatios = {
    "1:1": [1, 1],
    "16:9": [16, 9],
    "9:16": [9, 16],
    "3:2": [3, 2],
    "2:3": [2, 3],
    "4:3": [4, 3],
    "3:4": [3, 4],
  };

  // Find closest match
  let closestRatio = "1:1";
  let minDifference = Infinity;

  for (const [ratio, [w, h]] of Object.entries(commonRatios)) {
    const difference = Math.abs(ratioW / ratioH - w / h);
    if (difference < minDifference) {
      minDifference = difference;
      closestRatio = ratio;
    }
  }

  return closestRatio;
}

/**
 * Extract color information from filename
 */
function extractColorsFromFilename(filename: string): string[] {
  const colorMap = {
    red: ["red", "crimson", "scarlet", "cherry"],
    blue: ["blue", "navy", "azure", "cobalt"],
    green: ["green", "emerald", "forest", "lime"],
    black: ["black", "dark", "noir"],
    white: ["white", "ivory", "cream", "pearl"],
    gray: ["gray", "grey", "silver", "charcoal"],
    pink: ["pink", "rose", "blush"],
    purple: ["purple", "violet", "lavender"],
    yellow: ["yellow", "gold", "amber"],
    orange: ["orange", "coral", "peach"],
    brown: ["brown", "tan", "beige", "khaki"],
  };

  const detectedColors: string[] = [];
  const lowerFilename = filename.toLowerCase();

  for (const [color, variants] of Object.entries(colorMap)) {
    if (variants.some((variant) => lowerFilename.includes(variant))) {
      detectedColors.push(color);
    }
  }

  return detectedColors;
}

/**
 * Estimate image brightness from filename or other indicators
 */
function estimateBrightness(source: string): "dark" | "medium" | "bright" {
  const lowerSource = source.toLowerCase();

  if (lowerSource.includes("dark") || lowerSource.includes("black")) {
    return "dark";
  }

  if (
    lowerSource.includes("bright") ||
    lowerSource.includes("white") ||
    lowerSource.includes("light")
  ) {
    return "bright";
  }

  return "medium";
}

/**
 * Get image format from URL
 */
function getFormatFromUrl(url: string): string {
  const extension = url.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "jpg":
    case "jpeg":
      return "jpeg";
    case "png":
      return "png";
    case "webp":
      return "webp";
    case "gif":
      return "gif";
    default:
      return "unknown";
  }
}

/**
 * Estimate image quality based on dimensions
 */
function estimateQuality(
  width: number,
  height: number
): "low" | "medium" | "high" {
  const totalPixels = width * height;

  if (totalPixels < 500000) {
    // Less than 0.5MP
    return "low";
  } else if (totalPixels < 2000000) {
    // Less than 2MP
    return "medium";
  } else {
    return "high";
  }
}

/**
 * Detect product type from filename
 */
function detectProductType(filename: string): string {
  const productPatterns = {
    shirt: ["shirt", "blouse", "top", "tee", "t-shirt", "polo", "tank"],
    dress: ["dress", "gown", "frock", "sundress", "maxi", "midi"],
    pants: ["pants", "trousers", "jeans", "slacks", "leggings", "denim"],
    jacket: ["jacket", "blazer", "coat", "cardigan", "hoodie", "sweater"],
    skirt: ["skirt", "mini", "maxi"],
    shoes: ["shoes", "sneakers", "heels", "boots", "sandals", "flats"],
    accessories: [
      "bag",
      "purse",
      "hat",
      "cap",
      "jewelry",
      "watch",
      "belt",
      "scarf",
    ],
  };

  const lowerFilename = filename.toLowerCase();

  for (const [type, patterns] of Object.entries(productPatterns)) {
    if (patterns.some((pattern) => lowerFilename.includes(pattern))) {
      return type;
    }
  }

  return "clothing"; // Default fallback
}

/**
 * Calculate confidence score for product detection
 */
function calculateProductConfidence(
  filename: string,
  analysis: ImageAnalysisResult
): number {
  let confidence = 0.5; // Base confidence

  // Increase confidence if filename contains clear product indicators
  const productKeywords = [
    "shirt",
    "dress",
    "pants",
    "jacket",
    "skirt",
    "shoes",
  ];
  if (
    productKeywords.some((keyword) => filename.toLowerCase().includes(keyword))
  ) {
    confidence += 0.3;
  }

  // Increase confidence based on image quality
  if (analysis.quality === "high") {
    confidence += 0.1;
  }

  // Increase confidence based on appropriate aspect ratio
  if (["3:2", "2:3", "4:3", "3:4"].includes(analysis.aspectRatio)) {
    confidence += 0.1;
  }

  return Math.min(confidence, 1.0); // Cap at 1.0
}

/**
 * Suggest style based on image characteristics
 */
function suggestStyleForProduct(
  analysis: ImageAnalysisResult,
  productType: string
): "realistic" | "artistic" | "minimal" {
  // High-end products might work better with artistic style
  if (productType === "dress" || productType === "jacket") {
    return "artistic";
  }

  // Simple products work well with minimal style
  if (productType === "shirt" || productType === "pants") {
    return "minimal";
  }

  // Default to realistic for most cases
  return "realistic";
}

/**
 * Detect product features from filename and analysis
 */
function detectProductFeatures(
  filename: string,
  analysis: ImageAnalysisResult
): string[] {
  const features: string[] = [];
  const lowerFilename = filename.toLowerCase();

  // Add color features
  features.push(...analysis.dominantColors.map((color) => `color_${color}`));

  // Add style features
  const styleKeywords = {
    casual: ["casual", "everyday", "relaxed"],
    formal: ["formal", "dress", "business", "professional"],
    sporty: ["sport", "athletic", "gym", "workout"],
    vintage: ["vintage", "retro", "classic"],
    modern: ["modern", "contemporary", "trendy"],
  };

  for (const [style, keywords] of Object.entries(styleKeywords)) {
    if (keywords.some((keyword) => lowerFilename.includes(keyword))) {
      features.push(`style_${style}`);
    }
  }

  // Add quality indicator
  features.push(`quality_${analysis.quality}`);

  // Add aspect ratio
  features.push(`aspect_${analysis.aspectRatio.replace(":", "_")}`);

  return features;
}

/**
 * Validate image for AI generation
 */
export function validateImageForGeneration(analysis: ImageAnalysisResult): {
  valid: boolean;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Check minimum dimensions
  if (analysis.width < 512 || analysis.height < 512) {
    errors.push("Image resolution too low (minimum 512x512 pixels)");
  }

  // Check file size (for File objects)
  if (analysis.fileSize > 10 * 1024 * 1024) {
    // 10MB
    errors.push("File size too large (maximum 10MB)");
  }

  // Check format
  if (!["jpeg", "png", "webp"].includes(analysis.format)) {
    errors.push("Unsupported image format (use JPEG, PNG, or WebP)");
  }

  // Warnings for suboptimal conditions
  if (analysis.quality === "low") {
    warnings.push("Low image quality may affect generation results");
  }

  if (
    analysis.aspectRatio === "1:1" &&
    (analysis.width < 1024 || analysis.height < 1024)
  ) {
    warnings.push("Square images work best at 1024x1024 or higher");
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors,
  };
}

/**
 * Get optimal generation parameters based on image analysis
 */
export function getOptimalGenerationParams(analysis: ProductAnalysis): {
  suggestedAspectRatio: string;
  suggestedQuality: string;
  suggestedStyle: string;
} {
  return {
    suggestedAspectRatio: analysis.aspectRatio,
    suggestedQuality: analysis.quality === "high" ? "high" : "standard",
    suggestedStyle: analysis.suggestedStyle,
  };
}
