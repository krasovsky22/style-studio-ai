// Prompt templates and constants

import { StylePreset, QualitySetting } from "@/types/generation";

// Style presets for the generation form
export const STYLE_PRESETS: StylePreset[] = [
  {
    id: "realistic",
    name: "Realistic",
    description: "Photorealistic fashion photography with natural lighting",
    icon: "Camera",
  },
  {
    id: "artistic",
    name: "Artistic",
    description: "Creative editorial style with artistic composition",
    icon: "Palette",
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Clean minimalist background with product focus",
    icon: "Minus",
  },
];

// Export style preset IDs for validation
export const STYLE_PRESETS_IDS = STYLE_PRESETS.map((preset) => preset.id);

// Quality settings for generation options
export const QUALITY_SETTINGS: QualitySetting[] = [
  {
    id: "standard",
    name: "Standard",
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
    id: "ultra",
    name: "Ultra",
    description: "Maximum quality",
    cost: 5,
    speed: "Very Slow",
  },
];

export const PROMPT_TEMPLATES = {
  base: "A {product_description} worn by a {model_description} in a {setting}, {style_modifiers}, professional fashion photography, {quality_modifiers}",

  // Product-specific templates
  clothing:
    "A stylish {product_type} {product_description} elegantly worn by a {model_description}, {style_modifiers}, {setting}, professional fashion photography, {quality_modifiers}",

  // Simple template for minimal prompts
  simple:
    "{product_description} on a {model_description}, {style_modifiers}, {quality_modifiers}",
};

export const STYLE_VARIATIONS = {
  realistic: {
    modifiers:
      "photorealistic fashion photography, studio lighting, commercial quality, detailed fabric textures",
    setting: "professional studio, controlled lighting, clean background",
    negative: "cartoon, anime, illustration, painting, sketch, low quality",
  },
  artistic: {
    modifiers:
      "artistic fashion editorial, creative lighting, artistic composition, fashion magazine style",
    setting: "creative environment, dramatic lighting, artistic backdrop",
    negative: "boring, plain, amateur, snapshot, poor composition",
  },
  minimal: {
    modifiers:
      "clean minimalist background, focused product showcase, simple elegant presentation",
    setting: "minimal white background, soft lighting, clean composition",
    negative: "cluttered, busy background, distracting elements, complex",
  },
};

export const QUALITY_MODIFIERS = {
  standard: {
    positive: "good quality, clear details, well-lit",
    negative: "blurry, low quality, poor lighting",
  },
  high: {
    positive:
      "high resolution, sharp details, professional photography quality",
    negative: "pixelated, grainy, amateur quality",
  },
  ultra: {
    positive:
      "ultra high quality, 8k resolution, award-winning fashion photography",
    negative: "compressed, artifacted, low resolution",
  },
};

export const COMMON_NEGATIVE_PROMPTS = [
  "blurry",
  "low quality",
  "distorted",
  "deformed",
  "bad anatomy",
  "watermark",
  "signature",
  "text",
  "cropped",
  "out of frame",
  "worst quality",
  "low contrast",
  "underexposed",
  "overexposed",
  "amateur",
  "unnatural",
];

export const PRODUCT_PATTERNS = {
  shirt: ["shirt", "blouse", "top", "tee"],
  dress: ["dress", "gown", "frock"],
  pants: ["pants", "trousers", "jeans", "slacks"],
  jacket: ["jacket", "blazer", "coat", "cardigan"],
  skirt: ["skirt", "mini", "maxi"],
  shoes: ["shoes", "boots", "sneakers", "heels"],
  accessories: ["hat", "bag", "purse", "jewelry", "watch"],
};

export const MODEL_DESCRIPTIONS = {
  realistic: [
    "professional model",
    "fashion model",
    "elegant person",
    "stylish individual",
  ],
  artistic: [
    "artistic model",
    "creative individual",
    "expressive person",
    "artistic subject",
  ],
  minimal: ["model", "person", "individual", "subject"],
};
