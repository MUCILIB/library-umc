import { db } from "../db";
import { guestLogs } from "../db/schema";
import { desc, sql, eq, and, gte } from "drizzle-orm";

type DataGuest = {
  name: string;
  identifier: string; // NIM
  email: string;
  faculty: string;
  major: string;
};

type ServiceResponse<T> = {
  success: boolean;
  message: string;
  data: T | null;
  meta?: any;
};

export class GuestService {
  private readonly CAMPUS_API_TIMEOUT = 5000; // 5 seconds

  /**
   * Get User from Campus API with timeout and proper error handling
   */
  async getDataUserFromCampus(email: string): Promise<ServiceResponse<any>> {
    try {
      const baseUrl = process.env.BASE_URL_API_UMC;
      if (!baseUrl) {
        return {
          success: false,
          message: "BASE_URL_API_UMC is not configured in environment",
          data: null,
        };
      }

      // Validate email format
      if (!email || !email.includes("@")) {
        return {
          success: false,
          message: "Invalid email format",
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
        const response = await fetch(`${baseUrl}/users/${email}`, {
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
          },
        });

        clearTimeout(timeoutId);

        // Check HTTP status
        if (!response.ok) {
          return {
            success: false,
            message: `Campus API error: ${response.status} ${response.statusText}`,
            data: null,
          };
        }

        const data = await response.json();

        if (!data.success) {
          return {
            success: false,
            message: "User not found in Campus API",
            data: null,
          };
        }

        return {
          success: true,
          message: "User found in campus API",
          data: data.data,
        };
      } catch (fetchErr: any) {
        clearTimeout(timeoutId);

        if (fetchErr.name === "AbortError") {
          return {
            success: false,
            message: "Campus API request timeout",
            data: null,
          };
        }

        throw fetchErr; // Re-throw to outer catch
      }
    } catch (err) {
      console.error("[GuestService] Error fetching user from campus API:", err);
      return {
        success: false,
        message: "Failed to fetch user from campus API",
        data: null,
      };
    }
  }

  /**
   * Search users from Campus API by name, faculty, or major
   */
  async searchUsersFromCampus(query: {
    name?: string;
    faculty?: string;
    major?: string;
    email?: string;
  }): Promise<ServiceResponse<any[]>> {
    try {
      const baseUrl = process.env.BASE_URL_API_UMC;
      if (!baseUrl) {
        return {
          success: false,
          message: "BASE_URL_API_UMC is not configured in environment",
          data: null,
        };
      }

      // Validate at least one search parameter
      if (!query.name && !query.faculty && !query.major && !query.email) {
        return {
          success: false,
          message: "At least one search parameter is required",
          data: null,
        };
      }

      // Build query params
      const params = new URLSearchParams();
      if (query.name) params.append("full_name", query.name);
      if (query.faculty) params.append("faculty", query.faculty);
      if (query.major) params.append("major", query.major);
      if (query.email) params.append("email", query.email);

      // Setup timeout controller
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.CAMPUS_API_TIMEOUT,
      );

      try {
        const response = await fetch(
          `${baseUrl}/users/search?${params.toString()}`,
          {
            signal: controller.signal,
            headers: {
              "Content-Type": "application/json",
            },
          },
        );

        clearTimeout(timeoutId);

        // Check HTTP status
        if (!response.ok) {
          return {
            success: false,
            message: `Campus API error: ${response.status} ${response.statusText}`,
            data: null,
          };
        }

        const data = await response.json();

        return {
          success: true,
          message: "Users found",
          data: data.data || [],
        };
      } catch (fetchErr: any) {
        clearTimeout(timeoutId);

        if (fetchErr.name === "AbortError") {
          return {
            success: false,
            message: "Campus API request timeout",
            data: null,
          };
        }

        throw fetchErr;
      }
    } catch (err) {
      console.error(
        "[GuestService] Error searching users from campus API:",
        err,
      );
      return {
        success: false,
        message: "Failed to search users from Campus API",
        data: null,
      };
    }
  }

  /**
   * Get ALL Users from Campus API (for admin browsing)
   */
  async getAllUsersFromCampus(): Promise<ServiceResponse<any[]>> {
    try {
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
        const response = await fetch(`${baseUrl}/users`, {
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
          },
        });

        clearTimeout(timeoutId);

        // Check HTTP status
        if (!response.ok) {
          return {
            success: false,
            message: `Campus API error: ${response.status} ${response.statusText}`,
            data: null,
          };
        }

        const data = await response.json();

        return {
          success: true,
          message: "Users fetched successfully",
          data: data.data || [],
        };
      } catch (fetchErr: any) {
        clearTimeout(timeoutId);

        if (fetchErr.name === "AbortError") {
          return {
            success: false,
            message: "Campus API request timeout",
            data: null,
          };
        }

        throw fetchErr;
      }
    } catch (err) {
      console.error(
        "[GuestService] Error fetching all users from campus API:",
        err,
      );
      return {
        success: false,
        message: "Failed to fetch users from Campus API",
        data: null,
      };
    }
  }

  /**
   * Create Guest Log with duplicate prevention
   */
  async createGuestLog(email: string): Promise<ServiceResponse<any>> {
    try {
      console.log("[GuestService] createGuestLog called with email:", email);

      // Validate email
      if (!email || !email.includes("@")) {
        console.warn("[GuestService] Invalid email format:", email);
        return {
          success: false,
          message: "Invalid email format",
          data: null,
        };
      }

      // Fetch user from Campus API
      console.log("[GuestService] Fetching user from Campus API...");
      const campusUser = await this.getDataUserFromCampus(email);
      console.log("[GuestService] Campus API response:", campusUser);

      if (!campusUser.success) {
        console.error(
          "[GuestService] Campus API fetch failed:",
          campusUser.message,
        );
        return {
          success: false,
          message: `Campus API Error: ${campusUser.message}`,
          data: null,
        };
      }

      console.log("[GuestService] Campus user data:", campusUser.data);

      // Validate required fields from Campus API
      if (!campusUser.data.full_name) {
        console.error("[GuestService] Missing required field: full_name");
        return {
          success: false,
          message: "Campus API did not return user name",
          data: null,
        };
      }

      if (!campusUser.data.nim && !campusUser.data.identifier) {
        console.error("[GuestService] Missing required field: nim/identifier");
        return {
          success: false,
          message: "Campus API did not return user identifier (NIM/NIDN)",
          data: null,
        };
      }

      // Prepare data with fallbacks
      const guestData = {
        name: campusUser.data.full_name,
        email: campusUser.data.email || email, // Fallback to input email
        identifier:
          campusUser.data.nim || campusUser.data.identifier || "UNKNOWN",
        faculty: campusUser.data.faculty || "Not Specified",
        major:
          campusUser.data.prodi || campusUser.data.major || "Not Specified",
        visitDate: new Date(),
      };

      console.log("[GuestService] Prepared guest data:", guestData);

      // Check if user already logged today (prevent duplicate)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const existingLog = await db.query.guestLogs.findFirst({
        where: and(
          eq(guestLogs.email, campusUser.data.email),
          gte(guestLogs.visitDate, today),
        ),
      });

      if (existingLog) {
        console.warn(
          "[GuestService] User already checked in today:",
          campusUser.data.email,
        );
        return {
          success: false,
          message: "User already checked in today",
          data: existingLog,
        };
      }

      // Insert new guest log
      console.log("[GuestService] Inserting guest log to database...");

      try {
        const [newLog] = await db
          .insert(guestLogs)
          .values(guestData)
          .returning();

        if (!newLog) {
          console.error(
            "[GuestService] Failed to insert guest log - no data returned",
          );
          return {
            success: false,
            message: "Failed to create guest log in database",
            data: null,
          };
        }

        console.log(
          "[GuestService] Guest log created successfully:",
          newLog.id,
        );
        return {
          success: true,
          message: "Guest log created successfully",
          data: newLog,
        };
      } catch (dbError: any) {
        console.error("[GuestService] Database insert error:", dbError);
        return {
          success: false,
          message: `Database error: ${dbError.message || "Unknown database error"}`,
          data: null,
        };
      }
    } catch (err) {
      console.error("[GuestService] Error creating guest log:", err);
      return {
        success: false,
        message: `Failed to create guest log: ${err instanceof Error ? err.message : "Unknown error"}`,
        data: null,
      };
    }
  }

  /**
   * Get All Guest Logs (with Pagination)
   */
  async getAllGuestLogs(
    limit = 100,
    page = 1,
  ): Promise<ServiceResponse<any[]>> {
    try {
      const offset = (page - 1) * limit;
      const data = await db
        .select()
        .from(guestLogs)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(guestLogs.visitDate));

      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(guestLogs);

      return {
        success: true,
        message: "Guest logs retrieved successfully",
        data: data,
        meta: {
          total: Number(countResult.count),
          page,
          limit,
          totalPages: Math.ceil(Number(countResult.count) / limit),
        },
      };
    } catch (err) {
      console.error("[GuestService] Error getting guest logs:", err);
      return {
        success: false,
        message: "Failed to get guest logs",
        data: null,
      };
    }
  }

  /**
   * Get Stats (By Faculty/Prodi)
   */
  async getGuestStats(): Promise<ServiceResponse<any>> {
    try {
      // Group by Faculty
      const byFaculty = await db
        .select({
          faculty: guestLogs.faculty,
          count: sql<number>`count(*)`,
        })
        .from(guestLogs)
        .groupBy(guestLogs.faculty);

      // Group by Major (Prodi)
      const byMajor = await db
        .select({
          major: guestLogs.major,
          count: sql<number>`count(*)`,
        })
        .from(guestLogs)
        .groupBy(guestLogs.major);

      return {
        success: true,
        message: "Guest stats retrieved successfully",
        data: {
          byFaculty,
          byMajor,
        },
      };
    } catch (err) {
      console.error("[GuestService] Error getting stats:", err);
      return {
        success: false,
        message: "Failed to get stats",
        data: null,
      };
    }
  }

  /**
   * Edit Guest Log with validation
   */
  async editGuestLog(
    id: string,
    data: DataGuest,
  ): Promise<ServiceResponse<any>> {
    try {
      // Validate ID
      if (!id) {
        return {
          success: false,
          message: "Guest log ID is required",
          data: null,
        };
      }

      // Check if guest log exists
      const existingLog = await db.query.guestLogs.findFirst({
        where: eq(guestLogs.id, id),
      });

      if (!existingLog) {
        return {
          success: false,
          message: "Guest log not found",
          data: null,
        };
      }

      // Update guest log
      const [updateLog] = await db
        .update(guestLogs)
        .set({
          name: data.name,
          email: data.email,
          identifier: data.identifier,
          faculty: data.faculty,
          major: data.major,
        })
        .where(eq(guestLogs.id, id))
        .returning();

      if (!updateLog) {
        return {
          success: false,
          message: "Failed to update guest log",
          data: null,
        };
      }

      return {
        success: true,
        message: "Guest log updated successfully",
        data: updateLog,
      };
    } catch (err) {
      console.error("[GuestService] Error editing guest log:", err);
      return {
        success: false,
        message: "Failed to edit guest log",
        data: null,
      };
    }
  }

  /**
   * Delete Guest Log with validation
   */
  async deleteGuestLog(id: string): Promise<ServiceResponse<any>> {
    try {
      // Validate ID
      if (!id) {
        return {
          success: false,
          message: "Guest log ID is required",
          data: null,
        };
      }

      // Check if guest log exists
      const existingLog = await db.query.guestLogs.findFirst({
        where: eq(guestLogs.id, id),
      });

      if (!existingLog) {
        return {
          success: false,
          message: "Guest log not found",
          data: null,
        };
      }

      // Delete guest log
      const deleteLog = await db.delete(guestLogs).where(eq(guestLogs.id, id));

      if (!deleteLog) {
        return {
          success: false,
          message: "Failed to delete guest log",
          data: null,
        };
      }

      return {
        success: true,
        message: "Guest log deleted successfully",
        data: deleteLog,
      };
    } catch (err) {
      console.error("[GuestService] Error deleting guest log:", err);
      return {
        success: false,
        message: "Failed to delete guest log",
        data: null,
      };
    }
  }
}
