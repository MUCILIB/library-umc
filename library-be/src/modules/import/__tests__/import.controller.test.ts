import { describe, expect, it, vi } from "vitest";
vi.mock("../service/import.service", () => ({ importService: { createBatch: vi.fn().mockResolvedValue({ id: "batch", filename: "items.csv" }), getPairCompleteness: vi.fn().mockResolvedValue({ totalExpected: 2, covered: 1, missing: [], extra: [] }) } }));
import { importService } from "../service/import.service";
import { ImportController } from "../controller/import.controller";

describe("item upload reference batch", () => {
  it("passes the optional referenceBatchId to the service", async () => {
    const referenceBatchId = "00000000-0000-4000-8000-000000000001";
    const req = { file: { buffer: Buffer.from("csv"), originalname: "items.csv" }, user: { id: "user" }, body: { referenceBatchId } };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    await new ImportController().uploadItem(req as any, res, vi.fn());
    expect(importService.createBatch).toHaveBeenCalledWith("item", "items.csv", "user", "csv", referenceBatchId);
  });
});

describe("pair completeness", () => {
  it("returns 404 for a malformed batch id without touching the service", async () => {
    const req = { params: { batchId: "bad-id" } };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    await new ImportController().getPairCompleteness(req as any, res, vi.fn());
    expect(importService.getPairCompleteness).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("delegates to the service and returns the report", async () => {
    const batchId = "00000000-0000-4000-8000-000000000001";
    const req = { params: { batchId } };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    await new ImportController().getPairCompleteness(req as any, res, vi.fn());
    expect(importService.getPairCompleteness).toHaveBeenCalledWith(batchId);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});
