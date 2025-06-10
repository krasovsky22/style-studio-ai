"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
    variant?:
      | "default"
      | "outline"
      | "secondary"
      | "ghost"
      | "link"
      | "destructive";
  };
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-[400px] flex-col items-center justify-center space-y-4 text-center",
        className
      )}
    >
      {icon && (
        <div className="bg-muted flex h-16 w-16 items-center justify-center rounded-full">
          {icon}
        </div>
      )}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">{title}</h3>
        {description && (
          <p className="text-muted-foreground max-w-md text-sm">
            {description}
          </p>
        )}
      </div>
      {action && (
        <Button
          variant={action.variant || "default"}
          onClick={action.onClick}
          {...(action.href && { asChild: true })}
        >
          {action.href ? (
            <Link href={action.href}>{action.label}</Link>
          ) : (
            action.label
          )}
        </Button>
      )}
    </div>
  );
}
