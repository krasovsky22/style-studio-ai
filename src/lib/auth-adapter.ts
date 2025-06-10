import {
  Adapter,
  AdapterUser,
  // AdapterAccount,
  // AdapterSession,
} from "next-auth/adapters";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function ConvexAdapter(): Adapter {
  return {
    async createUser(user: Omit<AdapterUser, "id">): Promise<AdapterUser> {
      console.log("creating user", user);
      const userId = await convex.mutation(api.users.createUser, {
        email: user.email!,
        name: user.name || "",
        profileImage: user.image || "",
      });

      return {
        id: userId,
        email: user.email!,
        name: user.name || "",
        image: user.image || "",
        emailVerified: user.emailVerified,
      };
    },

    async getUser(id: string): Promise<AdapterUser | null> {
      try {
        const user = await convex.query(api.users.getUserById, {
          userId: id as Id<"users">,
        });

        if (!user) return null;

        return {
          id: user._id,
          email: user.email,
          name: user.name || "",
          image: user.profileImage || "",
          emailVerified: user.emailVerified
            ? new Date(user.emailVerified)
            : null,
        };
      } catch {
        return null;
      }
    },

    async getUserByEmail(email: string): Promise<AdapterUser | null> {
      try {
        console.log("loading user by email", email);
        const user = await convex.query(api.users.getUserByEmail, { email });
        if (!user) return null;

        return {
          id: user._id,
          email: user.email,
          name: user.name || "",
          image: user.profileImage || "",
          emailVerified: user.emailVerified
            ? new Date(user.emailVerified)
            : null,
        };
      } catch {
        return null;
      }
    },

    // async getUserByAccount({}): Promise<AdapterUser | null> {
    //   try {
    //     // Note: This would require a query to find user by account info
    //     // For now, we'll return null and handle this through email lookup
    //     return null;
    //   } catch {
    //     return null;
    //   }
    // },

    async updateUser(
      user: Partial<AdapterUser> & Pick<AdapterUser, "id">
    ): Promise<AdapterUser> {
      const updatedUser = await convex.mutation(api.users.updateUser, {
        userId: user.id as Id<"users">,
        updates: {
          name: user.name || undefined,
          profileImage: user.image || undefined,
          emailVerified: user.emailVerified
            ? user.emailVerified.getTime()
            : undefined,
        },
      });

      if (!updatedUser) {
        throw new Error("Failed to update user");
      }

      return {
        id: updatedUser._id,
        email: updatedUser.email,
        name: updatedUser.name || "",
        image: updatedUser.profileImage || "",
        emailVerified: updatedUser.emailVerified
          ? new Date(updatedUser.emailVerified)
          : null,
      };
    },

    // async deleteUser(userId: string): Promise<void> {
    //   // Note: deleteUser function would need to be implemented in Convex
    //   // For now, we'll skip this operation
    // },

    // async linkAccount(
    //   account: AdapterAccount
    // ): Promise<AdapterAccount | null | undefined> {
    //   // Store account linking info - this would need additional schema
    //   // For now, we'll handle OAuth through the user record
    //   return account;
    // },

    // async unlinkAccount({
    //   providerAccountId,
    //   provider,
    // }: {
    //   providerAccountId: string;
    //   provider: string;
    // }): Promise<void> {
    //   // Handle account unlinking
    // },

    // async createSession({
    //   sessionToken,
    //   userId,
    //   expires,
    // }): Promise<AdapterSession> {
    //   // For JWT strategy, we don't need to store sessions in DB
    //   return {
    //     sessionToken,
    //     userId,
    //     expires,
    //   };
    // },

    // async getSessionAndUser(
    //   sessionToken: string
    // ): Promise<{ session: AdapterSession; user: AdapterUser } | null> {
    //   // For JWT strategy, we don't need to retrieve sessions from DB
    //   return null;
    // },

    // async updateSession(
    //   session: Partial<AdapterSession> & Pick<AdapterSession, "sessionToken">
    // ): Promise<AdapterSession | null | undefined> {
    //   // For JWT strategy, we don't need to update sessions in DB
    //   return null;
    // },

    // async deleteSession(sessionToken: string): Promise<void> {
    //   // For JWT strategy, we don't need to delete sessions from DB
    // },

    // async createVerificationToken({
    //   identifier,
    //   expires,
    //   token,
    // }): Promise<any> {
    //   // Handle email verification tokens if needed
    //   return { identifier, expires, token };
    // },

    // async useVerificationToken({ identifier, token }): Promise<any> {
    //   // Use and delete verification token
    //   return { identifier, token, expires: new Date() };
    // },
  };
}
