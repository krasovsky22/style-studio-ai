"use client";

import { useRequireAuth } from "@/hooks/use-auth";
import { useUserStats } from "@/hooks/use-convex-auth";
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
import { Button } from "@/components/ui/button";
import { Zap, Image as ImageIcon, TrendingUp, Coins } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const { isAuthenticated, isLoading, convexUser } = useRequireAuth();
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

  const tokenBalance = convexUser?.tokenBalance || 0;
  const totalGenerations = stats?.totalGenerations || 0;

  return (
    <AppLayout showSidebar>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to Style Studio AI. Manage your generations and account
            settings.
          </p>
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
    </AppLayout>
  );
}
