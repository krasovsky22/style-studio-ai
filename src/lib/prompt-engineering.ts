import {
  PROMPT_TEMPLATES,
  STYLE_VARIATIONS,
  QUALITY_MODIFIERS,
  COMMON_NEGATIVE_PROMPTS,
  PRODUCT_PATTERNS,
  MODEL_DESCRIPTIONS,
} from "@/constants/prompts";
import { PromptResult, GenerationOptions } from "@/types/generation";

/**
 * Core prompt engineering service for generating optimized AI prompts
 */
export class PromptEngineer {
  /**
   * Generate a complete prompt based on generation options
   */
  generatePrompt(options: GenerationOptions): PromptResult {
    // Analyze product image and extract information
    const productInfo = this.analyzeProductImage(options.productImageUrl);

    // Select appropriate template
    const template = this.selectTemplate(productInfo.type);

    // Build prompt components
    const components = this.buildPromptComponents(options, productInfo);

    // Generate main prompt
    const prompt = this.assemblePrompt(template, components);

    // Generate negative prompt
    const negativePrompt = this.generateNegativePrompt(options);

    // Enhance prompt with additional details
    const enhancedPrompt = this.enhancePrompt(prompt, options);

    return {
      prompt: enhancedPrompt,
      negativePrompt,
      enhancedPrompt,
      detectedElements: productInfo.detectedElements,
    };
  }

  /**
   * Analyze product image URL to extract product information
   * Note: This is a simplified version. In a real implementation,
   * you might use image analysis APIs or machine learning models
   */
  private analyzeProductImage(imageUrl: string): {
    type: string;
    description: string;
    colors: string[];
    detectedElements: string[];
  } {
    // For now, we'll do basic analysis based on filename or URL patterns
    // In production, this would use actual image analysis

    const filename = imageUrl.toLowerCase();
    let type = "clothing";
    const detectedElements: string[] = [];

    // Detect product type
    for (const [productType, patterns] of Object.entries(PRODUCT_PATTERNS)) {
      if (patterns.some((pattern) => filename.includes(pattern))) {
        type = productType;
        detectedElements.push(`product_type:${productType}`);
        break;
      }
    }

    // Extract basic description
    const description = this.generateProductDescription(type, filename);

    // Detect colors (simplified)
    const colors = this.detectColors(filename);

    return {
      type,
      description,
      colors,
      detectedElements: [
        ...detectedElements,
        ...colors.map((c) => `color:${c}`),
      ],
    };
  }

  /**
   * Select the most appropriate prompt template
   */
  private selectTemplate(productType: string): string {
    if (productType in PRODUCT_PATTERNS) {
      return PROMPT_TEMPLATES.clothing;
    }
    return PROMPT_TEMPLATES.base;
  }

  /**
   * Build prompt components based on options and product info
   */
  private buildPromptComponents(
    options: GenerationOptions,
    productInfo: { type: string; description: string; colors: string[] }
  ) {
    const styleConfig = STYLE_VARIATIONS[options.style];
    const qualityConfig = QUALITY_MODIFIERS[options.quality];

    return {
      product_type: productInfo.type,
      product_description: productInfo.description,
      model_description: this.selectModelDescription(
        options.style,
        options.modelImageUrl
      ),
      setting: styleConfig.setting,
      style_modifiers: styleConfig.modifiers,
      quality_modifiers: qualityConfig.positive,
    };
  }

  /**
   * Assemble the final prompt from template and components
   */
  private assemblePrompt(
    template: string,
    components: Record<string, string>
  ): string {
    let prompt = template;

    // Replace placeholders with actual values
    for (const [key, value] of Object.entries(components)) {
      const placeholder = `{${key}}`;
      prompt = prompt.replace(new RegExp(placeholder, "g"), value);
    }

    return prompt;
  }

  /**
   * Generate negative prompt to avoid unwanted elements
   */
  private generateNegativePrompt(options: GenerationOptions): string {
    const styleConfig = STYLE_VARIATIONS[options.style];
    const qualityConfig = QUALITY_MODIFIERS[options.quality];

    const negativeElements = [
      ...COMMON_NEGATIVE_PROMPTS,
      styleConfig.negative,
      qualityConfig.negative,
    ];

    // Add custom negative prompts based on options
    if (!options.modelImageUrl) {
      negativeElements.push("multiple faces", "group photo");
    }

    return negativeElements.filter(Boolean).join(", ");
  }

  /**
   * Enhance prompt with additional details and optimizations
   */
  private enhancePrompt(
    basePrompt: string,
    options: GenerationOptions
  ): string {
    let enhanced = basePrompt;

    // Add custom prompt if provided
    if (options.customPrompt) {
      enhanced = `${enhanced}, ${options.customPrompt}`;
    }

    // Add aspect ratio specific enhancements
    enhanced = this.addAspectRatioEnhancements(enhanced, options.aspectRatio);

    // Add quality-specific enhancements
    enhanced = this.addQualityEnhancements(enhanced, options.quality);

    // Clean up and optimize
    enhanced = this.cleanupPrompt(enhanced);

    return enhanced;
  }

  /**
   * Generate product description based on type and analysis
   */
  private generateProductDescription(type: string, filename: string): string {
    const baseDescriptions = {
      shirt: "elegant shirt",
      dress: "beautiful dress",
      pants: "stylish pants",
      jacket: "fashionable jacket",
      skirt: "trendy skirt",
      shoes: "stylish footwear",
      accessories: "fashionable accessory",
    };

    let description =
      baseDescriptions[type as keyof typeof baseDescriptions] ||
      "fashionable garment";

    // Add color information if detected
    const detectedColors = this.detectColors(filename);
    if (detectedColors.length > 0) {
      description = `${detectedColors[0]} ${description}`;
    }

    return description;
  }

  /**
   * Detect colors from filename (simplified implementation)
   */
  private detectColors(filename: string): string[] {
    const colorPatterns = {
      red: ["red", "crimson", "scarlet"],
      blue: ["blue", "navy", "azure"],
      green: ["green", "emerald", "forest"],
      black: ["black", "dark"],
      white: ["white", "ivory", "cream"],
      gray: ["gray", "grey", "silver"],
      pink: ["pink", "rose"],
      purple: ["purple", "violet"],
      yellow: ["yellow", "gold"],
      orange: ["orange", "coral"],
    };

    const detected: string[] = [];

    for (const [color, patterns] of Object.entries(colorPatterns)) {
      if (patterns.some((pattern) => filename.includes(pattern))) {
        detected.push(color);
      }
    }

    return detected;
  }

  /**
   * Select appropriate model description
   */
  private selectModelDescription(
    style: string,
    hasModelImage?: string
  ): string {
    const descriptions =
      MODEL_DESCRIPTIONS[style as keyof typeof MODEL_DESCRIPTIONS] ||
      MODEL_DESCRIPTIONS.realistic;

    if (hasModelImage) {
      return "the model"; // Use the provided model image
    }

    // Select random description from style-appropriate options
    return descriptions[Math.floor(Math.random() * descriptions.length)];
  }

  /**
   * Add aspect ratio specific enhancements
   */
  private addAspectRatioEnhancements(
    prompt: string,
    aspectRatio: string
  ): string {
    const enhancements = {
      "1:1": "centered composition, balanced framing",
      "16:9": "wide composition, horizontal framing",
      "9:16": "vertical composition, portrait orientation",
      "3:2": "classic photo proportions",
      "2:3": "portrait proportions",
    };

    const enhancement = enhancements[aspectRatio as keyof typeof enhancements];
    return enhancement ? `${prompt}, ${enhancement}` : prompt;
  }

  /**
   * Add quality specific enhancements
   */
  private addQualityEnhancements(prompt: string, quality: string): string {
    const enhancements = {
      standard: "good lighting, clear focus",
      high: "professional lighting, sharp focus, high detail",
      ultra: "studio lighting, perfect focus, ultra sharp, maximum detail",
    };

    const enhancement = enhancements[quality as keyof typeof enhancements];
    return enhancement ? `${prompt}, ${enhancement}` : prompt;
  }

  /**
   * Clean up and optimize the final prompt
   */
  private cleanupPrompt(prompt: string): string {
    return prompt
      .replace(/\s+/g, " ") // Replace multiple spaces with single space
      .replace(/,\s*,/g, ",") // Remove duplicate commas
      .replace(/,\s*$/, "") // Remove trailing comma
      .trim();
  }

  /**
   * Validate prompt length and content
   */
  validatePrompt(prompt: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (prompt.length > 500) {
      errors.push("Prompt too long (max 500 characters)");
    }

    if (prompt.length < 10) {
      errors.push("Prompt too short (min 10 characters)");
    }

    // Check for potentially problematic content
    const problematicTerms = ["nsfw", "nude", "sexual"];
    for (const term of problematicTerms) {
      if (prompt.toLowerCase().includes(term)) {
        errors.push(`Prompt contains inappropriate content: ${term}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// Export singleton instance
export const promptEngineer = new PromptEngineer();

// Utility functions
export function quickPrompt(
  productDescription: string,
  style: "realistic" | "artistic" | "minimal" = "realistic"
): string {
  const styleConfig = STYLE_VARIATIONS[style];
  const qualityConfig = QUALITY_MODIFIERS.standard;

  return `${productDescription}, ${styleConfig.modifiers}, ${qualityConfig.positive}`;
}

export function generateNegativePrompt(
  style: "realistic" | "artistic" | "minimal" = "realistic"
): string {
  const styleConfig = STYLE_VARIATIONS[style];
  const qualityConfig = QUALITY_MODIFIERS.standard;

  return [
    ...COMMON_NEGATIVE_PROMPTS,
    styleConfig.negative,
    qualityConfig.negative,
  ]
    .filter(Boolean)
    .join(", ");
}
