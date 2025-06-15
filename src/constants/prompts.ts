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
