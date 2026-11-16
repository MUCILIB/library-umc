import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../db", () => ({ db: {
  query: Object.fromEntries(["importBatches", "importItemRows", "importBibliographyItemCodes", "bibliographies", "items", "loans"].map(name => [name, { findFirst: vi.fn(), findMany: vi.fn() }])),
  update: vi.fn(), insert: vi.fn(), delete: vi.fn(), select: vi.fn(), transaction: vi.fn(),
} }));
vi.mock("../../shared/utils/stock-sync", () => ({ syncCollectionAvailableStock: vi.fn() }));
import { db } from "../../../db";
import { ImportService } from "../service/import.service";

const service = new ImportService();
const REF = "00000000-0000-4000-8000-000000000001";

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(db.query.importBatches.findFirst).mockResolvedValue({ id: "item-batch", type: "item", status: "preview", referenceBatchId: REF } as any);
  vi.mocked(db.query.importBibliographyItemCodes.findMany).mockResolvedValue([
    { itemCode: "A1", committedBibliographyId: "bib-1" },
    { itemCode: "A2", committedBibliographyId: "bib-1" },
  ] as any);
  vi.mocked(db.query.importItemRows.findMany).mockResolvedValue([
    { rowNumber: 1, rawData: { item_code: "A1" } },
    { rowNumber: 2, rawData: { item_code: "ZZ" } },
  ] as any);
});

describe("pair completeness", () => {
  it("reports bib codes without item detail as missing and unknown item codes as extra", async () => {
    const result = await service.getPairCompleteness("item-batch");
    expect(result.totalExpected).toBe(2);
    expect(result.covered).toBe(1);
    expect(result.missing).toEqual([{ itemCode: "A2", committedBibliographyId: "bib-1" }]);
    expect(result.extra).toEqual([{ rowNumber: 2, itemCode: "ZZ" }]);
  });

  it("rejects batches without a reference bibliography batch", async () => {
    vi.mocked(db.query.importBatches.findFirst).mockResolvedValue({ id: "solo", type: "item", status: "preview", referenceBatchId: null } as any);
    await expect(service.getPairCompleteness("solo")).rejects.toThrow("paired");
  });

  it("rejects unknown batches", async () => {
    vi.mocked(db.query.importBatches.findFirst).mockResolvedValue(undefined as any);
    await expect(service.getPairCompleteness("nope")).rejects.toThrow("Batch not found");
  });
});
