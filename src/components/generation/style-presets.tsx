"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icons } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { StylePreset } from "@/types/generation";

interface StylePresetsProps {
  presets: StylePreset[];
  selected: StylePreset;
  onSelect: (preset: StylePreset) => void;
  className?: string;
}

const iconMap = {
  Shirt: Icons.Shirt,
  Briefcase: Icons.Briefcase,
  Zap: Icons.Zap,
  Activity: Icons.Activity,
  Clock: Icons.Clock,
  Minus: Icons.Minus,
} as const;

export function StylePresets({
  presets,
  selected,
  onSelect,
  className,
}: StylePresetsProps) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3", className)}>
      {presets.map((preset) => {
        const IconComponent =
          iconMap[preset.icon as keyof typeof iconMap] || Icons.Shirt;
        const isSelected = selected.id === preset.id;

        return (
          <Card
            key={preset.id}
            className={cn(
              "cursor-pointer transition-all hover:shadow-md",
              isSelected && "ring-primary ring-2"
            )}
            onClick={() => onSelect(preset)}
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
