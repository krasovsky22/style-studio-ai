"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useUserStats } from "@/hooks/use-convex-auth";
import {
  LayoutDashboard,
  Image as ImageIcon,
  Zap,
  Settings,
  CreditCard,
  History,
  PlusCircle,
  BarChart3,
} from "lucide-react";

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Generate",
    href: "/generate",
    icon: Zap,
    highlight: true,
  },
  {
    name: "Gallery",
    href: "/dashboard/gallery",
    icon: ImageIcon,
  },
  {
    name: "History",
    href: "/dashboard/history",
    icon: History,
  },
];

const settingsNavigation = [
  {
    name: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
  {
    name: "Billing",
    href: "/dashboard/billing",
    icon: CreditCard,
  },
  {
    name: "Analytics",
    href: "/dashboard/analytics",
    icon: BarChart3,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const stats = useUserStats();

  // TODO: Implement token system - using placeholder for now
  const tokenBalance = 0; // Will be implemented with token purchases
  const planType = stats?.subscription?.planType || "free";

  return (
    <div className="bg-background fixed inset-y-0 left-0 z-30 hidden w-64 border-r lg:block">
      <div className="flex h-full flex-col">
        {/* Token Balance Card */}
        <div className="p-4">
          <div className="bg-primary/5 border-primary/20 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Token Balance</p>
                <p className="text-2xl font-bold">{tokenBalance}</p>
              </div>
              <div className="bg-primary/10 text-primary rounded-full p-2">
                <Zap className="h-4 w-4" />
              </div>
            </div>
            <Button size="sm" className="mt-3 w-full" asChild>
              <Link href="/dashboard/billing">
                <PlusCircle className="mr-2 h-3 w-3" />
                Buy Tokens
              </Link>
            </Button>
          </div>
        </div>

        <Separator />

        {/* Main Navigation */}
        <nav className="flex-1 space-y-1 p-4">
          <div className="space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    item.highlight &&
                      !isActive &&
                      "text-primary hover:text-primary"
                  )}
                >
                  <Icon className="mr-3 h-4 w-4 shrink-0" />
                  {item.name}
                  {item.highlight && (
                    <Badge variant="secondary" className="ml-auto text-xs">
                      New
                    </Badge>
                  )}
                </Link>
              );
            })}
          </div>

          <Separator className="my-4" />

          <div className="space-y-1">
            <h3 className="text-muted-foreground px-3 text-xs font-semibold tracking-wider uppercase">
              Account
            </h3>
            {settingsNavigation.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon className="mr-3 h-4 w-4 shrink-0" />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Plan Badge */}
        <div className="border-t p-4">
          <div className="flex items-center justify-between">
            <Badge
              variant={planType === "free" ? "outline" : "default"}
              className="capitalize"
            >
              {planType} Plan
            </Badge>
            {planType === "free" && (
              <Button variant="ghost" size="sm" asChild>
                <Link href="/pricing">Upgrade</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
