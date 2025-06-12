"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icons } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

interface TokenBalanceProps {
  balance: number;
  estimatedCost: number;
  className?: string;
  onPurchaseTokens?: () => void;
}

export function TokenBalance({
  balance,
  estimatedCost,
  className,
  onPurchaseTokens,
}: TokenBalanceProps) {
  const canAfford = balance >= estimatedCost;
  const remainingAfterGeneration = balance - estimatedCost;

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icons.Zap className="h-4 w-4 text-yellow-500" />
          Token Balance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">
            Current Balance:
          </span>
          <Badge
            variant={
              balance > 10
                ? "default"
                : balance > 5
                  ? "secondary"
                  : "destructive"
            }
            className="font-mono"
          >
            {balance} tokens
          </Badge>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">
            Generation Cost:
          </span>
          <Badge variant="outline" className="font-mono">
            {estimatedCost} token{estimatedCost !== 1 ? "s" : ""}
          </Badge>
        </div>

        {canAfford && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm">
              After Generation:
            </span>
            <Badge
              variant={remainingAfterGeneration > 5 ? "secondary" : "outline"}
              className="font-mono"
            >
              {remainingAfterGeneration} tokens
            </Badge>
          </div>
        )}

        {!canAfford && (
          <div className="bg-destructive/10 border-destructive/20 rounded-md border p-3">
            <div className="text-destructive flex items-center gap-2 text-sm">
              <Icons.AlertTriangle className="h-4 w-4" />
              <span>Insufficient tokens for generation</span>
            </div>
          </div>
        )}

        {balance < 20 && onPurchaseTokens && (
          <Button
            variant={!canAfford ? "default" : "outline"}
            size="sm"
            onClick={onPurchaseTokens}
            className="w-full"
          >
            <Icons.Plus className="mr-2 h-4 w-4" />
            {!canAfford ? "Purchase Tokens" : "Buy More Tokens"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
