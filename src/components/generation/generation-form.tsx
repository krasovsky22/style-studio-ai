"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Icons } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  GenerationOptions,
  QualitySetting,
  StylePreset,
} from "@/types/generation";
import { QUALITY_SETTINGS, STYLE_PRESETS } from "@/constants/prompts";
import { cn } from "@/lib/utils";

import { MultiImageUpload } from "./multi-image-upload";
import { QualitySettings } from "./quality-settings";
import { StylePresets } from "./style-presets";

// Simple client-side form data interface for basic validation
interface GenerationFormData {
  productImages: string[];
  modelImages?: string[];
  customPrompt?: string;
  style: GenerationOptions["style"];
  quality: GenerationOptions["quality"];
  aspectRatio: GenerationOptions["aspectRatio"];
  model: GenerationOptions["model"];
  parameters?: {
    guidance_scale: number;
    num_inference_steps: number;
    strength: number;
    seed?: number;
  };
}

interface GenerationFormProps {
  onSubmit: (data: GenerationOptions) => Promise<void>;
  isLoading?: boolean;
  tokenBalance?: number;
  className?: string;
}

export function GenerationForm({
  onSubmit,
  isLoading = false,
  tokenBalance = 0,
  className,
}: GenerationFormProps) {
  const [activeTab, setActiveTab] = useState("images");
  const [selectedStyle, setSelectedStyle] = useState<StylePreset>(
    STYLE_PRESETS[0]
  );
  const [selectedQuality, setSelectedQuality] = useState<QualitySetting>(
    QUALITY_SETTINGS[1]
  );
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  const form = useForm<GenerationFormData>({
    defaultValues: {
      productImages: [],
      modelImages: [],
      customPrompt: "",
      style: "realistic",
      quality: "standard",
      aspectRatio: "1:1",
      model: "gpt-4.1-dalle-3",
      parameters: {
        guidance_scale: 7.5,
        num_inference_steps: 50,
        strength: 0.8,
        seed: undefined,
      },
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { isSubmitting },
  } = form;

  const watchedValues = watch();

  const estimatedCost = selectedQuality.cost; // Simplified cost calculation
  const canGenerate = tokenBalance >= estimatedCost && !isSubmitting;

  // Simple client-side validation for immediate feedback
  const validateForm = (): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    const fieldErrors: Record<string, string> = {};

    if (
      !watchedValues.productImages ||
      watchedValues.productImages.length === 0
    ) {
      errors.push("At least one product image is required");
      fieldErrors.productImages = "At least one product image is required";
    }

    if (watchedValues.customPrompt && watchedValues.customPrompt.length > 500) {
      errors.push("Custom prompt too long (max 500 characters)");
      fieldErrors.prompt = "Custom prompt too long (max 500 characters)";
    }

    setValidationErrors(fieldErrors);
    return { valid: errors.length === 0, errors };
  };

  const handleFormSubmit = async (data: GenerationFormData) => {
    setFormErrors([]);
    setValidationErrors({});

    // Basic client-side validation
    const validation = validateForm();
    if (!validation.valid) {
      setFormErrors(validation.errors);
      return;
    }

    if (!canGenerate) {
      toast.error("Insufficient tokens for generation");
      return;
    }

    console.log("Form data:", data);

    try {
      await onSubmit({
        productImages: data.productImages,
        modelImages: data.modelImages,
        customPrompt: data.customPrompt,
        style: data.style,
        quality: data.quality,
        aspectRatio: data.aspectRatio,
        model: data.model,
        parameters: data.parameters,
      });

      // Show success message
      toast.success("Generation started successfully!");
    } catch (error) {
      console.error("Generation failed:", error);

      // Handle server validation errors
      if (error instanceof Error) {
        if (error.message.includes("Validation failed:")) {
          const serverErrors = error.message
            .replace("Validation failed: ", "")
            .split(", ");
          setFormErrors(serverErrors);
        } else {
          toast.error(
            error.message || "Failed to start generation. Please try again."
          );
        }
      } else {
        toast.error("Failed to start generation. Please try again.");
      }
    }
  };

  // Auto-navigate to tab with errors (simplified)
  const navigateToErrorTab = React.useCallback(() => {
    if (validationErrors.productImages || validationErrors.modelImages) {
      setActiveTab("images");
    }
  }, [validationErrors.productImages, validationErrors.modelImages]);

  // Navigate to error tab when validation fails
  React.useEffect(() => {
    if (Object.keys(validationErrors).length > 0) {
      navigateToErrorTab();
    }
  }, [validationErrors, navigateToErrorTab]);

  return (
    <div className={cn(className)}>
      {/* Main Form */}
      <div className="lg:col-span-2">
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* Validation Errors Summary */}
          {formErrors.length > 0 && (
            <Alert variant="destructive">
              <Icons.alertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium">
                    Please fix the following errors:
                  </p>
                  <ul className="list-inside list-disc space-y-1 text-sm">
                    {formErrors.map((message: string, index: number) => (
                      <li key={index}>{message}</li>
                    ))}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger
                value="images"
                className={
                  validationErrors.productImages || validationErrors.modelImages
                    ? "data-[state=inactive]:border-red-200 data-[state=inactive]:text-red-600"
                    : ""
                }
              >
                Images
                {(validationErrors.productImages ||
                  validationErrors.modelImages) && (
                  <Icons.alertTriangle className="ml-1 h-3 w-3 text-red-500" />
                )}
              </TabsTrigger>
              <TabsTrigger value="style">Style</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>

            <TabsContent value="images" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Product Images</CardTitle>
                  <CardDescription>
                    Upload images of the clothing items you want to visualize on
                    a model. Multiple images help create better results.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <MultiImageUpload
                    onImagesChange={(urls: string[]) => {
                      setValue("productImages", urls);
                      // Clear validation errors when images are uploaded
                      setValidationErrors((prev) => ({
                        ...prev,
                        productImages: "",
                      }));
                    }}
                    accept={{ "image/*": [".jpg", ".jpeg", ".png", ".webp"] }}
                    maxSize={10 * 1024 * 1024} // 10MB
                    maxImages={5}
                    placeholder="Upload product images"
                    category="product_image"
                    label="Product Images"
                    description="Upload multiple angles and views of your product"
                  />
                  {validationErrors.productImages && (
                    <p className="mt-2 text-sm text-red-500">
                      {validationErrors.productImages}
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Model Images (Optional)</CardTitle>
                  <CardDescription>
                    Upload reference model images for better pose, appearance,
                    and styling control. This helps create more consistent
                    results.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <MultiImageUpload
                    onImagesChange={(urls: string[]) => {
                      setValue("modelImages", urls);
                      // Clear validation errors when images are uploaded
                      setValidationErrors((prev) => ({
                        ...prev,
                        modelImages: "",
                      }));
                    }}
                    accept={{ "image/*": [".jpg", ".jpeg", ".png", ".webp"] }}
                    maxSize={10 * 1024 * 1024} // 10MB
                    maxImages={3}
                    placeholder="Upload model reference images"
                    optional={true}
                    category="model_image"
                    label="Model Reference Images"
                    description="Upload reference images for pose and styling"
                  />
                  {validationErrors.modelImages && (
                    <p className="mt-2 text-sm text-red-500">
                      {validationErrors.modelImages}
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="style" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Custom Prompt (Optional)</CardTitle>
                  <CardDescription>
                    Add specific details or modify the generated prompt
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    {...register("customPrompt")}
                    placeholder="e.g., professional lighting, studio background, fashion photography..."
                    className="min-h-[100px]"
                  />
                  {validationErrors.customPrompt && (
                    <p className="mt-2 text-sm text-red-500">
                      {validationErrors.customPrompt}
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Style Preset</CardTitle>
                  <CardDescription>
                    Choose a style that matches your desired aesthetic
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <StylePresets
                    presets={STYLE_PRESETS}
                    selected={selectedStyle}
                    onSelect={(preset: StylePreset) => {
                      setSelectedStyle(preset);
                      setValue(
                        "style",
                        preset.id as GenerationFormData["style"]
                      );
                    }}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quality Settings</CardTitle>
                  <CardDescription>
                    Higher quality takes longer but produces better results
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <QualitySettings
                    settings={QUALITY_SETTINGS}
                    selected={selectedQuality}
                    onSelect={(setting: QualitySetting) => {
                      setSelectedQuality(setting);
                      setValue(
                        "quality",
                        setting.id as GenerationFormData["quality"]
                      );
                    }}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>OpenAI Model</CardTitle>
                  <CardDescription>
                    Using GPT-4.1 with DALL-E 3 for image generation
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border p-4">
                    <div className="flex items-center space-x-2">
                      <Icons.Zap className="text-primary h-5 w-5" />
                      <div>
                        <p className="font-medium">GPT-4.1 + DALL-E 3</p>
                        <p className="text-muted-foreground text-sm">
                          Advanced AI model for high-quality image generation
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Aspect Ratio</CardTitle>
                  <CardDescription>
                    Select the output image dimensions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Select
                    value={watchedValues.aspectRatio}
                    onValueChange={(value) => {
                      setValue(
                        "aspectRatio",
                        value as GenerationFormData["aspectRatio"]
                      );
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1:1">Square (1:1)</SelectItem>
                      <SelectItem value="16:9">Landscape (16:9)</SelectItem>
                      <SelectItem value="9:16">Portrait (9:16)</SelectItem>
                      <SelectItem value="3:2">Photo (3:2)</SelectItem>
                      <SelectItem value="2:3">Portrait Photo (2:3)</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Advanced Parameters</CardTitle>
                  <CardDescription>
                    Fine-tune the generation process
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>
                      Guidance Scale:{" "}
                      {watchedValues.parameters?.guidance_scale || 7.5}
                    </Label>
                    <Slider
                      value={[watchedValues.parameters?.guidance_scale || 7.5]}
                      onValueChange={([value]) => {
                        setValue("parameters.guidance_scale", value);
                      }}
                      max={20}
                      min={1}
                      step={0.5}
                      className="w-full"
                    />
                    <p className="text-muted-foreground text-xs">
                      How closely to follow the prompt (1-20)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>
                      Inference Steps:{" "}
                      {watchedValues.parameters?.num_inference_steps || 50}
                    </Label>
                    <Slider
                      value={[
                        watchedValues.parameters?.num_inference_steps || 50,
                      ]}
                      onValueChange={([value]) => {
                        setValue("parameters.num_inference_steps", value);
                      }}
                      max={100}
                      min={20}
                      step={10}
                      className="w-full"
                    />
                    <p className="text-muted-foreground text-xs">
                      Number of denoising steps (20-100)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>
                      Strength: {watchedValues.parameters?.strength || 0.8}
                    </Label>
                    <Slider
                      value={[watchedValues.parameters?.strength || 0.8]}
                      onValueChange={([value]) => {
                        setValue("parameters.strength", value);
                      }}
                      max={1}
                      min={0.1}
                      step={0.1}
                      className="w-full"
                    />
                    <p className="text-muted-foreground text-xs">
                      How much to transform the input image (0.1-1.0)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="seed">Seed (Optional)</Label>
                    <Input
                      id="seed"
                      type="number"
                      placeholder="Random seed for reproducible results"
                      {...register("parameters.seed", { valueAsNumber: true })}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Separator />

          <div className="bg-muted/50 flex items-center justify-between rounded-lg p-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Icons.Zap className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium">
                  Estimated Cost: {estimatedCost} token
                  {estimatedCost !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="text-muted-foreground flex items-center gap-2 text-xs">
                <span>Your balance: {tokenBalance} tokens</span>
                {!canGenerate && (
                  <Badge variant="destructive" className="text-xs">
                    Insufficient tokens
                  </Badge>
                )}
                {isSubmitting && (
                  <Badge
                    variant="outline"
                    className="border-blue-200 text-xs text-blue-600"
                  >
                    Processing...
                  </Badge>
                )}
                {formErrors.length > 0 && !isSubmitting && (
                  <Badge
                    variant="outline"
                    className="border-red-200 text-xs text-red-600"
                  >
                    {formErrors.length} error
                    {formErrors.length !== 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading || !canGenerate || isSubmitting}
              className="min-w-[120px]"
            >
              {isLoading || isSubmitting ? (
                <>
                  <Icons.Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : formErrors.length > 0 ? (
                <>
                  <Icons.alertTriangle className="mr-2 h-4 w-4" />
                  Fix Errors
                </>
              ) : (
                <>
                  <Icons.Sparkles className="mr-2 h-4 w-4" />
                  Generate
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
