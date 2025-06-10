"use client";

import { useRedirectIfAuthenticated } from "@/hooks/use-auth";
import { ReactNode } from "react";

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  // Redirect authenticated users to dashboard
  useRedirectIfAuthenticated();

  return <div className="min-h-screen">{children}</div>;
}
