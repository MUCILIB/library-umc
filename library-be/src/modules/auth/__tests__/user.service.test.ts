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
  });

  const mockLeftJoin = vi.fn().mockReturnValue({
    where: mockWhere,
  });

  const mockFrom = vi.fn().mockReturnValue({
    leftJoin: mockLeftJoin,
  });

  const mockSelect = vi.fn().mockReturnValue({
    from: mockFrom,
  });

  return {
    db: {
      select: mockSelect,
    },
  };
});

describe("UserService.getAllUsers", () => {
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
