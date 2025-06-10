"use client";

import { useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Icons } from "@/components/ui/icons";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function SignInPage() {
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string>("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const handleOAuthSignIn = async (provider: string) => {
    try {
      setIsLoading((prev) => ({ ...prev, [provider]: true }));
      setError("");

      const result = await signIn(provider, {
        callbackUrl,
        redirect: false,
      });

      if (result?.error) {
        setError("An error occurred during sign in. Please try again.");
      } else if (result?.ok) {
        // Wait for session to be established
        const session = await getSession();
        if (session) {
          router.push(callbackUrl);
        }
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading((prev) => ({ ...prev, [provider]: false }));
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4 dark:from-slate-900 dark:to-slate-800">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-center text-2xl font-bold">
            Welcome back
          </CardTitle>
          <CardDescription className="text-center">
            Sign in to your Style Studio AI account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleOAuthSignIn("google")}
              disabled={isLoading.google}
            >
              {isLoading.google ? (
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Icons.google className="mr-2 h-4 w-4" />
              )}
              Continue with Google
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleOAuthSignIn("github")}
              disabled={isLoading.github}
            >
              {isLoading.github ? (
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Icons.gitHub className="mr-2 h-4 w-4" />
              )}
              Continue with GitHub
            </Button>
          </div>

          <div className="text-muted-foreground text-center text-sm">
            Don&apos;t have an account?{" "}
            <Link
              href="/auth/signup"
              className="font-medium underline underline-offset-4"
            >
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
