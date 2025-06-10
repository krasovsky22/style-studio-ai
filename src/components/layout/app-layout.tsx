"use client";

import { ReactNode } from "react";
import { Header } from "./header";
import { Sidebar } from "./sidebar";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: ReactNode;
  showSidebar?: boolean;
  className?: string;
}

export function AppLayout({
  children,
  showSidebar = false,
  className,
}: AppLayoutProps) {
  return (
    <div className="bg-background min-h-screen">
      <Header />
      <div className={cn("flex", className)}>
        {showSidebar && <Sidebar />}
        <main className={cn("flex-1", showSidebar && "lg:pl-64")}>
          {children}
        </main>
      </div>
      <Toaster />
    </div>
  );
}
