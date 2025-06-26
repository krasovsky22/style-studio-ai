// Prompt templates and constants

import {
  StylePreset,
  QualitySetting,
  GenerationOptions,
} from "@/types/generation";

// Style presets for the generation form
export const STYLE_PRESETS: Record<GenerationOptions["style"], StylePreset> = {
  realistic: {
    id: "realistic",
    name: "Realistic",
    description: "Photorealistic fashion photography with natural lighting",
    icon: "Camera",
  },
  artistic: {
    id: "artistic",
    name: "Artistic",
    description: "Creative editorial style with artistic composition",
    icon: "Palette",
  },
  minimal: {
    id: "minimal",
    name: "Minimal",
    description: "Clean minimalist background with product focus",
    icon: "Minus",
  },
};

// Export style preset IDs for validation
export const STYLE_PRESETS_ICONS = Object.values(STYLE_PRESETS).map(
  (preset) => preset.icon
);

// Quality settings for generation options
export const QUALITY_SETTINGS: QualitySetting[] = [
  {
    id: "auto",
    name: "Auto",
    description: "Good quality",
    cost: 2,
    speed: "Medium",
  },
  {
    id: "high",
    name: "High",
    description: "High quality",
    cost: 3,
    speed: "Slow",
  },
  {
    id: "medium",
    name: "Medium",
    description: "Medium quality",
    cost: 1,
    speed: "Very Slow",
  },
  {
    id: "low",
    name: "Low",
    description: "Low quality",
    cost: 1,
    speed: "Very Slow",
  },
];

export const STYLE_VARIATIONS: Record<
  GenerationOptions["style"],
  { modifiers: string; setting: string }
> = {
  realistic: {
    modifiers:
      "photorealistic fashion photography, studio lighting, commercial quality, detailed fabric textures",
    setting: "professional studio, controlled lighting, clean background",
  },
  artistic: {
    modifiers:
      "artistic fashion editorial, creative lighting, artistic composition, fashion magazine style",
    setting: "creative environment, dramatic lighting, artistic backdrop",
  },
  minimal: {
    modifiers:
      "clean minimalist background, focused product showcase, simple elegant presentation",
    setting: "minimal white background, soft lighting, clean composition",
  },
};

export const QUALITY_MODIFIERS: Record<GenerationOptions["quality"], string> = {
  high: "high resolution, sharp details, professional photography quality",
  medium: "medium quality, balanced details, acceptable lighting",
  low: "low quality, basic details, minimal lighting",
  auto: "",
};

export const MODEL_DESCRIPTIONS = {
  realistic: [
    "professional model",
    "fashion model",
    "elegant person",
    "stylish individual",
  ].join(", "),
  artistic: [
    "artistic model",
    "creative individual",
    "expressive person",
    "artistic subject",
  ].join(", "),
  minimal: ["model", "person", "individual", "subject"].join(", "),
};

/**
 * Generate optimized prompt for image generation
 */
export async function generateOptimizedPrompt(data: {
  productImageFiles?: string[];
  modelImageFiles?: string[];
  style: string;
  customPrompt?: string;
  parameters?: Record<string, unknown>;
}): Promise<string> {
  const { style, productImageFiles, modelImageFiles, customPrompt } = data;

  // Type-safe style access
  const styleKey = style as keyof typeof STYLE_VARIATIONS;
  const styleVariation = STYLE_VARIATIONS[styleKey];
  const modelDescription = MODEL_DESCRIPTIONS[styleKey];

  // Base prompt components
  let prompt = "";

  // If we have both product and model images, create a specific outfit visualization prompt
  if (
    productImageFiles &&
    productImageFiles.length > 0 &&
    modelImageFiles &&
    modelImageFiles.length > 0
  ) {
    prompt = `Generate an image showing the specific outfit/clothing from the provided product images being worn by the person from the model images. `;
    prompt += `Style: ${styleVariation?.modifiers || "realistic"}, ${styleVariation?.setting || "professional photography"}. `;
    prompt += `Ensure the clothing fits naturally on the model while maintaining the original design and details of the outfit. `;
  }
  // If we only have product images, describe them being worn by a generic model
  else if (productImageFiles && productImageFiles.length > 0) {
    prompt = `Generate an image of the specific outfit/clothing from the provided product images being worn by a ${modelDescription || "model"}. `;
    prompt += `${styleVariation?.modifiers || "realistic style"}, ${styleVariation?.setting || "professional photography"}. `;
    prompt += `Show the clothing naturally worn while maintaining all original design details and colors. `;
  }
  // If we only have model images, create a fashion shoot with stylish clothing
  else if (modelImageFiles && modelImageFiles.length > 0) {
    prompt = `Create a fashion photograph of the person from the model images wearing stylish, fashionable clothing. `;
    prompt += `${styleVariation?.modifiers || "realistic style"}, ${styleVariation?.setting || "professional photography"}. `;
    prompt += `The outfit should complement the person's style and the overall aesthetic. `;
  }
  // Fallback to original prompt structure
  else {
    prompt = `A stylish outfit elegantly worn by a ${modelDescription || "model"}, `;
    prompt += `${styleVariation?.modifiers || "realistic style"}, ${styleVariation?.setting || "professional photography"}. `;
  }

  // Add professional photography context
  prompt += `Professional fashion photography, high quality`;

  // Add custom prompt if provided
  if (customPrompt) {
    prompt += `, ${customPrompt}`;
  }

  // Add style-specific modifiers
  if (style === "high") {
    prompt += ", high resolution, detailed fabric textures, sharp focus";
  }

  return prompt;
}
