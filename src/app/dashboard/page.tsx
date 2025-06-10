"use client";

import { useRequireAuth } from "@/hooks/use-auth";
import { useConvexAuth, useUserStats } from "@/hooks/use-convex-auth";
import { AppLayout } from "@/components/layout/app-layout";
import { UserProfile } from "@/components/user/user-profile";
import { StatsCard } from "@/components/ui/stats-card";
import { LoadingSpinner } from "@/components/ui/loading";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Zap, Image as ImageIcon, TrendingUp, Coins } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const { isAuthenticated, isLoading } = useRequireAuth();
  const { convexUser, ensureUser } = useConvexAuth();
  const stats = useUserStats();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" text="Loading dashboard..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // useRequireAuth will redirect
  }

  // Ensure user exists in Convex
  if (!convexUser && isAuthenticated) {
    ensureUser();
  }

  const tokenBalance = 0; // TODO: Implement token balance from user data
  const totalGenerations = stats?.totalGenerations || 0;
  const planType = stats?.subscription?.planType || "free";

  // Calculate generation usage from stats
  const generationsLimit = stats?.subscription?.generationsLimit || 50;
  const generationsUsed = stats?.subscription?.generationsUsed || 0;
  const remainingGenerations = Math.max(0, generationsLimit - generationsUsed);

  return (
    <AppLayout showSidebar>
      <div className="container mx-auto space-y-6 py-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome to Style Studio AI. Manage your generations and account
              settings.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={planType === "free" ? "secondary" : "default"}
              className="capitalize"
            >
              {planType} Plan
            </Badge>
            {planType === "free" && (
              <Button variant="outline" size="sm" asChild>
                <Link href="/pricing">Upgrade</Link>
              </Button>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <Button asChild size="lg" className="flex-1 sm:flex-none">
            <Link href="/generate">
              <Zap className="mr-2 h-4 w-4" />
              Create Generation
            </Link>
          </Button>
          <Button variant="outline" asChild className="flex-1 sm:flex-none">
            <Link href="/dashboard/gallery">
              <ImageIcon className="mr-2 h-4 w-4" />
              View Gallery
            </Link>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Token Balance"
            value={tokenBalance}
            description="Available for generations"
            icon={<Coins className="h-4 w-4" />}
          />
          <StatsCard
            title="Total Generations"
            value={totalGenerations}
            description="All time"
            icon={<ImageIcon className="h-4 w-4" />}
          />
          <StatsCard
            title="This Month"
            value={stats?.monthlyGenerations || 0}
            description="Generations this month"
            icon={<TrendingUp className="h-4 w-4" />}
          />
          <StatsCard
            title="Success Rate"
            value={`${stats?.successRate || 95}%`}
            description="Generation success rate"
            icon={<Zap className="h-4 w-4" />}
          />
        </div>

        {/* Usage Progress */}
        {planType !== "enterprise" && (
          <Card>
            <CardHeader>
              <CardTitle>Monthly Usage</CardTitle>
              <CardDescription>
                Track your generation usage for this month
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Generations Used</span>
                  <span>
                    {generationsUsed} / {generationsLimit}
                  </span>
                </div>
                <div className="bg-secondary h-2 w-full rounded-full">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, (generationsUsed / generationsLimit) * 100)}%`,
                    }}
                  />
                </div>
                {remainingGenerations <= 2 && remainingGenerations > 0 && (
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    You&apos;re running low on generations. Consider upgrading
                    your plan.
                  </p>
                )}
                {remainingGenerations === 0 && (
                  <p className="text-destructive text-sm">
                    You&apos;ve reached your monthly limit. Upgrade to continue
                    generating.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Generations */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Generations</CardTitle>
            <CardDescription>
              Your latest AI fashion generations will appear here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="py-6 text-center">
              <ImageIcon className="text-muted-foreground/40 mx-auto h-12 w-12" />
              <h3 className="mt-2 text-sm font-semibold">No generations yet</h3>
              <p className="text-muted-foreground mt-1 text-sm">
                Create your first AI fashion generation to see it here.
              </p>
              <Button className="mt-4" asChild>
                <Link href="/generate">
                  <Zap className="mr-2 h-4 w-4" />
                  Start Generating
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Profile Settings */}
        <UserProfile />
      </div>
    </AppLayout>
  );
}
