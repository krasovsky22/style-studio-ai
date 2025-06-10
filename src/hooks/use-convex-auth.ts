"use client";

import { useMutation, useQuery } from "convex/react";
import { useAuth } from "./use-auth";
import { api } from "@/convex/_generated/api";

export function useConvexAuth() {
  const { user } = useAuth();

  // Get user data from Convex
  const convexUser = useQuery(
    api.users.getUserByEmail,
    user?.email ? { email: user.email } : "skip"
  );

  // Update user mutation (still useful for profile updates)
  const updateUser = useMutation(api.users.updateUser);

  return {
    convexUser,
    updateUser,
    isLoading: convexUser === undefined && !!user?.email,
  };
}

export function useUserStats() {
  const { user } = useAuth();

  const stats = useQuery(
    api.users.getUserStats,
    user?.email ? { email: user.email } : "skip"
  );

  return stats;
}
