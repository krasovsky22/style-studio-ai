"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icons } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { AIModel } from "@/types/generation";
import { AI_MODELS } from "@/constants/replicate";

interface ModelSelectorProps {
  selected: AIModel;
  onSelect: (model: AIModel) => void;
  className?: string;
}

export function ModelSelector({
  selected,
  onSelect,
  className,
}: ModelSelectorProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {Object.values(AI_MODELS).map((model) => {
        const isSelected = selected.id === model.id;

        return (
          <Card
            key={model.id}
            className={cn(
              "cursor-pointer transition-all hover:shadow-sm",
              isSelected && "ring-primary ring-2"
            )}
            onClick={() => onSelect(model)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{model.name}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {model.cost} token{model.cost !== 1 ? "s" : ""}
                    </Badge>
                  </div>

                  <p className="text-muted-foreground text-sm">
                    {model.description}
                  </p>

                  <div className="mt-2 flex flex-wrap gap-1">
                    {model.supported_features.map((feature) => (
                      <Badge
                        key={feature}
                        variant="outline"
                        className="text-xs"
                      >
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="ml-4">
                  {isSelected ? (
                    <div className="bg-primary rounded-full p-2">
                      <Icons.Check className="text-primary-foreground h-4 w-4" />
                    </div>
                  ) : (
                    <div className="border-muted rounded-full border-2 p-2">
                      <Icons.Brain className="text-muted-foreground h-4 w-4" />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
