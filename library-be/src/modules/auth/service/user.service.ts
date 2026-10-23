import { db } from "../../../db";
import {
  account,
  bibliographyViews,
  guestLogs,
  loans,
  logs,
  members,
  reservations,
  session,
  Users,
  webTraffic,
} from "../../../db/schema";
import { and, desc, eq, inArray, isNull, ne } from "drizzle-orm";

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
        .where(isNull(Users.deletedAt))
        .orderBy(desc(Users.createdAt));

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

      // Execute Hard Delete inside a Database Transaction
      await db.transaction(async (tx) => {
        // 1. If user has members profile, clean up associated reservation and guest logs
        if (memberRecord) {
          await tx
            .delete(reservations)
            .where(eq(reservations.memberId, memberRecord.id));
          await tx
            .delete(guestLogs)
            .where(eq(guestLogs.memberId, memberRecord.id));
          await tx.delete(members).where(eq(members.id, memberRecord.id));
        }

        // 2. Revoke and delete credentials & active sessions
        await tx.delete(session).where(eq(session.userId, targetUserId));
        await tx.delete(account).where(eq(account.userId, targetUserId));

        // 3. Nullify references in history logs to preserve analytical records safely
        await tx
          .update(logs)
          .set({ userId: null })
          .where(eq(logs.userId, targetUserId));
        await tx
          .update(bibliographyViews)
          .set({ userId: null })
          .where(eq(bibliographyViews.userId, targetUserId));
        await tx
          .update(webTraffic)
          .set({ userId: null })
          .where(eq(webTraffic.userId, targetUserId));

        // 4. Permanently delete the user record
        await tx.delete(Users).where(eq(Users.id, targetUserId));
      });

      return {
        success: true,
        message: "User berhasil dihapus secara permanen",
        data: {
          id: targetUser.id,
          name: targetUser.name,
          email: targetUser.email,
          role: targetUser.role
        }
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
