"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/header";
import { useAuth } from "@/hooks/use-auth";
import {
  ArrowRight,
  Sparkles,
  Image as ImageIcon,
  Zap,
  Users,
} from "lucide-react";

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <div className="bg-background min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-16 sm:py-24">
        {/* Hero Section */}
        <div className="mx-auto max-w-3xl space-y-8 text-center">
          <div className="text-primary flex items-center justify-center space-x-2">
            <Sparkles className="h-8 w-8" />
            <span className="text-lg font-semibold">Style Studio AI</span>
          </div>

          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            AI-Powered{" "}
            <span className="text-primary">Fashion Visualization</span> for
            Everyone
          </h1>

          <p className="text-muted-foreground mx-auto max-w-2xl text-xl">
            Transform your fashion ideas into stunning visuals with cutting-edge
            AI technology. Perfect for designers, retailers, and fashion
            enthusiasts.
          </p>

          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            {!isAuthenticated && !isLoading ? (
              <>
                <Button asChild size="lg" className="sm:px-8">
                  <Link href="/auth/signup">
                    Get Started Free
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild className="sm:px-8">
                  <Link href="/auth/signin">Sign In</Link>
                </Button>
              </>
            ) : (
              <Button asChild size="lg" className="sm:px-8">
                <Link href="/dashboard">
                  Go to Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-24 grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="space-y-4 text-center">
            <div className="bg-primary/10 mx-auto flex h-12 w-12 items-center justify-center rounded-lg">
              <ImageIcon className="text-primary h-6 w-6" />
            </div>
            <h3 className="text-xl font-semibold">AI Generation</h3>
            <p className="text-muted-foreground">
              Upload your product images and let AI create stunning fashion
              visualizations
            </p>
          </div>

          <div className="space-y-4 text-center">
            <div className="bg-primary/10 mx-auto flex h-12 w-12 items-center justify-center rounded-lg">
              <Zap className="text-primary h-6 w-6" />
            </div>
            <h3 className="text-xl font-semibold">Lightning Fast</h3>
            <p className="text-muted-foreground">
              Get professional-quality results in seconds, not hours
            </p>
          </div>

          <div className="space-y-4 text-center">
            <div className="bg-primary/10 mx-auto flex h-12 w-12 items-center justify-center rounded-lg">
              <Users className="text-primary h-6 w-6" />
            </div>
            <h3 className="text-xl font-semibold">Team Collaboration</h3>
            <p className="text-muted-foreground">
              Share and collaborate on fashion designs with your team
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-muted/50 mt-24 space-y-8 rounded-lg p-12 text-center">
          <h2 className="text-3xl font-bold">
            Ready to Transform Your Fashion Ideas?
          </h2>
          <p className="text-muted-foreground mx-auto max-w-2xl">
            Join thousands of designers and retailers who are already using
            Style Studio AI to create amazing fashion visualizations.
          </p>
          {!isAuthenticated && !isLoading && (
            <Button asChild size="lg">
              <Link href="/auth/signup">
                Start Creating Today
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
