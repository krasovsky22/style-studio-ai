import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
// Note: Using database session strategy instead of adapter for now
// import { ConvexAdapter } from "./auth-adapter"

export const authOptions: NextAuthOptions = {
  // adapter: ConvexAdapter(),
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
      }
      return token;
    },
    async session({ session, token }) {
      // Send properties to the client
      if (token && session.user) {
        session.user.id = token.userId as string;
        session.accessToken = token.accessToken as string;
      }
      return session;
    },
    async signIn({ account }) {
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
