import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db";
import * as schema from "../db/schema";
import { admin } from "better-auth/plugins";
import { AuthService } from "../service/auth.service";
import { APIError } from "better-auth/api";

export const auth = betterAuth({
  trustedOrigins: [process.env.FRONTEND_URL ?? "http://localhost:5173"], // Whitelist URL frontend
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.Users,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "student",
        input: false,
      },
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  cookies: {
    prefix: "ba_",
  },
  advanced: {
    defaultCookieAttributes: {
      sameSite: "none",
      secure: true,
    },
  },
  plugins: [
    admin({
      defaultRole: "student",
      adminRole: "super_admin",
    }),
  ],
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          console.log("[HOOK] User Create BEFORE:", user.email);
          // Validasi: User harus terdaftar di API Kampus
          const campusUser = await AuthService.getCampusUser(user.email);
          if (!campusUser) {
            console.warn(
              "[HOOK] Campus Verification FAILED. Marking user as UNAUTHORIZED.",
            );
            // Soft Block: Jangan throw error (bikin crash), tapi tandai role user ini
            return {
              data: {
                ...user,
                role: "unauthorized",
              },
            };
          }
          console.log("[HOOK] Campus Verification PASSED.");
          return { data: user };
        },
        after: async (user) => {
          // Hanya sync jika user VALID (bukan unauthorized)
          if (user.role === "unauthorized") {
            console.log(
              "[HOOK] Skipping Sync for UNAUTHORIZED user:",
              user.email,
            );
            return;
          }

          console.log("[HOOK] User Create AFTER Triggered. ID:", user.id);
          // Sync: Masukkan data ke tabel Member menggunakan Service
          const campusUser = await AuthService.getCampusUser(user.email);
          if (campusUser) {
            console.log("[HOOK] Calling SyncMember...");
            await AuthService.syncMember(user.id, campusUser);
          } else {
            console.warn("[HOOK] Failed to fetch campus user in AFTER hook!");
          }
        },
      },
    },
  },
});
