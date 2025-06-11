"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icons } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { QualitySetting } from "@/types/generation";

interface QualitySettingsProps {
  settings: QualitySetting[];
  selected: QualitySetting;
  onSelect: (setting: QualitySetting) => void;
  className?: string;
}

const speedIconMap = {
  Fast: Icons.Zap,
  Medium: Icons.Clock,
  Slow: Icons.Timer,
  "Very Slow": Icons.Hourglass,
} as const;

const speedColorMap = {
  Fast: "text-green-500",
  Medium: "text-yellow-500",
  Slow: "text-orange-500",
  "Very Slow": "text-red-500",
} as const;

export function QualitySettings({
  settings,
  selected,
  onSelect,
  className,
}: QualitySettingsProps) {
  return (
    <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2", className)}>
      {settings.map((setting) => {
        const isSelected = selected.id === setting.id;
        const SpeedIcon = speedIconMap[setting.speed] || Icons.Clock;
        const speedColor =
          speedColorMap[setting.speed] || "text-muted-foreground";

        return (
          <Card
            key={setting.id}
            className={cn(
              "cursor-pointer transition-all hover:shadow-sm",
              isSelected && "ring-primary ring-2"
            )}
            onClick={() => onSelect(setting)}
          >
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{setting.name}</h3>
                  {isSelected && (
                    <Icons.Check className="text-primary h-4 w-4" />
                  )}
                </div>

                <p className="text-muted-foreground text-sm">
                  {setting.description}
                </p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SpeedIcon className={cn("h-4 w-4", speedColor)} />
                    <span className="text-muted-foreground text-sm">
                      {setting.speed}
                    </span>
                  </div>

                  <Badge variant="secondary" className="text-xs">
                    {setting.cost} token{setting.cost !== 1 ? "s" : ""}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
