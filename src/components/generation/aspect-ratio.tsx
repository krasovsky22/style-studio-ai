"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icons } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { GenerationFormData } from "@/types/generation";
import { AI_MODELS_ASPECT_RATIOS } from "@/constants/openai";

interface AspectRatioProps {
  selected: GenerationFormData["aspectRatio"];
  onSelect: (preset: GenerationFormData["aspectRatio"]) => void;
  className?: string;
}

const iconMap = {
  Camera: Icons.Camera,
  Palette: Icons.Palette,
  Minus: Icons.Minus,
} as const;

export function AspectRatio({
  selected,
  onSelect,
  className,
}: AspectRatioProps) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3", className)}>
      {Object.values(AI_MODELS_ASPECT_RATIOS).map((preset) => {
        const IconComponent =
          iconMap[preset.icon as keyof typeof iconMap] || Icons.Shirt;
        const isSelected = selected === preset.id;

        return (
          <Card
            key={preset.id}
            className={cn(
              "cursor-pointer transition-all hover:shadow-md",
              isSelected && "ring-primary ring-2"
            )}
            onClick={() => onSelect(preset.id)}
          >
            <CardContent className="p-4">
              <div className="flex flex-col items-center space-y-2 text-center">
                <div
                  className={cn(
                    "rounded-full p-3 transition-colors",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  <IconComponent className="h-6 w-6" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-sm font-medium">{preset.name}</h3>
                  <p className="text-muted-foreground line-clamp-2 text-xs">
                    {preset.description}
                  </p>
                </div>

                {isSelected && (
                  <Badge variant="default" className="text-xs">
                    Selected
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
