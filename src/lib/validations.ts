import { STYLE_PRESETS_IDS } from "@/constants/prompts";
import { z } from "zod";

// Authentication schemas
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// Image upload schemas
export const imageUploadSchema = z.object({
  file: z
    .instanceof(File)
    .refine((file) => file.size <= 5000000, {
      message: "File size must be less than 5MB",
    })
    .refine(
      (file) => ["image/jpeg", "image/png", "image/webp"].includes(file.type),
      {
        message: "File must be JPEG, PNG, or WebP",
      }
    ),
});

// Generation schemas
export const generationSchema = z.object({
  productImageUrl: z
    .string()
    .min(1, "Product image is required")
    .url("Please upload a valid product image"),
  modelImageUrl: z
    .string()
    .url("Please upload a valid model image")
    .optional()
    .or(z.literal("")),
  prompt: z
    .string()
    .max(500, "Custom prompt too long (max 500 characters)")
    .optional(),
  style: z.enum(STYLE_PRESETS_IDS, {
    errorMap: () => ({ message: "Please select a valid style preset" }),
  }),
  quality: z.enum(["draft", "standard", "high", "ultra"], {
    errorMap: () => ({ message: "Please select a valid quality setting" }),
  }),
  aspectRatio: z.enum(["1:1", "3:4", "4:3", "16:9"], {
    errorMap: () => ({ message: "Please select a valid aspect ratio" }),
  }),
  model: z.enum(["stable-diffusion-xl", "stable-diffusion-3", "flux-dev"], {
    errorMap: () => ({ message: "Please select a valid AI model" }),
  }),
  parameters: z
    .object({
      guidance_scale: z
        .number()
        .min(1, "Guidance scale must be at least 1")
        .max(20, "Guidance scale must be at most 20")
        .default(7.5),
      num_inference_steps: z
        .number()
        .min(20, "Inference steps must be at least 20")
        .max(100, "Inference steps must be at most 100")
        .default(50),
      strength: z
        .number()
        .min(0.1, "Strength must be at least 0.1")
        .max(1, "Strength must be at most 1.0")
        .default(0.8),
      seed: z
        .number()
        .min(0, "Seed must be a positive number")
        .max(2147483647, "Seed must be a valid 32-bit integer")
        .optional(),
    })
    .optional(),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type ImageUploadFormData = z.infer<typeof imageUploadSchema>;
export type GenerationFormData = z.infer<typeof generationSchema>;
