import { db } from "../db";
import { members } from "../db/schema";
import { eq } from "drizzle-orm";

type ServiceResponse<T> = {
  success: boolean;
  message: string;
  data: T | null;
};

type UpdateProfileData = {
  nimNidn?: string;
  faculty?: string;
  phone?: string;
};

export class MemberService {
  /**
   * Get member by user ID
   */
  async getMemberByUserId(userId: string): Promise<ServiceResponse<any>> {
    try {
      // Validate userId
      if (!userId) {
        return {
          success: false,
          message: "User ID is required",
          data: null,
        };
      }

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
        message: "Member retrieved successfully",
        data: member,
      };
    } catch (err) {
      console.error("[MemberService] Error getting member by userId:", err);
      return {
        success: false,
        message: "Failed to get member",
        data: null,
      };
    }
  }

  /**
   * Update member profile with validation
   */
  async updateProfile(
    userId: string,
    data: UpdateProfileData,
  ): Promise<ServiceResponse<any>> {
    try {
      // Validate userId
      if (!userId) {
        return {
          success: false,
          message: "User ID is required",
          data: null,
        };
      }

      // Check if member exists
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

      // Validate phone number format (if provided)
      if (data.phone && data.phone.trim() !== "") {
        const phoneRegex = /^[\d\s\-+()]+$/;
        if (!phoneRegex.test(data.phone)) {
          return {
            success: false,
            message: "Invalid phone number format",
            data: null,
          };
        }
      }

      // Prepare update data
      const updateDataMember = {
        nimNidn: data.nimNidn?.trim() || member.nimNidn,
        faculty: data.faculty?.trim() || member.faculty,
        phone: data.phone?.trim() || member.phone,
        updatedAt: new Date(),
      };

      // Update member
      const [updatedMember] = await db
        .update(members)
        .set(updateDataMember)
        .where(eq(members.userId, userId))
        .returning();

      if (!updatedMember) {
        return {
          success: false,
          message: "Failed to update profile",
          data: null,
        };
      }

      return {
        success: true,
        message: "Profile updated successfully",
        data: updatedMember,
      };
    } catch (err) {
      console.error("[MemberService] Error updating profile:", err);
      return {
        success: false,
        message: "Failed to update profile",
        data: null,
      };
    }
  }
}
