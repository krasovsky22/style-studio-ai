// Prompt templates and constants

import { StylePreset, QualitySetting } from "@/types/generation";

// Style presets for the generation form
export const STYLE_PRESETS: StylePreset[] = [
  {
    id: "casual",
    name: "Casual",
    description: "Relaxed everyday wear",
    icon: "Shirt",
  },
  {
    id: "formal",
    name: "Formal",
    description: "Professional business attire",
    icon: "Briefcase",
  },
  {
    id: "streetwear",
    name: "Streetwear",
    description: "Urban fashion and trends",
    icon: "Zap",
  },
  {
    id: "athletic",
    name: "Athletic",
    description: "Sportswear and activewear",
    icon: "Activity",
  },
  {
    id: "vintage",
    name: "Vintage",
    description: "Classic retro styles",
    icon: "Clock",
  },
  {
    id: "minimalist",
    name: "Minimalist",
    description: "Clean and simple designs",
    icon: "Minus",
  },
];

export const STYLE_PRESETS_IDS = STYLE_PRESETS.map((preset) => preset.id) as [
  string,
  ...string[],
];

// Quality settings for generation options
export const QUALITY_SETTINGS: QualitySetting[] = [
  {
    id: "draft",
    name: "Draft",
    description: "Quick preview",
    cost: 1,
    speed: "Fast",
  },
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
  // New style options
  casual: {
    modifiers:
      "relaxed, comfortable, everyday wear, natural lighting, lifestyle photography",
    setting: "casual environment, soft natural lighting, lifestyle setting",
    negative: "formal, stiff, professional, business attire, uptight",
  },
  formal: {
    modifiers:
      "professional, elegant, business attire, sharp, polished, sophisticated",
    setting: "professional studio, dramatic lighting, corporate photography",
    negative: "casual, messy, wrinkled, informal, relaxed",
  },
  streetwear: {
    modifiers:
      "urban, trendy, hip-hop inspired, contemporary street fashion, edgy",
    setting: "urban environment, street photography, modern city backdrop",
    negative: "formal, traditional, conservative, vintage, outdated",
  },
  athletic: {
    modifiers:
      "sporty, active, performance wear, dynamic, energetic, fitness-focused",
    setting:
      "gym environment, action photography, athletic lighting, sports backdrop",
    negative: "formal, dressy, restrictive, heavy fabrics, sedentary",
  },
  vintage: {
    modifiers:
      "retro, classic, timeless, nostalgic, heritage style, period-appropriate",
    setting:
      "vintage backdrop, classic photography, warm tones, retro environment",
    negative: "modern, futuristic, synthetic, contemporary, digital",
  },
  minimalist: {
    modifiers: "clean, simple, understated, modern, refined, sleek",
    setting:
      "minimal backdrop, clean lighting, contemporary photography, neutral space",
    negative: "busy, ornate, excessive decoration, cluttered, complex",
  },
  // Legacy support for existing code
  realistic: {
    modifiers:
      "photorealistic, studio lighting, commercial photography, natural skin tones, professional modeling",
    setting: "professional photography studio with soft lighting",
    negative: "cartoon, anime, painting, drawing, artificial, unrealistic skin",
  },
  artistic: {
    modifiers:
      "artistic style, creative lighting, fashion editorial, dramatic composition, artistic interpretation",
    setting: "creative studio with artistic lighting and composition",
    negative: "amateur, low quality, blurry, overexposed",
  },
  minimal: {
    modifiers:
      "clean background, minimal styling, product focus, simple composition, neutral lighting",
    setting: "clean minimal background",
    negative: "cluttered, busy background, distracting elements",
  },
};

export const QUALITY_MODIFIERS = {
  draft: {
    positive: "quick preview, basic quality, clear image",
    negative: "blurry, distorted, low resolution",
  },
  standard: {
    positive: "good quality, clear details, professional photography",
    negative: "low quality, blurry, pixelated, distorted",
  },
  high: {
    positive:
      "high resolution, sharp details, professional quality, crisp image, excellent lighting",
    negative: "low resolution, blurry, pixelated, poor lighting, amateur",
  },
  ultra: {
    positive:
      "ultra high quality, 8k resolution, award-winning photography, perfect lighting, magazine quality, masterpiece",
    negative:
      "low quality, blurry, pixelated, poor composition, amateur photography, distorted",
  },
};

// Common negative prompt elements
export const COMMON_NEGATIVE_PROMPTS = [
  "nsfw",
  "nude",
  "naked",
  "sexual",
  "inappropriate",
  "ugly",
  "deformed",
  "disfigured",
  "mutated",
  "malformed",
  "blurry",
  "out of focus",
  "low quality",
  "pixelated",
  "watermark",
  "signature",
  "text",
  "logo",
  "brand name",
  "multiple people",
  "crowd",
  "background people",
  "bad anatomy",
  "extra limbs",
  "missing limbs",
  "artifacts",
  "noise",
  "grain",
  "compression",
];

// Product type detection patterns
export const PRODUCT_PATTERNS = {
  shirt: ["shirt", "blouse", "top", "tee", "t-shirt", "polo"],
  dress: ["dress", "gown", "frock", "sundress"],
  pants: ["pants", "trousers", "jeans", "slacks", "leggings"],
  jacket: ["jacket", "blazer", "coat", "cardigan", "hoodie"],
  skirt: ["skirt", "mini skirt", "maxi skirt"],
  shoes: ["shoes", "sneakers", "heels", "boots", "sandals"],
  accessories: ["bag", "purse", "hat", "jewelry", "watch", "belt"],
};

// Model descriptions for different styles
export const MODEL_DESCRIPTIONS = {
  realistic: [
    "professional fashion model",
    "elegant model",
    "sophisticated model",
    "confident model",
  ],
  artistic: [
    "artistic model with creative pose",
    "expressive fashion model",
    "dynamic model",
    "artistic subject",
  ],
  minimal: [
    "model with clean styling",
    "minimalist model presentation",
    "simple model pose",
    "neutral model styling",
  ],
};
