"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { UserMenu } from "./user-menu";
import { Sparkles } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full px-3 text-white backdrop-blur">
      <div className="flex h-14 items-center">
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Sparkles className="text-primary h-6 w-6" />
            <span className="hidden font-bold sm:inline-block">
              Style Studio AI
            </span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link href="/generate" className="transition-colors">
              Generate
            </Link>
            <Link href="/dashboard" className="transition-colors">
              Dashboard
            </Link>
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            <Button variant="ghost" className="md:hidden">
              <Sparkles className="h-5 w-5" />
              <span className="sr-only">Home</span>
            </Button>
          </div>
          <nav className="flex items-center">
            <UserMenu />
          </nav>
        </div>
      </div>
    </header>
  );
}
