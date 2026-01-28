import { eq } from "drizzle-orm";
import { db } from "../db";
import { Users, members } from "../db/schema";

type ServiceResponse<T> = {
  success: boolean;
  message: string;
  data: T | null;
};

export class AuthService {
  private readonly CAMPUS_API_TIMEOUT = 5000; // 5 seconds

  /**
   * Get Campus User with timeout and proper error handling
   */
  async getCampusUser(email: string): Promise<ServiceResponse<any>> {
    console.log(`[AuthService] Checking Campus API for: ${email}`);

    // Validate email format
    if (!email || !email.includes("@")) {
      return {
        success: false,
        message: "Invalid email format",
        data: null,
      };
    }

    const baseUrl = process.env.BASE_URL_API_UMC;
    if (!baseUrl) {
      return {
        success: false,
        message: "BASE_URL_API_UMC is not configured in environment",
        data: null,
      };
    }

    // Setup timeout controller
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

      // Check HTTP status
      if (!response.ok) {
        console.error(`[AuthService] API Error Status: ${response.status}`);
        return {
          success: false,
          message: `Campus API error: ${response.status} ${response.statusText}`,
          data: null,
        };
      }

      const responseData = await response.json();

      if (!responseData.success || !responseData.data?.user) {
        console.warn(`[AuthService] User not found or invalid response`);
        return {
          success: false,
          message: "User not found in Campus API",
          data: null,
        };
      }

      console.log(`[AuthService] User Found:`, responseData.data.user.email);
      return {
        success: true,
        message: "User found in Campus API",
        data: responseData.data.user,
      };
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === "AbortError") {
        console.error("[AuthService] Campus API timeout");
        return {
          success: false,
          message: "Campus API request timeout",
          data: null,
        };
      }

      console.error("[AuthService] Campus API Exception:", error);
      return {
        success: false,
        message: "Failed to connect to Campus API",
        data: null,
      };
    }
  }

  /**
   * Sync Member to local database
   */
  async syncMember(
    userId: string,
    campusUser: any,
  ): Promise<ServiceResponse<any>> {
    console.log(
      `[AuthService] Syncing Member... UserId: ${userId}, Role: ${campusUser.role}`,
    );

    try {
      // Validate inputs
      if (!userId) {
        return {
          success: false,
          message: "User ID is required",
          data: null,
        };
      }

      if (!campusUser) {
        return {
          success: false,
          message: "Campus user data is required",
          data: null,
        };
      }

      // Check if member already exists
      const existingMember = await db.query.members.findFirst({
        where: eq(members.userId, userId),
      });

      if (existingMember) {
        console.log(`[AuthService] Member already exists.`);
        return {
          success: true,
          message: "Member already synced",
          data: existingMember,
        };
      }

      // Determine member type
      let memberType: "student" | "lecturer" | "staff" | "super_admin" =
        "student";
      let nimNidnValue = campusUser.nim;

      if (campusUser.nidn) {
        memberType = "lecturer";
        nimNidnValue = campusUser.nidn;
      }

      if (campusUser.role === "dosen") memberType = "lecturer";
      if (campusUser.role === "staff") memberType = "staff";

      // Insert new member
      const [newMember] = await db
        .insert(members)
        .values({
          userId: userId,
          memberType,
          nimNidn: nimNidnValue || "-",
          faculty: campusUser.faculty || "-",
          phone: campusUser.phone || null,
        })
        .returning();

      if (!newMember) {
        return {
          success: false,
          message: "Failed to sync member",
          data: null,
        };
      }

      console.log(`[AuthService] Member Sync SUCCESS for ${userId}`);
      return {
        success: true,
        message: "Member synced successfully",
        data: newMember,
      };
    } catch (error) {
      console.error(`[AuthService] Sync Member FAILED:`, error);
      return {
        success: false,
        message: "Failed to sync member to database",
        data: null,
      };
    }
  }

  /**
   * Verify user with Campus API
   */
  async verifyWithCampus(email: string): Promise<ServiceResponse<any>> {
    try {
      // Validate email
      if (!email || !email.includes("@")) {
        return {
          success: false,
          message: "Invalid email format",
          data: null,
        };
      }

      // Get campus user
      const campusUserResult = await this.getCampusUser(email);

      if (!campusUserResult.success) {
        return {
          success: false,
          message: campusUserResult.message,
          data: null,
        };
      }

      const campusUser = campusUserResult.data;

      // Check existing local user
      const localUser = await db.query.Users.findFirst({
        where: eq(Users.email, email),
        with: { member: true },
      });

      // Note: User creation is handled by Better Auth
      // This method only verifies and returns data
      return {
        success: true,
        message: "User verified with Campus API",
        data: { campusData: campusUser, localUser },
      };
    } catch (error) {
      console.error("[AuthService] Error verifying with campus:", error);
      return {
        success: false,
        message: "Failed to verify with Campus API",
        data: null,
      };
    }
  }
}
