"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function useAuth() {
  const { data: session, status } = useSession();

  return {
    user: session?.user,
    isLoading: status === "loading",
    isAuthenticated: !!session,
    session,
  };
}

export function useRequireAuth() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const [convexInitialized, setConvexInitialized] = useState(false);

  // Get user data from Convex
  const convexUser = useQuery(
    api.users.getUserByEmail,
    user?.email ? { email: user.email } : "skip"
  );

  // Create user mutation
  const createUser = useMutation(api.users.createUser);

  // Handle authentication redirect
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/signin");
    }
  }, [isAuthenticated, isLoading, router]);

  // Handle Convex user initialization
  useEffect(() => {
    let isMounted = true;

    const initializeConvexUser = async () => {
      if (!user?.email || !isAuthenticated || convexInitialized) return;

      // If convexUser is explicitly null (not undefined), user doesn't exist
      if (convexUser === null) {
        try {
          await createUser({
            email: user.email,
            name: user.name || "",
            profileImage: user.image || "",
          });
          if (isMounted) {
            setConvexInitialized(true);
          }
        } catch (error) {
          console.error("Failed to create Convex user:", error);
        }
      } else if (convexUser && !convexInitialized) {
        // User exists, mark as initialized
        setConvexInitialized(true);
      }
    };

    initializeConvexUser();

    return () => {
      isMounted = false;
    };
  }, [
    user?.email,
    user?.name,
    user?.image,
    isAuthenticated,
    convexUser,
    createUser,
    convexInitialized,
  ]);

  // Calculate loading state - we're loading if NextAuth is loading OR if we're waiting for Convex user initialization
  const totalIsLoading = isLoading || (isAuthenticated && !convexInitialized);

  return {
    isAuthenticated,
    isLoading: totalIsLoading,
    convexUser,
    convexInitialized,
  };
}

export function useRedirectIfAuthenticated() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, isLoading, router]);

  return { isAuthenticated, isLoading };
}
