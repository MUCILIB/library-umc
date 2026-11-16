import { describe, expect, it, vi } from "vitest";
vi.mock("../service/import.service", () => ({ importService: { createBatch: vi.fn().mockResolvedValue({ id: "batch", filename: "items.csv" }) } }));
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
