import { db } from "../../../db";
import { Users as UserTable, members as MemberTable } from "../../../db/schema";
import { and, eq, isNull } from "drizzle-orm";
import {
  AppError,
  BadRequestError,
  InternalServerError,
  NotFoundError,
  UnauthorizedError,
} from "../../../exceptions/AppError";

export interface CampusUserData {
  id: string;
  name: string;
  email: string;
  role: string;
  nim?: string;
  nidn?: string;
  faculty?: string;
  phone?: string;
}

export interface AuthResponseData {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    image?: string | null;
    createdAt?: Date;
  };
}

export class AuthService {
  private readonly CAMPUS_API_TIMEOUT = 15000;

  private mapCampusRoleToMemberType(campusUser: CampusUserData) {
    if (campusUser.role === "external") {
      return {
        memberType: "external" as any,
        nimNidn: "-",
        faculty: "-",
        phone: campusUser.phone || null,
      };
    }

    let memberType: "student" | "lecturer" | "staff" | "super_admin" | "external" =
      "student";
    let nimNidnValue = campusUser.nim;

    if (campusUser.nidn) {
      memberType = "lecturer";
      nimNidnValue = campusUser.nidn;
    }

    if (campusUser.role === "dosen" || campusUser.role === "lecturer") memberType = "lecturer";
    if (campusUser.role === "staff") memberType = "staff";

    return {
      memberType,
      nimNidn: nimNidnValue || "-",
      faculty: campusUser.faculty || "-",
      phone: campusUser.phone || null,
    };
  }

  async getCampusUser(email: string, userName: string = "User"): Promise<CampusUserData> {
    if (!email || !email.includes("@")) {
      throw new BadRequestError("Format email tidak valid");
    }

    const baseUrl = process.env.BASE_URL_API_UMC;
    if (!baseUrl) {
      return {
        id: "external-" + email,
        name: userName,
        email: email,
        role: "external",
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.CAMPUS_API_TIMEOUT,
    );

    try {
      const response = await fetch(`${baseUrl}/oauth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let responseData: any;
      try {
        responseData = await response.json();
      } catch (e) {
        // Fallback jika API tidak merespons JSON dengan benar
        return { id: "external-" + email, name: userName, email, role: "external" };
      }

      // Jika response gagal (termasuk 401 atau 404), anggap external
      if (!response.ok || !responseData?.success || !responseData?.data?.user) {
        return { id: "external-" + email, name: userName, email, role: "external" };
      }

      const userData = responseData.data.user;

      // Berhasil dapat data kampus
      return {
        id: userData.id?.toString() || "external-" + email,
        name: userData.full_name || userData.name || userName,
        email: userData.email || email,
        role: userData.role || "student",
        nim: userData.nim,
        nidn: userData.nidn,
        faculty: userData.faculty,
        phone: userData.phone,
      };
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      // Fallback jika fetch timeout atau error
      return { id: "external-" + email, name: userName, email, role: "external" };
    }
  }

  async syncMember(userId: string, campusUser: CampusUserData) {
    if (!userId) {
      throw new BadRequestError("User ID wajib diisi");
    }

    try {
      const existingMember = await db.query.members.findFirst({
        where: eq(MemberTable.userId, userId),
      });

      if (existingMember) {
        return existingMember;
      }

      const memberPayload = this.mapCampusRoleToMemberType(campusUser);

      // Preserve super_admin role: never downgrade via campus sync
      const targetUser = await db.query.Users.findFirst({
        where: eq(UserTable.id, userId),
      });

      if (targetUser?.role !== "super_admin") {
        await db
          .update(UserTable)
          .set({ role: memberPayload.memberType })
          .where(eq(UserTable.id, userId));
      }

      const [newMember] = await db
        .insert(MemberTable)
        .values({
          userId: userId,
          memberType: memberPayload.memberType,
          nimNidn: memberPayload.nimNidn,
          faculty: memberPayload.faculty,
          phone: memberPayload.phone,
        })
        .returning();

      return newMember;
    } catch (error) {
      console.error(`[AuthService] Sync Member FAILED:`, error);
      throw new InternalServerError(
        "Gagal sinkronisasi data member ke database",
      );
    }
  }

  async syncUserMemberByUserId(userId: string) {
    if (!userId) {
      throw new BadRequestError("User ID wajib diisi");
    }

    const user = await db.query.Users.findFirst({
      where: and(eq(UserTable.id, userId), isNull(UserTable.deletedAt)),
    });

    if (!user) {
      throw new NotFoundError("User tidak ditemukan");
    }

    let campusUser: CampusUserData;
    try {
      campusUser = await this.getCampusUser(user.email, user.name);
    } catch (err: unknown) {
      campusUser = {
        id: "fallback-" + user.id, 
        name: user.name,
        email: user.email,
        role: "external",
        nim: "-",
        faculty: "-",
        phone: undefined,
      };
    }
    const memberPayload = this.mapCampusRoleToMemberType(campusUser);

    const existingMember = await db.query.members.findFirst({
      where: eq(MemberTable.userId, userId),
    });

    if (existingMember?.deletedAt === null) {
      throw new BadRequestError(
        "User sudah tersinkronisasi. Sync manual hanya untuk user yang belum sinkron.",
      );
    }

    if (!existingMember) {
      // Sync Users.role with memberType (preserve super_admin)
      if (user.role !== "super_admin") {
        await db
          .update(UserTable)
          .set({ role: memberPayload.memberType })
          .where(eq(UserTable.id, userId));
      }

      const [newMember] = await db
        .insert(MemberTable)
        .values({
          userId,
          memberType: memberPayload.memberType,
          nimNidn: memberPayload.nimNidn,
          faculty: memberPayload.faculty,
          phone: memberPayload.phone,
          deletedAt: null,
        })
        .returning();

      return {
        userId,
        email: user.email,
        mode: "created" as const,
        member: newMember,
      };
    }

    // Sync Users.role with memberType (preserve super_admin)
    if (user.role !== "super_admin") {
      await db
        .update(UserTable)
        .set({ role: memberPayload.memberType })
        .where(eq(UserTable.id, userId));
    }

    const [updatedMember] = await db
      .update(MemberTable)
      .set({
        memberType: memberPayload.memberType,
        nimNidn: memberPayload.nimNidn,
        faculty: memberPayload.faculty,
        phone: memberPayload.phone,
        updatedAt: new Date(),
        deletedAt: null,
      })
      .where(eq(MemberTable.id, existingMember.id))
      .returning();

    return {
      userId,
      email: user.email,
      mode: "restored" as const,
      member: updatedMember,
    };
  }

  async verifyWithCampus(email: string) {
    const campusUser = await this.getCampusUser(email, "Unknown");

    const localUser = await db.query.Users.findFirst({
      where: eq(UserTable.email, email),
      with: { member: true },
    });

    return { campusData: campusUser, localUser };
  }

  async registerWithCredentials(
    name: string,
    email: string,
    password: string,
  ): Promise<AuthResponseData> {
    const existingUser = await db.query.Users.findFirst({
      where: eq(UserTable.email, email),
    });

    if (existingUser) {
      throw new AppError("Email sudah terdaftar", 409);
    }

    const { auth } = await import("../../../lib/auth");

    try {
      const result = await auth.api.signUpEmail({
        body: { name, email, password },
      });

      if (!result?.user) {
        throw new InternalServerError("Gagal membuat akun");
      }

      return {
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          role: result.user.role || "student",
          createdAt: result.user.createdAt,
        },
      };
    } catch (err: unknown) {
      if (err instanceof AppError) {
        throw err;
      }

      const error = err as Error;
      if (error.message?.includes("already exists")) {
        throw new AppError("Email sudah terdaftar", 409);
      }
      throw new InternalServerError(
        error.message || "Gagal melakukan registrasi",
      );
    }
  }

  async loginWithCredentials(
    email: string,
    password: string,
  ): Promise<AuthResponseData> {
    const { auth } = await import("../../../lib/auth");

    try {
      const result = await auth.api.signInEmail({
        body: { email, password },
      });

      if (!result?.user) {
        throw new UnauthorizedError("Email atau password salah");
      }

      return {
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          role: result.user.role || "student",
          image: result.user.image,
        },
      };
    } catch (err: unknown) {
      if (err instanceof AppError) {
        throw err;
      }

      const error = err as Error;
      if (
        error.message?.includes("Invalid") ||
        error.message?.includes("credentials") ||
        error.message?.includes("authenticated")
      ) {
        throw new UnauthorizedError("Email atau password salah");
      }
      throw new InternalServerError(error.message || "Gagal melakukan login");
    }
  }
}
