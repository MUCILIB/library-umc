import { eq } from "drizzle-orm";
import { db } from "../db";
import { Users, members } from "../db/schema";

export const AuthService = {
  verifyWithCampus: async (email: string) => {
    const baseUrl = process.env.BASE_URL_API_UMC;
    if (!baseUrl) {
      throw new Error("BASE_URL_API_UMC is not defined in env");
    }

    // panggil API kampus
    const response = await fetch(`${baseUrl}/api/oauth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const responseData = await response.json();

    let data;
    try {
      data = responseData;
    } catch (e) {
      throw new Error(
        `Failed to parse JSON from Campus API. Check logs for raw response. Status: ${response.status}`
      );
    }

    if (!response.ok || !data.success) {
      return {
        success: false,
        message: data.message || "Failed to verify with API kampus",
        data: null,
      };
    }

    // jika berhasil, cari user di local
    const campusUser = data.data.user;

    let localUser = await db.query.Users.findFirst({
      where: eq(Users.email, email),
      with: {
        member: true,
      },
    });

    // Jika user valid di kampus tapi belum ada di local, Registerkan (Sync)
    if (!localUser) {
      const newUserId = crypto.randomUUID();

      await db.insert(Users).values({
        id: newUserId,
        name: campusUser.fullName,
        email: campusUser.email,
        emailVerified: true,
        role: campusUser.role,
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Insert ke tabel Members jika ada NIM/NIDN
      if (campusUser.nim || campusUser.nidn) {
        let memberType = "Student";
        let nimNidnValue = campusUser.nim;

        if (campusUser.nidn) {
          memberType = "Lecture";
          nimNidnValue = campusUser.nidn;
        }

        await db.insert(members).values({
          userId: newUserId,
          memberType: memberType,
          nimNidn: nimNidnValue,
          faculty: campusUser.faculty || "-",
          phone: campusUser.phone || null,
        });
      }

      // Ambil ulang user yang baru dibuat
      localUser = await db.query.Users.findFirst({
        where: eq(Users.email, email),
        with: { member: true },
      });
    }

    return {
      success: true,
      message: "User verified and synced successfully",
      data: {
        campusData: data.data,
        localUser: localUser || null,
      },
    };
  },
};
