"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

const errorMessages = {
  Configuration: "There is a problem with the server configuration.",
  AccessDenied: "Access denied. You do not have permission to sign in.",
  Verification: "The verification token has expired or has already been used.",
  Default: "An error occurred during authentication. Please try again.",
};

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error") as keyof typeof errorMessages;

  const errorMessage = errorMessages[error] || errorMessages.Default;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4 dark:from-slate-900 dark:to-slate-800">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="mb-4 flex items-center justify-center">
            <AlertTriangle className="text-destructive h-12 w-12" />
          </div>
          <CardTitle className="text-center text-2xl font-bold">
            Authentication Error
          </CardTitle>
          <CardDescription className="text-center">
            Something went wrong during the authentication process
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>

          <div className="space-y-3">
            <Button asChild className="w-full">
              <Link href="/auth/signin">Try Again</Link>
            </Button>

            <Button variant="outline" asChild className="w-full">
              <Link href="/">Go Home</Link>
            </Button>
          </div>

          <div className="text-muted-foreground text-center text-sm">
            Need help? Contact{" "}
            <Link
              href="/support"
              className="font-medium underline underline-offset-4"
            >
              support
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
