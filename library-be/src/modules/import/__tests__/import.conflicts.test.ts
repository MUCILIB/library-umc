import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../db", () => ({ db: {
  query: Object.fromEntries(["importBatches", "importItemRows", "importBibliographyItemCodes", "bibliographies", "items", "loans"].map(name => [name, { findFirst: vi.fn(), findMany: vi.fn() }])),
  update: vi.fn(), insert: vi.fn(), delete: vi.fn(), select: vi.fn(), transaction: vi.fn(),
} }));
vi.mock("../../shared/utils/stock-sync", () => ({ syncCollectionAvailableStock: vi.fn() }));
import { db } from "../../../db";
import { importErrors, importItemRows, items } from "../../../db/schema";
import { ImportService } from "../service/import.service";

const service = new ImportService();
let writes: Array<{ table: unknown; data: any }>;
let errors: any[];
const bib = { id: "bib-a", title: "Title A", callNumber: "001" };
const row = (raw: Record<string, string>, n = 1) => ({ id: `row-${n}`, batchId: "batch", rowNumber: n, rawData: raw, status: "valid", resolvedData: { ...raw, _resolvedBibliographyId: bib.id } });

beforeEach(() => {
  vi.resetAllMocks();
  writes = []; errors = [];
  vi.mocked(db.query.importBatches.findFirst).mockResolvedValue({ id: "batch", type: "item", status: "preview" } as any);
  vi.mocked(db.query.importItemRows.findMany).mockResolvedValue([]);
  vi.mocked(db.query.bibliographies.findMany).mockResolvedValue([bib] as any);
  vi.mocked(db.query.bibliographies.findFirst).mockResolvedValue(bib as any);
  vi.mocked(db.query.importBibliographyItemCodes.findMany).mockResolvedValue([]);
  vi.mocked(db.update).mockImplementation((table: any) => ({ set: (data: any) => ({ where: async () => { writes.push({ table, data }); } }) }) as any);
  vi.mocked(db.insert).mockImplementation((table: any) => ({ values: async (data: any) => { if (table === importErrors) errors.push(data); } }) as any);
  vi.mocked(db.delete).mockReturnValue({ where: async () => { errors = []; } } as any);
  vi.mocked(db.select).mockReturnValue({ from: () => ({ where: async () => [{ count: 0 }] }) } as any);
  vi.mocked(db.transaction).mockImplementation(async (fn: any) => fn(db));
});

function rowWrite() { return writes.find(w => w.table === importItemRows)?.data; }

describe("SLiMS item conflicts", () => {
  it.each([
    ["ambiguous title", [{ ...bib }, { ...bib, id: "bib-b" }], undefined],
    ["existing code belongs to another bibliography", [bib], { id: "item", bibliographyId: "bib-b" }],
    ["call number contradicts title match", [bib], undefined, "999"],
  ])("rejects %s", async (_name, candidates, existing, callNumber) => {
    vi.mocked(db.query.importItemRows.findMany).mockResolvedValue([row({ item_code: "CODE", title: "Title A", ...(callNumber ? { call_number: callNumber } : {}) })] as any);
    vi.mocked(db.query.bibliographies.findMany).mockResolvedValue(candidates as any);
    vi.mocked(db.query.items.findFirst).mockResolvedValue(existing as any);
    const result = await service.validateBatch("batch");
    expect(result.invalidRows).toBe(1);
    expect(errors[0].errors.length).toBeGreaterThan(0);
  });

  it("previews only empty same-bibliography text details and preserves populated values", async () => {
    vi.mocked(db.query.importItemRows.findMany).mockResolvedValue([row({ item_code: "CODE", title: "Title A", site: "Main", invoice: "INV-NEW" })] as any);
    vi.mocked(db.query.items.findFirst).mockResolvedValue({ id: "item", bibliographyId: bib.id, site: null, invoice: "INV-OLD" } as any);
    await service.validateBatch("batch");
    expect(rowWrite().status).toBe("invalid");
    expect(rowWrite().resolvedData._detailPatch).toEqual({ site: "Main" });
    expect(errors[0].errors).toContain("existing item detail conflicts: invoice");
  });

  it("enriches previewed empty fields once while preserving operational fields", async () => {
    const existing = { id: "item", bibliographyId: bib.id, site: null, status: "loaned", qrToken: "keep" };
    const input = row({ item_code: "CODE", title: "Title A", site: "Main" });
    input.resolvedData = { ...input.resolvedData, _detailPatch: { site: "Main" } } as any;
    vi.mocked(db.query.importItemRows.findMany).mockResolvedValue([input] as any);
    vi.mocked(db.query.items.findFirst).mockResolvedValue(existing as any);
    (db as any).execute = vi.fn();
    const result = await service.approveBatch("batch", "user");
    expect(writes.find(w => w.table === items)?.data).toEqual({ site: "Main" });
    expect(result.committed).toBe(1);
    expect(rowWrite().status).toBe("committed");
    writes = [];
    vi.mocked(db.query.items.findFirst).mockResolvedValue({ ...existing, site: "Main" } as any);
    const repeat = await service.approveBatch("batch", "user");
    expect(writes.filter(w => w.table === items)).toHaveLength(0);
    expect(repeat.duplicate).toBe(1);
  });

  it("does not revalidate committed batches", async () => {
    vi.mocked(db.query.importBatches.findFirst).mockResolvedValue({ type: "item", status: "committed" } as any);
    await expect(service.validateBatch("batch")).rejects.toThrow("committed");
    expect(writes).toHaveLength(0);
  });

  it("rejects conflicting reference code mappings", async () => {
    vi.mocked(db.query.importBatches.findFirst).mockResolvedValue({ id: "batch", type: "item", status: "preview", referenceBatchId: "ref" } as any);
    vi.mocked(db.query.importBibliographyItemCodes.findMany).mockResolvedValue([{ itemCode: "CODE", committedBibliographyId: "bib-a" }, { itemCode: "CODE", committedBibliographyId: "bib-b" }] as any);
    vi.mocked(db.query.importItemRows.findMany).mockResolvedValue([row({ item_code: "CODE", title: "Title A" })] as any);
    const result = await service.validateBatch("batch");
    expect(result.invalidRows).toBe(1);
    expect(errors[0].errors).toContain("conflicting reference item_code mappings: CODE");
  });

  it("terminates approval failures without overwriting another bibliography", async () => {
    vi.mocked(db.query.importItemRows.findMany).mockResolvedValue([row({ item_code: "CODE" })] as any);
    vi.mocked(db.query.items.findFirst).mockResolvedValue({ id: "item", bibliographyId: "bib-b" } as any);
    (db as any).execute = vi.fn();
    const result = await service.approveBatch("batch", "user");
    expect(result.failed).toBe(1);
    expect(rowWrite().status).toBe("invalid");
    expect(writes.filter(w => w.table === items)).toHaveLength(0);
    expect(errors).toHaveLength(1);
  });

  it("rejects an item reference that is not a committed bibliography batch", async () => {
    vi.mocked(db.query.importBatches.findFirst).mockResolvedValue({ type: "item", status: "committed" } as any);
    await expect(service.createBatch("item", "items.csv", "user", "csv", "00000000-0000-4000-8000-000000000001")).rejects.toThrow("committed bibliography");
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("rejects malformed referenceBatchId before database access", async () => {
    await expect(service.createBatch("item", "items.csv", "user", "csv", "bad-id")).rejects.toThrow("UUID");
    expect(db.query.importBatches.findFirst).not.toHaveBeenCalled();
  });

  it("keeps both conflicting code claims invalid with row evidence", async () => {
    vi.mocked(db.query.importItemRows.findMany).mockResolvedValue([row({ item_code: "S250197401", title: "Title A" }), row({ item_code: "S250197401", title: "Title B" }, 2)] as any);
    const result = await service.validateBatch("batch");
    expect(result.invalidRows).toBe(2);
    expect(errors).toHaveLength(2);
    expect(errors[0]).toMatchObject({ rowNumber: 1, rawData: { item_code: "S250197401", title: "Title A" }, errors: [expect.stringContaining("conflicting")] });
    expect(rowWrite().resolvedData._errors).toEqual(errors[0].errors);
  });
});
