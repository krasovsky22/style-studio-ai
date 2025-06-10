"use client";

import { useRequireAuth } from "@/hooks/use-auth";
import { Header } from "@/components/layout/header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, Sparkles, ArrowRight } from "lucide-react";

export default function GeneratePage() {
  const { isAuthenticated, isLoading } = useRequireAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // useRequireAuth will redirect
  }

  return (
    <div className="bg-background min-h-screen">
      <Header />
      <main className="container mx-auto space-y-6 py-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Generate</h1>
            <p className="text-muted-foreground">
              Create AI-powered fashion visualizations with your product images.
            </p>
          </div>
          <Badge variant="outline" className="w-fit">
            <Sparkles className="mr-1 h-3 w-3" />
            AI Powered
          </Badge>
        </div>

        {/* Main Generation Interface */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Product Image
              </CardTitle>
              <CardDescription>
                Upload a clear image of your clothing item or fashion product
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border-muted-foreground/25 rounded-lg border-2 border-dashed p-8 text-center">
                <Upload className="text-muted-foreground/50 mx-auto h-12 w-12" />
                <h3 className="mt-4 text-lg font-semibold">Coming Soon</h3>
                <p className="text-muted-foreground">
                  Drag and drop your image here, or click to browse
                </p>
                <Button className="mt-4" disabled>
                  Select File
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Settings Section */}
          <Card>
            <CardHeader>
              <CardTitle>Generation Settings</CardTitle>
              <CardDescription>
                Customize your AI generation parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Style</label>
                <p className="text-muted-foreground text-sm">Coming soon</p>
              </div>
              <div>
                <label className="text-sm font-medium">Model Type</label>
                <p className="text-muted-foreground text-sm">Coming soon</p>
              </div>
              <div>
                <label className="text-sm font-medium">Background</label>
                <p className="text-muted-foreground text-sm">Coming soon</p>
              </div>
              <Button className="w-full" disabled>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Image
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Process Overview */}
        <Card>
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
            <CardDescription>
              Our AI-powered generation process in three simple steps
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="space-y-2 text-center">
                <div className="bg-primary text-primary-foreground mx-auto flex h-8 w-8 items-center justify-center rounded-full font-semibold">
                  1
                </div>
                <h3 className="font-semibold">Upload</h3>
                <p className="text-muted-foreground text-sm">
                  Upload your product or clothing image
                </p>
              </div>
              <div className="space-y-2 text-center">
                <div className="bg-primary text-primary-foreground mx-auto flex h-8 w-8 items-center justify-center rounded-full font-semibold">
                  2
                </div>
                <h3 className="font-semibold">Configure</h3>
                <p className="text-muted-foreground text-sm">
                  Choose your style and generation parameters
                </p>
              </div>
              <div className="space-y-2 text-center">
                <div className="bg-primary text-primary-foreground mx-auto flex h-8 w-8 items-center justify-center rounded-full font-semibold">
                  3
                </div>
                <h3 className="font-semibold">Generate</h3>
                <p className="text-muted-foreground text-sm">
                  Get your AI-generated fashion visualization
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Coming Soon Notice */}
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400">
              <Sparkles className="h-5 w-5" />
              <h3 className="font-semibold">AI Generation Coming Soon</h3>
            </div>
            <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
              We&apos;re working hard to bring you the most advanced AI fashion
              generation capabilities. The generation interface will be
              available in the next update.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
