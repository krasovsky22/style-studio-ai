"use client";

import {
  ConvexProvider as BaseConvexProvider,
  ConvexReactClient,
} from "convex/react";
import { ReactNode } from "react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

interface ConvexProviderProps {
  children: ReactNode;
}

export function ConvexProvider({ children }: ConvexProviderProps) {
  return <BaseConvexProvider client={convex}>{children}</BaseConvexProvider>;
}
