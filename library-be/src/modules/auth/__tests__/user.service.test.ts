import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserService } from "../service/user.service";
import { db } from "../../../db";

vi.mock("../../../db", () => {
  const mockOrderBy = vi.fn().mockResolvedValue([
    {
      id: "user-new",
      name: "New User",
      email: "new@example.com",
      image: null,
      role: "student",
      banned: false,
      createdAt: new Date("2026-10-23T10:00:00Z"),
      memberId: "mem-1",
      memberDeletedAt: null,
      memberCardStatus: "not_requested",
      memberCardNumber: null,
      memberCardRequestedAt: null,
      memberCardApprovedAt: null,
      memberCardRejectedAt: null,
      memberCardRejectedReason: null,
    },
    {
      id: "user-old",
      name: "Old User",
      email: "old@example.com",
      image: null,
      role: "student",
      banned: false,
      createdAt: new Date("2026-10-20T10:00:00Z"),
      memberId: null,
      memberDeletedAt: null,
      memberCardStatus: null,
      memberCardNumber: null,
      memberCardRequestedAt: null,
      memberCardApprovedAt: null,
      memberCardRejectedAt: null,
      memberCardRejectedReason: null,
    },
  ]);

  const mockWhere = vi.fn().mockReturnValue({
    orderBy: mockOrderBy,
    limit: vi.fn().mockResolvedValue([{ id: "admin-2" }]),
  });

  const mockLeftJoin = vi.fn().mockReturnValue({
    where: mockWhere,
  });

  const mockFrom = vi.fn().mockReturnValue({
    leftJoin: mockLeftJoin,
    where: mockWhere,
  });

  const mockSelect = vi.fn().mockReturnValue({
    from: mockFrom,
  });

  const mockTx = {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ id: "mem-1" }]),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([]),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    }),
  };

  return {
    db: {
      select: mockSelect,
      query: {
        Users: {
          findFirst: vi.fn(),
        },
        members: {
          findFirst: vi.fn(),
        },
      },
      transaction: vi.fn().mockImplementation(async (callback) => {
        return callback(mockTx);
      }),
    },
  };
});

describe("UserService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAllUsers", () => {
    it("should return users ordered by createdAt descending and map hasSyncedMember", async () => {
      const result = await UserService.getAllUsers();
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data![0].id).toBe("user-new");
      expect(result.data![0].hasSyncedMember).toBe(true);
      expect(result.data![1].id).toBe("user-old");
      expect(result.data![1].hasSyncedMember).toBe(false);
    });
  });

  describe("deleteUser (hard delete)", () => {
    it("should reject deleting self", async () => {
      const res = await UserService.deleteUser("admin-1", "admin-1");
      expect(res.success).toBe(false);
      expect(res.message).toContain("tidak bisa menghapus akun dirinya sendiri");
    });

    it("should reject if target user not found", async () => {
      vi.mocked(db.query.Users.findFirst).mockResolvedValueOnce(undefined as any);
      const res = await UserService.deleteUser("non-existent", "admin-1");
      expect(res.success).toBe(false);
      expect(res.message).toContain("tidak ditemukan");
    });

    it("should reject deleting user with active loans", async () => {
      vi.mocked(db.query.Users.findFirst).mockResolvedValueOnce({
        id: "student-1",
        role: "student",
        name: "Student",
        email: "student@example.com",
        deletedAt: null,
      } as any);

      vi.mocked(db.query.members.findFirst).mockResolvedValueOnce({
        id: "mem-1",
        userId: "student-1",
        deletedAt: null,
      } as any);

      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValueOnce([{ id: "loan-1" }]),
          }),
        }),
      } as any);

      const res = await UserService.deleteUser("student-1", "admin-1");
      expect(res.success).toBe(false);
      expect(res.message).toContain("masih memiliki peminjaman buku yang aktif");
    });

    it("should execute hard delete inside transaction when safe to delete", async () => {
      vi.mocked(db.query.Users.findFirst).mockResolvedValueOnce({
        id: "student-1",
        role: "student",
        name: "Student",
        email: "student@example.com",
        deletedAt: null,
      } as any);

      vi.mocked(db.query.members.findFirst).mockResolvedValueOnce({
        id: "mem-1",
        userId: "student-1",
        deletedAt: null,
      } as any);

      // loans check -> empty
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValueOnce([]),
          }),
        }),
      } as any);

      const res = await UserService.deleteUser("student-1", "admin-1");
      expect(res.success).toBe(true);
      expect(res.message).toContain("berhasil dihapus secara permanen");
      expect(db.transaction).toHaveBeenCalled();
    });
  });
});
