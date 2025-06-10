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
  productImage: z.string().url("Invalid product image URL"),
  modelImage: z.string().url("Invalid model image URL").optional(),
  prompt: z
    .string()
    .min(10, "Prompt must be at least 10 characters")
    .optional(),
  style: z.enum(["realistic", "artistic", "minimal"]).default("realistic"),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type ImageUploadFormData = z.infer<typeof imageUploadSchema>;
export type GenerationFormData = z.infer<typeof generationSchema>;
