import { db } from "../db";
import { guestLogs } from "../db/schema";
import { desc, sql, eq } from "drizzle-orm";

export const GuestService = {
  // 1. Create Guest Log
  createGuestLog: async (data: {
    name: string;
    identifier: string; // NIM
    email: string;
    institution: string;
    faculty?: string;
    major?: string;
    purpose?: string;
  }) => {
    try {
      // Simulate fetching from Campus API or use provided data
      // For now, we trust the input data (Admin fills it or system fetches it before calling this)

      const [newLog] = await db
        .insert(guestLogs)
        .values({
          name: data.name,
          email: data.email,
          identifier: data.identifier,
          institution: data.institution || "UMC",
          faculty: data.faculty,
          major: data.major,
          visitDate: new Date(),
        })
        .returning();

      return {
        success: true,
        message: "Guest log created successfully",
        data: newLog,
      };
    } catch (err) {
      console.error("[GuestService] Error creating guest log:", err);
      return {
        success: false,
        message: "Failed to create guest log",
        data: null,
      };
    }
  },

  // 2. Get All Guest Logs (with Pagination)
  getAllGuestLogs: async (limit = 100, page = 1) => {
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
  },

  // 3. Get Stats (By Faculty/Prodi)
  getGuestStats: async () => {
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
        data: {
          byFaculty,
          byMajor,
        },
      };
    } catch (err) {
      console.error("[GuestService] Error getting stats:", err);
      return { success: false, message: "Failed stats", data: null };
    }
  },
};
