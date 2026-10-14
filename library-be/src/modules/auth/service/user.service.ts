import { db } from "../../../db";
import { loans, members, session, Users } from "../../../db/schema";
import { and, eq, inArray, isNull, ne } from "drizzle-orm";

const ALLOWED_ROLES = ["super_admin", "staff", "student", "lecturer"] as const;

type AllowedRole = (typeof ALLOWED_ROLES)[number];

export const UserService = {
  getAllUsers: async () => {
    try {
      const userRows = await db
        .select({
          id: Users.id,
          name: Users.name,
          email: Users.email,
          image: Users.image,
          role: Users.role,
          banned: Users.banned,
          createdAt: Users.createdAt,
          memberId: members.id,
          memberDeletedAt: members.deletedAt,
          memberCardStatus: members.cardStatus,
          memberCardNumber: members.cardNumber,
          memberCardRequestedAt: members.cardRequestedAt,
          memberCardApprovedAt: members.cardApprovedAt,
          memberCardRejectedAt: members.cardRejectedAt,
          memberCardRejectedReason: members.cardRejectedReason
        })
        .from(Users)
        .leftJoin(members, eq(members.userId, Users.id))
        .where(isNull(Users.deletedAt));

      const users = userRows.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        image: row.image,
        role: row.role,
        banned: row.banned,
        createdAt: row.createdAt,
        hasSyncedMember: Boolean(row.memberId && !row.memberDeletedAt),
        cardStatus:
          row.memberId && !row.memberDeletedAt ? row.memberCardStatus : null,
        cardNumber:
          row.memberId && !row.memberDeletedAt ? row.memberCardNumber : null,
        cardRequestedAt:
          row.memberId && !row.memberDeletedAt
            ? row.memberCardRequestedAt
            : null,
        cardApprovedAt:
          row.memberId && !row.memberDeletedAt
            ? row.memberCardApprovedAt
            : null,
        cardRejectedAt:
          row.memberId && !row.memberDeletedAt
            ? row.memberCardRejectedAt
            : null,
        cardRejectedReason:
          row.memberId && !row.memberDeletedAt
            ? row.memberCardRejectedReason
            : null
      }));

      if (!users) {
        return {
          success: false,
          message: "Get All User failed",
          data: null
        };
      }

      return {
        success: true,
        message: "Get All User Successfully",
        data: users
      };
    } catch (err) {
      console.error("[UserService] Error getting users:", err);
      return {
        success: false,
        message: "Get All User Failed",
        data: null
      };
    }
  },

  updateUserRole: async (
    targetUserId: string,
    nextRole: string,
    actorUserId: string
  ) => {
    try {
      if (!targetUserId) {
        return {
          success: false,
          message: "User target tidak valid",
          data: null
        };
      }

      if (!ALLOWED_ROLES.includes(nextRole as AllowedRole)) {
        return {
          success: false,
          message: "Role tidak valid",
          data: null
        };
      }

      if (targetUserId === actorUserId) {
        return {
          success: false,
          message: "Super admin tidak bisa mengubah role dirinya sendiri",
          data: null
        };
      }

      const targetUser = await db.query.Users.findFirst({
        where: eq(Users.id, targetUserId)
      });

      if (!targetUser) {
        return {
          success: false,
          message: "User tidak ditemukan",
          data: null
        };
      }

      if (targetUser.role === nextRole) {
        return {
          success: true,
          message: "Role sudah sama, tidak ada perubahan",
          data: targetUser
        };
      }

      if (targetUser.role === "super_admin" && nextRole !== "super_admin") {
        const otherSuperAdmins = await db
          .select({ id: Users.id })
          .from(Users)
          .where(and(eq(Users.role, "super_admin"), ne(Users.id, targetUserId)))
          .limit(1);

        if (otherSuperAdmins.length === 0) {
          return {
            success: false,
            message: "Tidak bisa mengubah role super admin terakhir",
            data: null
          };
        }
      }

      const [updated] = await db
        .update(Users)
        .set({ role: nextRole, updatedAt: new Date() })
        .where(eq(Users.id, targetUserId))
        .returning({
          id: Users.id,
          name: Users.name,
          email: Users.email,
          image: Users.image,
          role: Users.role,
          banned: Users.banned,
          createdAt: Users.createdAt
        });

      return {
        success: true,
        message: "Role user berhasil diperbarui",
        data: updated ?? null
      };
    } catch (err) {
      console.error("[UserService] Error updating user role:", err);
      return {
        success: false,
        message: "Gagal memperbarui role user",
        data: null
      };
    }
  },

  updateUserBanStatus: async (
    targetUserId: string,
    banned: boolean,
    actorUserId: string,
    banReason?: string
  ) => {
    try {
      if (!targetUserId) {
        return {
          success: false,
          message: "User target tidak valid",
          data: null
        };
      }

      if (targetUserId === actorUserId) {
        return {
          success: false,
          message: "Super admin tidak bisa mengubah status ban dirinya sendiri",
          data: null
        };
      }

      const targetUser = await db.query.Users.findFirst({
        where: eq(Users.id, targetUserId)
      });

      if (!targetUser) {
        return {
          success: false,
          message: "User tidak ditemukan",
          data: null
        };
      }

      if (targetUser.banned === banned) {
        return {
          success: true,
          message: "Status ban sudah sama, tidak ada perubahan",
          data: targetUser
        };
      }

      if (targetUser.role === "super_admin" && banned) {
        const otherActiveSuperAdmins = await db
          .select({ id: Users.id })
          .from(Users)
          .where(
            and(
              eq(Users.role, "super_admin"),
              ne(Users.id, targetUserId),
              eq(Users.banned, false)
            )
          )
          .limit(1);

        if (otherActiveSuperAdmins.length === 0) {
          return {
            success: false,
            message: "Tidak bisa ban super admin aktif terakhir",
            data: null
          };
        }
      }

      const [updated] = await db
        .update(Users)
        .set({
          banned,
          banReason: banned ? banReason || "Diblokir oleh super admin" : null,
          banExpires: null,
          updatedAt: new Date()
        })
        .where(eq(Users.id, targetUserId))
        .returning({
          id: Users.id,
          name: Users.name,
          email: Users.email,
          image: Users.image,
          role: Users.role,
          banned: Users.banned,
          createdAt: Users.createdAt
        });

      return {
        success: true,
        message: banned ? "User berhasil di-ban" : "User berhasil di-unban",
        data: updated ?? null
      };
    } catch (err) {
      console.error("[UserService] Error updating user ban status:", err);
      return {
        success: false,
        message: "Gagal memperbarui status ban user",
        data: null
      };
    }
  },

  deleteUser: async (targetUserId: string, actorUserId: string) => {
    try {
      if (!targetUserId) {
        return {
          success: false,
          message: "User target tidak valid",
          data: null
        };
      }

      if (targetUserId === actorUserId) {
        return {
          success: false,
          message: "Super admin tidak bisa menghapus akun dirinya sendiri",
          data: null
        };
      }

      const targetUser = await db.query.Users.findFirst({
        where: and(eq(Users.id, targetUserId), isNull(Users.deletedAt))
      });

      if (!targetUser) {
        return {
          success: false,
          message: "User tidak ditemukan atau sudah dihapus",
          data: null
        };
      }

      if (targetUser.role === "super_admin") {
        const otherActiveSuperAdmins = await db
          .select({ id: Users.id })
          .from(Users)
          .where(
            and(
              eq(Users.role, "super_admin"),
              ne(Users.id, targetUserId),
              isNull(Users.deletedAt)
            )
          )
          .limit(1);

        if (otherActiveSuperAdmins.length === 0) {
          return {
            success: false,
            message: "Tidak bisa menghapus super admin terakhir",
            data: null
          };
        }
      }

      // Check if user has a member profile with active loans
      const memberRecord = await db.query.members.findFirst({
        where: and(eq(members.userId, targetUserId), isNull(members.deletedAt))
      });

      if (memberRecord) {
        const activeLoans = await db
          .select({ id: loans.id })
          .from(loans)
          .where(
            and(
              eq(loans.memberId, memberRecord.id),
              inArray(loans.status, ["approved", "extended"]),
              isNull(loans.deletedAt)
            )
          )
          .limit(1);

        if (activeLoans.length > 0) {
          return {
            success: false,
            message:
              "User tidak dapat dihapus karena masih memiliki peminjaman buku yang aktif/sedang berjalan. Selesaikan pengembalian buku terlebih dahulu.",
            data: null
          };
        }
      }

      const now = new Date();

      // 1. Soft delete user and mark banned so token/credentials are blocked
      const [deleted] = await db
        .update(Users)
        .set({
          deletedAt: now,
          banned: true,
          banReason: "Akun dihapus oleh super admin",
          updatedAt: now
        })
        .where(eq(Users.id, targetUserId))
        .returning({
          id: Users.id,
          name: Users.name,
          email: Users.email,
          role: Users.role,
          deletedAt: Users.deletedAt
        });

      // 2. Revoke all active sessions for this user
      await db.delete(session).where(eq(session.userId, targetUserId));

      // 3. If there is a linked member, soft delete the member as well
      if (memberRecord) {
        await db
          .update(members)
          .set({
            deletedAt: now,
            updatedAt: now
          })
          .where(eq(members.id, memberRecord.id));
      }

      return {
        success: true,
        message: "User berhasil dihapus",
        data: deleted ?? null
      };
    } catch (err) {
      console.error("[UserService] Error deleting user:", err);
      return {
        success: false,
        message: "Gagal menghapus user",
        data: null
      };
    }
  }
};
