import { eq } from "drizzle-orm";
import { db } from "../db";
import { Users, members } from "../db/schema";

export const AuthService = {
  // Ambil data user dari API Kampus
  getCampusUser: async (email: string) => {
    console.log(`[AuthService] Checking Campus API for: ${email}`);
    const baseUrl = process.env.BASE_URL_API_UMC;
    if (!baseUrl) {
      throw new Error("BASE_URL_API_UMC is not defined in env");
    }

    try {
      const response = await fetch(`${baseUrl}/oauth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        console.error(`[AuthService] API Error Status: ${response.status}`);
        return null;
      }

      const responseData = await response.json();
      if (!responseData.success || !responseData.data?.user) {
        console.warn(`[AuthService] User not found or invalid response`);
        return null;
      }

      console.log(`[AuthService] User Found:`, responseData.data.user.email);
      return responseData.data.user;
    } catch (error) {
      console.error("[AuthService] Campus API Exception:", error);
      return null;
    }
  },

  // Sinkronisasi data member ke database local
  syncMember: async (userId: string, campusUser: any) => {
    console.log(
      `[AuthService] Syncing Member... UserId: ${userId}, Role: ${campusUser.role}`
    );

    try {
      // Cek apakah member sudah ada
      const existingMember = await db.query.members.findFirst({
        where: eq(members.userId, userId),
      });

      if (existingMember) {
        console.log(`[AuthService] Member already exists.`);
        return existingMember;
      }

      let memberType: "student" | "lecturer" | "staff" | "super_admin" =
        "student";
      let nimNidnValue = campusUser.nim;

      if (campusUser.nidn) {
        memberType = "lecturer";
        nimNidnValue = campusUser.nidn;
      }

      if (campusUser.role === "dosen") memberType = "lecturer";
      if (campusUser.role === "staff") memberType = "staff";

      await db.insert(members).values({
        userId: userId,
        memberType,
        nimNidn: nimNidnValue || "-",
        faculty: campusUser.faculty || "-",
        phone: campusUser.phone || null,
      });

      console.log(`[AuthService] Member Sync SUCCESS for ${userId}`);
    } catch (error) {
      console.error(`[AuthService] Sync MEMEBER FAILED:`, error);
      throw error;
    }
  },

  // Legacy/Full Flow (bisa dipanggil manual)
  verifyWithCampus: async (email: string) => {
    const campusUser = await AuthService.getCampusUser(email);

    if (!campusUser) {
      return {
        success: false,
        message: "User not found in Campus API",
        data: null,
      };
    }

    // Cek existing local user
    let localUser = await db.query.Users.findFirst({
      where: eq(Users.email, email),
      with: { member: true },
    });

    if (!localUser) {
      // Jika user valid di kampus tapi belum ada di local, Registerkan (Sync) Manual
      // const newUserId = crypto.randomUUID();
      // await db.insert(Users).values({
      //   id: newUserId,
      //   name: campusUser.fullName,
      //   email: campusUser.email,
      //   emailVerified: true,
      //   role: campusUser.role || "student",
      //   createdAt: new Date(),
      //   updatedAt: new Date(),
      // });
      // // Sync member data (reuse helper)
      // await AuthService.syncMember(newUserId, campusUser);
      // // Ambil ulang user yang baru dibuat
      // localUser = await db.query.Users.findFirst({
      //   where: eq(Users.email, email),
      //   with: { member: true },
      // });
    }

    return {
      success: true,
      message: "Verified",
      data: { campusData: campusUser, localUser },
    };
  },
};
