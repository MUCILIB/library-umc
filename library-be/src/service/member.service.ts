import { db } from "../db";
import { members } from "../db/schema";
import { eq } from "drizzle-orm";

export const MemberService = {
  // Get member by id
  getMemberByUserId: async (userId: string) => {
    try {
      const member = await db.query.members.findFirst({
        where: eq(members.userId, userId),
        with: {
          user: true,
        },
      });

      if (!member) {
        return {
          success: false,
          message: "Member not found",
          data: null,
        };
      }

      return {
        success: true,
        message: "Get Member By User Id Successfully",
        data: member,
      };
    } catch (err) {
      console.error("[MemberService] Error getting number userId", err);
      return {
        success: false,
        message: "Get Member By User id failed",
        data: null,
      };
    }
  },

  // Update profile
  updateProfile: async (userId: string, data: any) => {
    try {
      // Pastikan member ada
      const member = await db.query.members.findFirst({
        where: eq(members.userId, userId),
      });

      if (!member) {
        return {
          success: false,
          message: "Member not found",
          data: null,
        };
      }

      const updateDataMember = {
        nimNidn: data.nimNidn,
        faculty: data.faculty,
        phone: data.phone,
        updatedAt: new Date(),
      };

      // Tambahkan .returning() agar mengembalikan data yang sudah diupdate
      const [updatedMember] = await db
        .update(members)
        .set(updateDataMember)
        .where(eq(members.userId, userId))
        .returning();

      if (!updatedMember) {
        return {
          success: false,
          message: "Update Profile Failed",
          data: null,
        };
      }

      return {
        success: true,
        message: "Update Profile Successfully",
        data: updatedMember,
      };
    } catch (err) {
      console.error("[MemberService] Error updating profile", err);
      return {
        success: false,
        message: "Update Profile Failed",
        data: null,
      };
    }
  },
};
