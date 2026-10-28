import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { EbookController } from "../controller/ebook.controller";
import { EbookService } from "../service/ebook.service";

const app = express();
app.use(express.json());

const controller = new EbookController();

app.get("/api/ebooks", (req, res, next) => controller.getAll(req, res, next));
app.get("/api/ebooks/:id", (req, res, next) => controller.getById(req, res, next));
app.post("/api/ebooks", (req, res, next) => {
  (req as any).user = { id: "admin-1", role: "super_admin" };
  controller.create(req, res, next);
});
app.put("/api/ebooks/:id", (req, res, next) => {
  (req as any).user = { id: "admin-1", role: "super_admin" };
  controller.update(req, res, next);
});
app.delete("/api/ebooks/:id", (req, res, next) => {
  (req as any).user = { id: "admin-1", role: "super_admin" };
  controller.delete(req, res, next);
});
app.get("/api/ebooks/:id/stream", (req, res, next) => controller.streamPdf(req, res, next));

describe("E-Book End-to-End API Controller Tests", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET /api/ebooks", () => {
    it("returns 200 with paginated e-book list", async () => {
      const mockResult = {
        data: [
          {
            id: "eb-1",
            title: "Pengantar Machine Learning",
            author: "Dr. Budi",
            publisher: "Informatika",
            isFullAccess: true,
          },
        ],
        meta: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      };

      vi.spyOn(EbookService.prototype, "getAll").mockResolvedValueOnce(mockResult as any);

      const res = await request(app).get("/api/ebooks?page=1&limit=10");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].title).toBe("Pengantar Machine Learning");
      expect(res.body.meta.total).toBe(1);
    });
  });

  describe("GET /api/ebooks/:id", () => {
    it("returns 200 with detail when e-book exists", async () => {
      const mockDetail = {
        id: "eb-1",
        title: "Sistem Informasi Manajemen",
        author: "Prof. Agus",
        content: {
          fileSize: 2048,
          pageCount: 150,
          isFullAccess: true,
        },
      };

      vi.spyOn(EbookService.prototype, "getById").mockResolvedValueOnce(mockDetail as any);

      const res = await request(app).get("/api/ebooks/eb-1");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe("Sistem Informasi Manajemen");
    });
  });

  describe("POST /api/ebooks", () => {
    it("returns 400 when title is missing", async () => {
      const res = await request(app)
        .post("/api/ebooks")
        .send({ publicationYear: "2024" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Validation Error");
    });

    it("returns 201 when metadata is valid", async () => {
      const mockCreated = {
        id: "eb-new",
        title: "Algoritma Pemrograman",
        author: "M. Irfan",
        pageCount: 88,
      };

      vi.spyOn(EbookService.prototype, "create").mockResolvedValueOnce(mockCreated as any);

      const res = await request(app)
        .post("/api/ebooks")
        .send({
          title: "Algoritma Pemrograman",
          author: "M. Irfan",
          publicationYear: "2024",
          isFullAccess: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe("Algoritma Pemrograman");
    });
  });

  describe("PUT /api/ebooks/:id", () => {
    it("returns 200 when updating e-book metadata", async () => {
      const mockUpdated = {
        id: "eb-1",
        title: "Pemrograman Web Modern (Revisi)",
      };

      vi.spyOn(EbookService.prototype, "update").mockResolvedValueOnce(mockUpdated as any);

      const res = await request(app)
        .put("/api/ebooks/eb-1")
        .send({ title: "Pemrograman Web Modern (Revisi)" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe("Pemrograman Web Modern (Revisi)");
    });
  });

  describe("DELETE /api/ebooks/:id", () => {
    it("returns 200 when deleting e-book", async () => {
      vi.spyOn(EbookService.prototype, "delete").mockResolvedValueOnce(true as any);

      const res = await request(app).delete("/api/ebooks/eb-1");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain("berhasil dihapus");
    });
  });

  describe("GET /api/ebooks/:id/stream", () => {
    it("streams PDF with correct headers", async () => {
      const mockStreamResult = {
        buffer: Buffer.from("%PDF-1.4 fake pdf data"),
        title: "Panduan Pemrograman",
        totalDocumentPages: 20,
        startPage: 1,
        endPage: 20,
        isRestricted: false,
        allowDownload: true,
      };

      vi.spyOn(EbookService.prototype, "getStreamPdf").mockResolvedValueOnce(mockStreamResult as any);

      const res = await request(app).get("/api/ebooks/eb-1/stream");

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toBe("application/pdf");
      expect(res.headers["content-disposition"]).toContain("inline");
      expect(res.headers["x-total-document-pages"]).toBe("20");
    });
  });
});
