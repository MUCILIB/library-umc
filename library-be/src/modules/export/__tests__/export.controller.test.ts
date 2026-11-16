import { beforeEach, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
vi.mock("../service/export.service", () => ({ exportService: { exportBibliographies: vi.fn().mockResolvedValue("CSV"), exportItems: vi.fn().mockResolvedValue("CSV") } }));
import { exportService } from "../service/export.service";
import { exportController } from "../controller/export.controller";
const app = express();
app.get("/bibliographies", exportController.exportBibliographies);
app.get("/items", exportController.exportItems);
app.use((error: { statusCode?: number; message: string }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
 res.status(error.statusCode || 500).json({ message: error.message });
});
beforeEach(() => vi.clearAllMocks());
it.each(["bibliographies", "items"])("passes SLiMS format and delimiter for %s", async (type) => {
 const res = await request(app).get(`/${type}?format=slims&delimiter=%2C`);
 expect(res.status).toBe(200);
 expect(res.text).toBe("CSV");
 expect(type === "items" ? exportService.exportItems : exportService.exportBibliographies).toHaveBeenCalledWith(expect.objectContaining({ format: "slims", delimiter: "," }));
});
it.each(["invalid", "slims&format=library", "", "slims%20"])("rejects invalid format %s", async (format) => {
 const res = await request(app).get(`/bibliographies?format=${format}`);
 expect(res.status).toBe(400);
 expect(exportService.exportBibliographies).not.toHaveBeenCalled();
});
it("preserves default Library format", async () => {
 expect((await request(app).get("/bibliographies")).status).toBe(200);
 expect(exportService.exportBibliographies).toHaveBeenCalledWith(expect.objectContaining({ format: "library" }));
});
