import { describe, expect, it, vi, beforeEach } from "vitest";
import { CollectionTypeService } from "../service/collection-type.service";
import { db } from "../../../db";

vi.mock("../../../db", () => ({
  db: {
    query: {
      collectionTypes: { findMany: vi.fn(), findFirst: vi.fn() },
      gmds: { findMany: vi.fn(), findFirst: vi.fn() },
    },
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("../../../db/schema", () => ({
  collectionTypes: Symbol("collectionTypes"),
  gmds: Symbol("gmds"),
}));

describe("CollectionTypeService", () => {
  let service: CollectionTypeService;

  beforeEach(() => {
    vi.resetAllMocks();
    service = new CollectionTypeService();
  });

  it("should return all non-deleted collection types", async () => {
    const mockList = [
      { id: 1, name: "Sirkulasi", code: "S", canBeBorrowed: true },
      { id: 2, name: "Referensi", code: "R", canBeBorrowed: false },
    ];
    (db.query.collectionTypes.findMany as any).mockResolvedValue(mockList);

    const result = await service.getAll();
    expect(result).toEqual(mockList);
  });

  it("should create a new collection type with uppercase code", async () => {
    (db.insert as any).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          { id: 3, name: "Cadangan", code: "C", canBeBorrowed: true, description: "Buku cadangan" },
        ]),
      }),
    });

    const result = await service.create({
      name: "Cadangan",
      code: "c",
      canBeBorrowed: true,
      description: "Buku cadangan",
    });

    expect(result.code).toBe("C");
    expect(result.name).toBe("Cadangan");
  });

  it("should update a collection type", async () => {
    (db.update as any).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            { id: 2, name: "Referensi Khusus", code: "R", canBeBorrowed: false },
          ]),
        }),
      }),
    });

    const result = await service.update(2, {
      name: "Referensi Khusus",
      canBeBorrowed: false,
    });

    expect(result.name).toBe("Referensi Khusus");
    expect(result.canBeBorrowed).toBe(false);
  });

  it("should soft delete a collection type", async () => {
    (db.update as any).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            { id: 1, name: "Sirkulasi", deletedAt: new Date() },
          ]),
        }),
      }),
    });

    const result = await service.delete(1);
    expect(result.deletedAt).toBeDefined();
  });

  describe("GMD CRUD", () => {
    it("should return all active GMDs", async () => {
      const mockGmds = [
        { id: 1, name: "Audio" },
        { id: 2, name: "Buku Inti" },
      ];
      (db.query.gmds.findMany as any).mockResolvedValue(mockGmds);

      const result = await service.getAllGmds();
      expect(result).toEqual(mockGmds);
    });

    it("should create a new GMD when name is unique", async () => {
      (db.query.gmds.findFirst as any).mockResolvedValue(null);
      (db.insert as any).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 10, name: "Skripsi Digital" }]),
        }),
      });

      const result = await service.createGmd("  Skripsi Digital  ");
      expect(result).toEqual({ id: 10, name: "Skripsi Digital" });
    });

    it("should reject duplicate GMD name", async () => {
      (db.query.gmds.findFirst as any).mockResolvedValue({ id: 1, name: "Audio" });

      await expect(service.createGmd("audio")).rejects.toThrow(/sudah ada/i);
    });

    it("should update an existing GMD", async () => {
      (db.query.gmds.findFirst as any)
        .mockResolvedValueOnce({ id: 2, name: "Buku Inti" })
        .mockResolvedValueOnce(null);
      (db.update as any).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: 2, name: "Buku Utama" }]),
          }),
        }),
      });

      const result = await service.updateGmd(2, "Buku Utama");
      expect(result).toEqual({ id: 2, name: "Buku Utama" });
    });

    it("should soft delete a GMD", async () => {
      (db.update as any).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              { id: 3, name: "Text", deletedAt: new Date() },
            ]),
          }),
        }),
      });

      const result = await service.deleteGmd(3);
      expect(result?.deletedAt).toBeDefined();
    });
  });
});
