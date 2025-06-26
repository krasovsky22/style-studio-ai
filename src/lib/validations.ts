import { z } from "zod";
import { AI_MODELS } from "@/constants/openai";

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
  productImageFiles: z
    .array(z.string())
    .min(1, "At least one product image is required")
    .max(5, "Maximum 5 product images allowed"),
  modelImageFiles: z
    .array(z.string())
    .max(3, "Maximum 3 model images allowed")
    .optional(),
  customPrompt: z
    .string()
    .max(500, "Custom prompt too long (max 500 characters)")
    .optional(),
  style: z.enum(["realistic", "artistic", "minimal"], {
    errorMap: () => ({ message: "Please select a valid style preset" }),
  }),
  quality: z.enum(["auto", "high", "medium", "low"], {
    errorMap: () => ({ message: "Please select a valid quality setting" }),
  }),
  aspectRatio: z.enum(["1:1", "16:9", "9:16", "3:2", "2:3"], {
    errorMap: () => ({ message: "Please select a valid aspect ratio" }),
  }),
  model: z.enum(Object.keys(AI_MODELS) as [string, ...string[]], {
    errorMap: () => ({ message: "Please select a valid AI model" }),
  }),
  parameters: z.object({
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
      .max(2147483647, "Seed must be a valid 32-bit integer"),
  }),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type ImageUploadFormData = z.infer<typeof imageUploadSchema>;
export type GenerationFormData = z.infer<typeof generationSchema>;
