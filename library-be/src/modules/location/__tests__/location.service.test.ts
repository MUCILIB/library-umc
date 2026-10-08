import { describe, it, expect, vi, beforeEach } from "vitest";
import locationService from "../service/location.service";
import { db } from "../../../db";

vi.mock("../../../db", () => {
  const mDb: any = {
    query: {
      locations: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
    },
    insert: vi.fn(),
    update: vi.fn(),
    select: vi.fn(),
  };
  return { db: mDb };
});

describe("LocationService - Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("updateLocation (PUT/PATCH)", () => {
    it("harus sukses partial update (PATCH)", async () => {
      (db.query.locations.findFirst as any)
        .mockResolvedValueOnce({ id: 1, room: "R1", rack: "Rak 1", shelf: "L1" }) // existing
        .mockResolvedValueOnce(null); // no duplicate

      const mockReturning = vi.fn().mockResolvedValue([{ id: 1, room: "R1", rack: "Rak 1", shelf: "L2" }]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      (db.update as any).mockReturnValue({ set: mockSet });

      const result = await locationService.updateLocation(1, { shelf: "L2" });
      expect(result.success).toBe(true);
      expect(result.data?.shelf).toBe("L2");
    });

    it("harus tolak jika kombinasi room, rack, shelf sudah ada di ID lain", async () => {
      (db.query.locations.findFirst as any)
        .mockResolvedValueOnce({ id: 1, room: "R1", rack: "Rak 1", shelf: "L1" })
        .mockResolvedValueOnce({ id: 2, room: "R1", rack: "Rak 2", shelf: "L1" });

      const result = await locationService.updateLocation(1, { rack: "Rak 2" });
      expect(result.success).toBe(false);
      expect(result.message).toContain("already exists");
    });
  });

  describe("deleteLocation safety guard", () => {
    it("harus tolak delete jika lokasi masih berisi item buku aktif", async () => {
      (db.query.locations.findFirst as any).mockResolvedValueOnce({ id: 1, room: "R1", rack: "Rak 1", shelf: "L1" });

      const mockWhere = vi.fn().mockResolvedValue([{ value: 3 }]);
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      (db.select as any).mockReturnValue({ from: mockFrom });

      const result = await locationService.deleteLocation(1);
      expect(result.success).toBe(false);
      expect((result as any).conflict).toBe(true);
      expect(result.message).toContain("3 eksemplar buku aktif");
    });

    it("harus berhasil soft-delete jika lokasi kosong dari item buku", async () => {
      (db.query.locations.findFirst as any).mockResolvedValueOnce({ id: 1, room: "R1", rack: "Rak 1", shelf: "L1" });

      const mockWhereSelect = vi.fn().mockResolvedValue([{ value: 0 }]);
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhereSelect });
      (db.select as any).mockReturnValue({ from: mockFrom });

      const mockReturning = vi.fn().mockResolvedValue([{ id: 1, deletedAt: new Date() }]);
      const mockWhereUpdate = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhereUpdate });
      (db.update as any).mockReturnValue({ set: mockSet });

      const result = await locationService.deleteLocation(1);
      expect(result.success).toBe(true);
      expect(result.message).toContain("deleted successfully");
    });
  });
});
