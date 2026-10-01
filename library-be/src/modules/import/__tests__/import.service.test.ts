import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../../../db", () => ({
  db: {
    query: {
      importBatches: { findFirst: vi.fn(), findMany: vi.fn() },
      importBibliographyRows: { findMany: vi.fn() },
      importItemRows: { findMany: vi.fn() },
      importErrors: { findMany: vi.fn() },
      importBibliographyItemCodes: { findMany: vi.fn() },
      bibliographies: { findFirst: vi.fn(), findMany: vi.fn() },
      items: { findFirst: vi.fn() },
      authors: { findFirst: vi.fn() },
      subjects: { findFirst: vi.fn() },
      publishers: { findFirst: vi.fn() },
      publicationPlaces: { findFirst: vi.fn() },
      gmds: { findFirst: vi.fn() },
      languages: { findFirst: vi.fn() },
      locations: { findFirst: vi.fn() },
      collectionTypes: { findFirst: vi.fn() },
      vendors: { findFirst: vi.fn() },
      Users: { findFirst: vi.fn() },
      members: { findFirst: vi.fn() },
    },
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: "test-id" }]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ count: 0 }]),
      }),
    }),
    execute: vi.fn().mockResolvedValue(undefined),
    transaction: vi.fn((fn: any) => Promise.resolve(fn({}))),
  },
}));

vi.mock("../../../db/schema", () => ({
  importBatches: Symbol("importBatches"),
  importBibliographyRows: Symbol("importBibliographyRows"),
  importItemRows: Symbol("importItemRows"),
  importErrors: Symbol("importErrors"),
  importBibliographyItemCodes: Symbol("importBibliographyItemCodes"),
  bibliographies: Symbol("bibliographies"),
  items: Symbol("items"),
  bibliographyAuthors: Symbol("bibliographyAuthors"),
  bibliographySubjects: Symbol("bibliographySubjects"),
  authors: Symbol("authors"),
  subjects: Symbol("subjects"),
  publishers: Symbol("publishers"),
  publicationPlaces: Symbol("publicationPlaces"),
  gmds: Symbol("gmds"),
  collectionTypes: Symbol("collectionTypes"),
  languages: Symbol("languages"),
  locations: Symbol("locations"),
  vendors: Symbol("vendors"),
  guestLogs: Symbol("guestLogs"),
  loans: Symbol("loans"),
  Users: Symbol("Users"),
  account: Symbol("account"),
  members: Symbol("members"),
}));

vi.mock("better-auth/crypto", () => ({
  hashPassword: vi.fn().mockResolvedValue("mocked-hash-password"),
}));

vi.mock("../../shared/utils/stock-sync", () => ({
  syncCollectionAvailableStock: vi.fn().mockResolvedValue(undefined),
}));

import { ImportService } from "../service/import.service";

describe("ImportService", () => {
  let importService: ImportService;

  beforeEach(() => {
    vi.resetAllMocks();
    const { db } = (globalThis as any).__dbMock || {};
    importService = new ImportService();
  });

  describe("Batch creation", () => {
    it("should create a batch with correct type", async () => {
      const { db } = await import("../../../db");
      (db.insert as any).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{
            id: "batch-1",
            type: "bibliography",
            filename: "test.csv",
            status: "uploading",
          }]),
        }),
      });

      const result = await importService.createBatch(
        "bibliography", "test.csv", "user-1", "col1;col2\nval1;val2"
      );

      expect(result.id).toBe("batch-1");
      expect(result.type).toBe("bibliography");
    });
  });

  describe("Batch state machine", () => {
    it("should reject parsing a committed batch", async () => {
      const { db } = await import("../../../db");
      (db.query.importBatches.findFirst as any).mockResolvedValue({
        id: "batch-1", status: "committed",
      });
      await expect(importService.parseBatch("batch-1")).rejects.toThrow("committed");
    });

    it("should reject approving a non-preview batch", async () => {
      const { db } = await import("../../../db");
      (db.query.importBatches.findFirst as any).mockResolvedValue({
        id: "batch-1", status: "uploading",
      });
      await expect(importService.approveBatch("batch-1", "user-1")).rejects.toThrow("uploading");
    });

    it("should reject canceling a committed batch", async () => {
      const { db } = await import("../../../db");
      (db.query.importBatches.findFirst as any).mockResolvedValue({
        id: "batch-1", status: "committed",
      });
      await expect(importService.cancelBatch("batch-1")).rejects.toThrow("committed");
    });
  });

  describe("Preview", () => {
    it("should return batch info and rows", async () => {
      const { db } = await import("../../../db");
      (db.query.importBatches.findFirst as any).mockResolvedValue({
        id: "batch-1", type: "bibliography", status: "preview",
        totalRows: 10, validRows: 8, invalidRows: 2, committedRows: 0,
      });
      (db.query.importBibliographyRows.findMany as any).mockResolvedValue([]);
      (db.query.importErrors.findMany as any).mockResolvedValue([]);
      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 10 }]),
        }),
      });

      const result = await importService.previewBatch("batch-1");
      expect(result.batch.id).toBe("batch-1");
      expect(result.batch.totalRows).toBe(10);
    });
  });

  describe("Cancel", () => {
    it("should cancel a preview batch", async () => {
      const { db } = await import("../../../db");
      (db.query.importBatches.findFirst as any).mockResolvedValue({
        id: "batch-1", status: "preview",
      });
      (db.update as any).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      const result = await importService.cancelBatch("batch-1");
      expect(result.success).toBe(true);
    });
  });

  describe("Errors", () => {
    it("should return errors for a batch", async () => {
      const { db } = await import("../../../db");
      (db.query.importErrors.findMany as any).mockResolvedValue([
        { rowNumber: 1, errors: ["title required"] },
      ]);

      const errors = await importService.getErrors("batch-1");
      expect(errors.length).toBe(1);
    });
  });

  describe("Universal Templates & Simple Imports (TICK-02)", () => {
    it("should generate templates for valid modules", () => {
      const guestTpl = importService.getTemplate("guests");
      expect(guestTpl?.filename).toBe("template_guests.csv");
      expect(guestTpl?.csv).toContain("visit_date");

      const userTpl = importService.getTemplate("users");
      expect(userTpl?.filename).toBe("template_users.csv");
      expect(userTpl?.csv).toContain("role");

      const loanTpl = importService.getTemplate("loans");
      expect(loanTpl?.filename).toBe("template_loans.csv");
      expect(loanTpl?.csv).toContain("due_date");

      const unknownTpl = importService.getTemplate("nonexistent");
      expect(unknownTpl).toBeNull();
    });

    it("should import guests successfully and validate per row", async () => {
      const { db } = await import("../../../db");
      (db.insert as any).mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });

      const csvData = [
        "name;identifier;email;faculty;major;visit_date",
        "Ahmad;2021001;ahmad@test.com;Teknik;Informatika;2025-01-15 09:00:00",
        ";;;;;" // Invalid row (missing name & identifier)
      ].join("\n");

      const result = await importService.importGuests(csvData);
      expect(result.total).toBe(2);
      expect(result.successCount).toBe(1);
      expect(result.errorCount).toBe(1);
      expect(result.errors[0].row).toBe(3);
    });

    it("should import users successfully and report duplicate email", async () => {
      const { db } = await import("../../../db");
      (db.insert as any).mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });
      (db.query.Users.findFirst as any)
        .mockResolvedValueOnce(null) // first row unique
        .mockResolvedValueOnce({ id: "existing-user", email: "existing@test.com" }); // second row duplicate

      const csvData = [
        "name;email;password;role;identifier;faculty;phone",
        "User One;one@test.com;Secret123;student;202101;FT;081234",
        "User Two;existing@test.com;Secret123;student;202102;FT;081235",
      ].join("\n");

      const result = await importService.importUsers(csvData);
      expect(result.total).toBe(2);
      expect(result.successCount).toBe(1);
      expect(result.errorCount).toBe(1);
      expect(result.errors[0].errors[0]).toContain("sudah terdaftar");
    });

    it("should import loans successfully when member and item exist", async () => {
      const { db } = await import("../../../db");
      (db.insert as any).mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });
      (db.update as any).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });
      (db.query.members.findFirst as any).mockResolvedValue({ id: "m-1", nimNidn: "2021001" });
      (db.query.items.findFirst as any).mockResolvedValue({ id: "item-1", itemCode: "BK-01" });

      const csvData = [
        "identifier;item_code;loan_date;due_date;status",
        "2021001;BK-01;2025-01-10;2025-01-17;approved"
      ].join("\n");

      const result = await importService.importLoans(csvData);
      expect(result.total).toBe(1);
      expect(result.successCount).toBe(1);
      expect(result.errorCount).toBe(0);
    });
  });
});
