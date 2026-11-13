import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import bookmarkController from "../controller/bookmark.controller";
import bookmarkService from "../service/bookmark.service";

const app = express();
app.use(express.json());

// Mock endpoints with simulated user session
app.get("/bookmarks", (req, res, next) => {
  (req as any).user = { id: "user-123" };
  bookmarkController.getMyBookmarks(req, res, next);
});

app.get("/bookmarks/unauth", (req, res, next) => {
  (req as any).user = undefined;
  bookmarkController.getMyBookmarks(req, res, next);
});

app.get("/bookmarks/check/:bibliographyId", (req, res, next) => {
  (req as any).user = { id: "user-123" };
  bookmarkController.checkBookmark(req, res, next);
});

app.post("/bookmarks/toggle/:bibliographyId", (req, res, next) => {
  (req as any).user = { id: "user-123" };
  bookmarkController.toggleBookmark(req, res, next);
});

app.post("/bookmarks/sync", (req, res, next) => {
  (req as any).user = { id: "user-123" };
  bookmarkController.syncBookmarks(req, res, next);
});

describe("BookmarkController Unit Tests", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET /bookmarks", () => {
    it("should return 401 if not authenticated", async () => {
      const res = await request(app).get("/bookmarks/unauth");
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("should return array of IDs when authenticated", async () => {
      vi.spyOn(bookmarkService, "getSavedBookIds").mockResolvedValueOnce(["book-1", "book-2"]);

      const res = await request(app).get("/bookmarks");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(["book-1", "book-2"]);
    });

    it("should return full book objects when ?full=true", async () => {
      const mockBooks = [{ id: "book-1", title: "Clean Code" }] as any;
      vi.spyOn(bookmarkService, "getSavedBooks").mockResolvedValueOnce(mockBooks);

      const res = await request(app).get("/bookmarks?full=true");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(mockBooks);
    });
  });

  describe("GET /bookmarks/check/:bibliographyId", () => {
    it("should return isSaved status true if bookmarked", async () => {
      vi.spyOn(bookmarkService, "isBookSaved").mockResolvedValueOnce(true);

      const res = await request(app).get("/bookmarks/check/bib-1");
      expect(res.status).toBe(200);
      expect(res.body.data.isSaved).toBe(true);
    });
  });

  describe("POST /bookmarks/toggle/:bibliographyId", () => {
    it("should toggle bookmark status successfully", async () => {
      vi.spyOn(bookmarkService, "toggleBook").mockResolvedValueOnce({ saved: true });

      const res = await request(app).post("/bookmarks/toggle/bib-1");
      expect(res.status).toBe(200);
      expect(res.body.data.saved).toBe(true);
      expect(res.body.message).toBe("Buku berhasil disimpan");
    });
  });

  describe("POST /bookmarks/sync", () => {
    it("should sync offline bookmark IDs to database", async () => {
      vi.spyOn(bookmarkService, "syncBookmarks").mockResolvedValueOnce(["bib-1", "bib-2"]);

      const res = await request(app).post("/bookmarks/sync").send({
        bibliographyIds: ["bib-1", "bib-2"],
      });

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual(["bib-1", "bib-2"]);
    });
  });
});
