import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";

import { api } from "@/convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: "/signin",
    error: "/auth-error", // Error page for authentication errors
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user, account }) {
      // Persist the OAuth access_token and user id to the token right after signin
      if (account && user) {
        token.accessToken = account.access_token;
        token.userId = user.id;

        // Create or get the user in Convex
        try {
          const convexUserId = await convex.mutation(
            api.users.createOrGetUser,
            {
              email: token.email!,
              name: user.name || "",
              profileImage: user.image || "",
              externalId: user.id,
              provider: account.provider,
            }
          );

          token.convexUserId = convexUserId as string;
        } catch (error) {
          console.error("Failed to create/get Convex user:", error);
          // Try to find existing user as fallback
          const convexUser = await convex.query(api.users.getUserByEmail, {
            email: token.email!,
          });

          if (convexUser) {
            token.convexUserId = convexUser._id as string;
          } else {
            throw new Error(
              "Failed to authenticate with Convex: " + token.email
            );
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      // Send properties to the client
      if (token && session.user) {
        session.user.id = token.convexUserId as string;
        session.accessToken = token.accessToken as string;
      }
      return session;
    },
    async signIn(params) {
      const { account } = params;
      // Allow OAuth providers
      if (account?.provider === "google" || account?.provider === "github") {
        return true;
      }
      return false;
    },
  },
  events: {
    async signIn({ user, account }) {
      console.log("User signed in:", {
        userId: user.id,
        provider: account?.provider,
      });
    },
    async signOut({ token }) {
      console.log("User signed out:", { userId: token?.userId });
    },
  },
  debug: process.env.NODE_ENV === "development",
};
