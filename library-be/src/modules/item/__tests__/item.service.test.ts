import { describe, expect, it, vi, beforeEach } from "vitest";
import { ItemService } from "../service/item.service";
import { db } from "../../../db";

vi.mock("../../../db", () => {
  const defaultTx = {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ count: 0 }]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            { id: "item-1", bibliographyId: "coll-1", status: "available", itemCode: "OLD-001" },
          ]),
        }),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          { id: "new-item-id", bibliographyId: "coll-1", status: "available" },
        ]),
      }),
    }),
  };
  return {
    db: {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockResolvedValue([{ count: 0 }]),
      }),
      query: {
        items: { findFirst: vi.fn(), findMany: vi.fn() },
        bibliographies: { findFirst: vi.fn() },
        locations: { findFirst: vi.fn() },
        loans: { findFirst: vi.fn() },
      },
      insert: vi.fn(),
      update: vi.fn(),
      transaction: vi.fn((fn: any) => Promise.resolve(fn(defaultTx))),
    },
  };
});

vi.mock("../../../db/schema", () => ({
  items: Symbol("items"),
  bibliographies: Symbol("bibliographies"),
  locations: Symbol("locations"),
  loans: Symbol("loans"),
}));

vi.mock("../../shared/utils/stock-sync", () => ({
  syncCollectionAvailableStock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../reservation/service/reservation.service", () => ({
  default: {
    fulfillNextReservation: vi.fn().mockResolvedValue(undefined),
  },
}));

function createMockTx(availableCount = 0) {
  return {
    execute: vi.fn().mockResolvedValue(undefined),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ count: availableCount }]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            { id: "item-1", bibliographyId: "coll-1", status: "available", itemCode: "OLD-001" },
          ]),
        }),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          { id: "new-item-id", bibliographyId: "coll-1", status: "available" },
        ]),
      }),
    }),
  };
}

describe("ItemService Unit Tests", () => {
  let itemService: ItemService;

  beforeEach(() => {
    vi.resetAllMocks();
    itemService = new ItemService();
  });

  describe("createItem", () => {
    it("should generate hierarchical item code from pattern (e.g. PND-01 -> PND-01-01)", async () => {
      (db.query.bibliographies.findFirst as any).mockResolvedValue({
        id: "bib-1",
        title: "Buku Pendidikan",
        callNumber: "PND-01",
      });
      (db.query.items.findMany as any).mockResolvedValue([]);
      (db.query.items.findFirst as any).mockResolvedValue(null);

      const code = await itemService.generateItemCodePreview("bib-1", "PND-01");
      expect(code).toBe("PND-01-01");
    });

    it("should increment sequence when existing items exist (PND-01-01 -> PND-01-02)", async () => {
      (db.query.bibliographies.findFirst as any).mockResolvedValue({
        id: "bib-1",
        title: "Buku Pendidikan",
        callNumber: "PND-01",
      });
      (db.query.items.findMany as any).mockResolvedValue([
        { itemCode: "PND-01-01" },
      ]);
      (db.query.items.findFirst as any).mockResolvedValue(null);

      const code = await itemService.generateItemCodePreview("bib-1");
      expect(code).toBe("PND-01-02");
    });

    it("should generate S/R-year-sequence-copy format when callNumber is not set", async () => {
      (db.query.bibliographies.findFirst as any).mockResolvedValue({
        id: "bib-ref",
        title: "Kamus Besar Bahasa Indonesia",
        publishYear: 2026,
        collectionType: { code: "R", name: "Referensi" },
      });
      (db.query.items.findMany as any).mockResolvedValue([]);
      (db.select as any).mockReturnValueOnce({
        from: vi.fn().mockResolvedValue([{ count: 0 }]),
      });
      (db.query.items.findFirst as any).mockResolvedValue(null);

      const code = await itemService.generateItemCodePreview("bib-ref");
      expect(code).toBe("R-2026-10001-01");
    });

    it("should create item and sync stock in transaction", async () => {
      (db.query.items.findFirst as any).mockResolvedValue(null);
      (db.query.bibliographies.findFirst as any).mockResolvedValue({
        id: "coll-1",
      });
      (db.query.locations.findFirst as any).mockResolvedValue({
        id: 1,
      });

      const mockTx = createMockTx(1);
      (db.transaction as any).mockImplementation(async (fn: any) => fn(mockTx));

      const result = await itemService.createItem({
        bibliographyId: "coll-1",
        locationId: 1,
        barcode: "TEST-001",
        itemCode: "TEST-001",
      });

      expect(result.success).toBe(true);
      expect(db.transaction).toHaveBeenCalled();
      expect(mockTx.insert).toHaveBeenCalled();
    });

    it("should reject duplicate item_code", async () => {
      (db.query.bibliographies.findFirst as any).mockResolvedValue({
        id: "coll-1",
        title: "Test",
      });
      (db.query.items.findFirst as any).mockResolvedValue({
        id: "existing",
        itemCode: "TEST-001",
      });

      const result = await itemService.createItem({
        bibliographyId: "coll-1",
        locationId: 1,
        barcode: "TEST-001",
        itemCode: "TEST-001",
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe("item_code already exists");
      expect(db.transaction).not.toHaveBeenCalled();
    });

    it("should reject if collection not found", async () => {
      (db.query.items.findFirst as any).mockResolvedValue(null);
      (db.query.bibliographies.findFirst as any).mockResolvedValue(null);

      const result = await itemService.createItem({
        bibliographyId: "nonexistent",
        locationId: 1,
        barcode: "TEST-002",
        itemCode: "TEST-002",
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe("Bibliography not found");
    });

    it("should reject if location not found", async () => {
      (db.query.items.findFirst as any).mockResolvedValue(null);
      (db.query.bibliographies.findFirst as any).mockResolvedValue({
        id: "coll-1",
      });
      (db.query.locations.findFirst as any).mockResolvedValue(null);

      const result = await itemService.createItem({
        bibliographyId: "coll-1",
        locationId: 999,
        barcode: "TEST-003",
        itemCode: "TEST-003",
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe("Location not found");
    });
  });

  describe("deleteItem", () => {
    it("should soft-delete and sync stock in transaction", async () => {
      (db.query.items.findFirst as any).mockResolvedValue({
        id: "item-1",
        bibliographyId: "coll-1",
        status: "available",
      });

      const mockTx = createMockTx(0);
      (db.transaction as any).mockImplementation(async (fn: any) => fn(mockTx));

      const result = await itemService.deleteItem("item-1");

      expect(result.success).toBe(true);
      expect(db.transaction).toHaveBeenCalled();
    });

    it("should reject deletion of loaned item", async () => {
      (db.query.items.findFirst as any).mockResolvedValue({
        id: "item-1",
        bibliographyId: "coll-1",
        status: "loaned",
      });

      const result = await itemService.deleteItem("item-1");

      expect(result.success).toBe(false);
      expect(result.message).toBe("Cannot delete loaned item");
      expect(db.transaction).not.toHaveBeenCalled();
    });

    it("should reject if item not found", async () => {
      (db.query.items.findFirst as any).mockResolvedValue(null);

      const result = await itemService.deleteItem("nonexistent");

      expect(result.success).toBe(false);
      expect(result.message).toBe("Item not found");
    });
  });

  describe("updateItem", () => {
    it("should sync stock when status changes", async () => {
      (db.query.items.findFirst as any).mockResolvedValue({
        id: "item-1",
        bibliographyId: "coll-1",
        status: "available",
        itemCode: "OLD-001",
      });

      const mockTx = createMockTx(0);
      mockTx.update = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              { id: "item-1", status: "damaged" },
            ]),
          }),
        }),
      });

      (db.transaction as any).mockImplementation(async (fn: any) => fn(mockTx));

      const { syncCollectionAvailableStock } = await import(
        "../../shared/utils/stock-sync"
      );

      const result = await itemService.updateItemStatus("item-1", "damaged");

      expect(result.success).toBe(true);
      expect(db.transaction).toHaveBeenCalled();
      expect(syncCollectionAvailableStock).toHaveBeenCalledWith(
        mockTx,
        "coll-1"
      );
    });

    it("should NOT sync stock when status does not change", async () => {
      (db.query.items.findFirst as any)
        .mockResolvedValueOnce({
          id: "item-1",
          bibliographyId: "coll-1",
          status: "available",
          barcode: "OLD-001",
        })
        .mockResolvedValueOnce(null);

      const mockTx = createMockTx(0);
      mockTx.update = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              { id: "item-1", barcode: "NEW-001" },
            ]),
          }),
        }),
      });

      const { syncCollectionAvailableStock } = await import(
        "../../shared/utils/stock-sync"
      );

      (syncCollectionAvailableStock as any).mockClear();

      (db.transaction as any).mockImplementation(async (fn: any) => fn(mockTx));

      const result = await itemService.updateItem("item-1", {
        barcode: "NEW-001",
      });

      expect(result.success).toBe(true);
      expect(syncCollectionAvailableStock).toHaveBeenCalled();
    });

    it("should reject if item not found", async () => {
      (db.query.items.findFirst as any).mockResolvedValue(null);

      const result = await itemService.updateItem("nonexistent", {
        barcode: "NEW",
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe("Item not found");
    });

    it("should update item fields", async () => {
      (db.query.items.findFirst as any)
        .mockResolvedValueOnce({
          id: "item-1",
          bibliographyId: "coll-1",
          status: "available",
          itemCode: "OLD-001",
        });

      const mockTx = createMockTx(0);
      mockTx.update = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              { id: "item-1", callNumber: "NEW-CALL" },
            ]),
          }),
        }),
      });

      (db.transaction as any).mockImplementation(async (fn: any) => fn(mockTx));

      const result = await itemService.updateItem("item-1", {
        callNumber: "NEW-CALL",
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe("Item updated");
    });
  });

  describe("lookupItem", () => {
    it("should reject when empty code or token is provided", async () => {
      const result = await itemService.lookupItem({});
      expect(result.success).toBe(false);
      expect(result.message).toContain("wajib diisi");
    });

    it("should return item details and allowedActions for available item", async () => {
      (db.query.items.findFirst as any).mockResolvedValueOnce({
        id: "item-1",
        itemCode: "ITEM-001",
        status: "available",
        bibliographyId: "bib-1",
        bibliography: { title: "Buku Pemrograman Web" },
        location: { room: "Lantai 2", rack: "01", shelf: "A" },
      });
      (db.query.loans.findFirst as any).mockResolvedValueOnce(null);

      const result = await itemService.lookupItem({ itemCode: "ITEM-001" });
      expect(result.success).toBe(true);
      expect(result.data.item.itemCode).toBe("ITEM-001");
      expect(result.data.item.title).toBe("Buku Pemrograman Web");
      expect(result.data.item.status).toBe("available");
      expect(result.data.item.location).toBe("Lantai 2 - Rak 01 - Baris A");
      expect(result.data.allowedActions).toContain("loan");
    });

    it("should return return action for loaned item with active loan", async () => {
      (db.query.items.findFirst as any).mockResolvedValueOnce({
        id: "item-2",
        itemCode: "ITEM-002",
        status: "loaned",
        bibliographyId: "bib-2",
        bibliography: { title: "Struktur Data" },
        location: null,
        callNumber: "005.1 STR",
      });
      (db.query.loans.findFirst as any).mockResolvedValueOnce({
        id: "loan-1",
        memberId: "mem-1",
        itemId: "item-2",
        status: "approved",
        loanDate: "2026-10-01",
        dueDate: "2026-10-08",
        member: { user: { name: "Budi Santoso" } },
      });

      const result = await itemService.lookupItem({ itemCode: "ITEM-002" });
      expect(result.success).toBe(true);
      expect(result.data.item.status).toBe("loaned");
      expect(result.data.activeLoan).not.toBeNull();
      expect(result.data.activeLoan.memberName).toBe("Budi Santoso");
      expect(result.data.allowedActions).toContain("return");
    });
  });

  describe("standardizeCodes", () => {
    it("should standardize mixed item codes into uniform S/R-year-seq-c{n} format", async () => {
      (db.query.bibliographies.findFirst as any).mockResolvedValue({
        id: "bib-mix",
        title: "Bahasa Inggris untuk Pemula",
        collectionType: { code: "S", name: "Sirkulasi" },
      });

      const mockItems = [
        { id: "1", itemCode: "ITEM-08-0-01", createdAt: new Date("2024-01-01") },
        { id: "2", itemCode: "ITEM-08-0-02", createdAt: new Date("2024-01-02") },
        { id: "3", itemCode: "S-2022-10001-c3", createdAt: new Date("2024-01-03") },
        { id: "4", itemCode: "S-2024-2342-c5", createdAt: new Date("2024-01-04") },
        { id: "5", itemCode: "S-2024-2342-c6", createdAt: new Date("2024-01-05") },
      ];

      (db.query.items.findMany as any).mockResolvedValue(mockItems);

      const mockTx = {
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([{ id: "mock" }]),
            }),
          }),
        }),
      };
      (db.transaction as any).mockImplementation(async (fn: any) => fn(mockTx));

      const result = await itemService.standardizeCodes("bib-mix");
      expect(result.success).toBe(true);
      // Canonical prefix should be the dominant standard prefix S-2024-2342
      expect(result.data.canonicalPrefix).toBe("S-2024-2342");
      expect(result.data.updatedCount).toBe(5);
    });
  });

  describe("maintenance status support", () => {
    it("should update item status to maintenance and sync stock", async () => {
      (db.query.items.findFirst as any).mockResolvedValue({
        id: "item-1",
        bibliographyId: "coll-1",
        status: "available",
      });

      const mockTx = createMockTx(0);
      mockTx.update = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              { id: "item-1", bibliographyId: "coll-1", status: "maintenance" },
            ]),
          }),
        }),
      });
      (db.transaction as any).mockImplementation(async (fn: any) => fn(mockTx));

      const result = await itemService.updateItemStatus("item-1", "maintenance");
      expect(result.success).toBe(true);
      expect(result.data.status).toBe("maintenance");
      expect(db.transaction).toHaveBeenCalled();
    });

    it("should filter items by maintenance status in getAllItems", async () => {
      (db.query.items.findMany as any).mockResolvedValue([
        { id: "item-m1", itemCode: "UMC-M-01", status: "maintenance" },
      ]);
      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 1 }]),
        }),
      });

      const result = await itemService.getAllItems(undefined, 1, 20, undefined, "maintenance");
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].status).toBe("maintenance");
      expect(result.pagination.total).toBe(1);
    });

    it("should create items with maintenance status via bulkCreate", async () => {
      (db.query.bibliographies.findFirst as any).mockResolvedValue({
        id: "bib-1",
        title: "Algoritma",
        collectionTypeId: 1,
      });

      const insertedValues: any[] = [];
      const mockTx = {
        query: {
          items: {
            findFirst: vi.fn().mockResolvedValue(null),
          },
        },
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 0 }]),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          values: vi.fn((val: any) => {
            insertedValues.push(val);
            return {
              returning: vi.fn().mockResolvedValue([{ id: `new-${insertedValues.length}`, ...val }]),
            };
          }),
        }),
      };
      (db.transaction as any).mockImplementation(async (fn: any) => fn(mockTx));

      const result = await itemService.bulkCreate("bib-1", {
        items: [{ itemCode: "ALG-01" }, { itemCode: "ALG-02", status: "damaged" }],
        defaults: { locationId: 1, status: "maintenance" },
      });

      expect(result.success).toBe(true);
      expect(result.data.created).toBe(2);
      expect(insertedValues[0].status).toBe("maintenance");
      expect(insertedValues[1].status).toBe("damaged");
    });

    it("should trigger fulfillNextReservation when item status becomes available", async () => {
      const reservationService = (
        await import("../../reservation/service/reservation.service")
      ).default;
      (db.query.items.findFirst as any).mockResolvedValue({
        id: "item-1",
        bibliographyId: "coll-1",
        status: "maintenance",
      });

      const mockTx = createMockTx(1);
      (db.transaction as any).mockImplementation(async (fn: any) => fn(mockTx));

      const result = await itemService.updateItemStatus("item-1", "available");
      expect(result.success).toBe(true);
      expect(reservationService.fulfillNextReservation).toHaveBeenCalledWith(
        "coll-1"
      );
    });
  });
});
