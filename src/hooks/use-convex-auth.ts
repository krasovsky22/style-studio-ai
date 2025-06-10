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

  // Create user mutation
  const createUser = useMutation(api.users.createUser);

  // Update user mutation
  const updateUser = useMutation(api.users.updateUser);

  // Create user if needed
  const ensureUser = async () => {
    if (!user?.email || convexUser) return convexUser;

    try {
      const userId = await createUser({
        email: user.email,
        name: user.name || "",
        profileImage: user.image || "",
      });
      return { _id: userId, email: user.email, name: user.name || "" };
    } catch (error) {
      console.error("Failed to create user:", error);
      return null;
    }
  };

  return {
    convexUser,
    createUser,
    updateUser,
    ensureUser,
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
