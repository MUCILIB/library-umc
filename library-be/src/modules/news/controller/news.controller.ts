import { Request, Response, NextFunction } from "express";
import path from "path";
import crypto from "crypto";
import { NewsService } from "../service/news.service";
import {
  createNewsSchema,
  updateNewsSchema,
  queryNewsSchema,
} from "../news.validation";
import { newsStorageService } from "../../repository/service/storage.service";
import { sendSuccess, sendError } from "../../../utils/api-utils";

export class NewsController {
  /**
   * Mengambil daftar berita dengan pagination, pencarian, dan filter
   */
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = queryNewsSchema.safeParse(req.query);
      if (!parsed.success) {
        return sendError(
          res,
          parsed.error.errors[0]?.message || "Parameter tidak valid",
          400
        );
      }

      const query = parsed.data;

      // Jika bukan admin/staff, paksa status hanya 'published'
      const user = (req as any).user;
      const isAdminOrStaff =
        user?.role === "super_admin" || user?.role === "staff";
      if (!isAdminOrStaff && query.status !== "published") {
        query.status = "published";
      }

      const result = await NewsService.listNews(query);
      return sendSuccess(res, "Daftar berita berhasil diambil", result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mengambil beberapa berita terbaru yang sudah terbit (Landing Page)
   */
  static async getRecent(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = Number(req.query.limit) || 4;
      const data = await NewsService.getRecentNews(limit);
      return sendSuccess(res, "Berita terbaru berhasil diambil", data);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mengambil detail artikel berdasarkan slug (publik)
   */
  static async getBySlug(req: Request, res: Response, next: NextFunction) {
    try {
      const slug = req.params.slug as string;
      if (!slug) {
        return sendError(res, "Slug berita tidak valid", 400);
      }

      const user = (req as any).user;
      const isAdminOrStaff =
        user?.role === "super_admin" || user?.role === "staff";

      // Increment views jika diakses publik
      const item = await NewsService.getNewsBySlug(slug, !isAdminOrStaff);

      if (!item) {
        return sendError(res, "Artikel berita tidak ditemukan", 404);
      }

      // Jika artikel masih draft dan pengakses bukan admin, sembunyikan
      if (item.status !== "published" && !isAdminOrStaff) {
        return sendError(res, "Artikel berita belum dipublikasikan", 404);
      }

      return sendSuccess(res, "Detail berita berhasil diambil", item);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mengambil artikel berdasarkan ID (CMS Admin)
   */
  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      if (!id) {
        return sendError(res, "ID berita tidak valid", 400);
      }

      const item = await NewsService.getNewsById(id);
      if (!item) {
        return sendError(res, "Artikel berita tidak ditemukan", 404);
      }

      return sendSuccess(res, "Detail berita berhasil diambil", item);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Membuat artikel berita baru (CMS Admin)
   */
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = createNewsSchema.safeParse(req.body);
      if (!parsed.success) {
        return sendError(
          res,
          parsed.error.errors[0]?.message || "Data input berita tidak valid",
          400
        );
      }

      const user = (req as any).user;
      const created = await NewsService.createNews(parsed.data, user?.id);

      return sendSuccess(res, "Artikel berita berhasil dibuat", created, 201);
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Memperbarui artikel berita (CMS Admin)
   */
  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      if (!id) {
        return sendError(res, "ID berita tidak valid", 400);
      }

      const parsed = updateNewsSchema.safeParse(req.body);
      if (!parsed.success) {
        return sendError(
          res,
          parsed.error.errors[0]?.message || "Data input berita tidak valid",
          400
        );
      }

      const updated = await NewsService.updateNews(id, parsed.data);
      return sendSuccess(res, "Artikel berita berhasil diperbarui", updated);
    } catch (error: any) {
      if (error?.message === "Berita tidak ditemukan") {
        return sendError(res, error.message, 404);
      }
      next(error);
    }
  }

  /**
   * Menghapus artikel berita (CMS Admin)
   */
  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      if (!id) {
        return sendError(res, "ID berita tidak valid", 400);
      }

      await NewsService.deleteNews(id);
      return sendSuccess(res, "Artikel berita berhasil dihapus", { id });
    } catch (error: any) {
      if (error?.message === "Berita tidak ditemukan") {
        return sendError(res, error.message, 404);
      }
      next(error);
    }
  }

  /**
   * Mengunggah berkas cover / gambar artikel ke S3
   */
  static async uploadImage(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return sendError(res, "Berkas gambar wajib diunggah", 400);
      }

      const originalExt = path.extname(req.file.originalname).toLowerCase();
      const safeExt = [".jpg", ".jpeg", ".png", ".webp", ".svg"].includes(
        originalExt
      )
        ? originalExt
        : ".png";

      const filename = `news-${Date.now()}-${crypto
        .randomBytes(4)
        .toString("hex")}${safeExt}`;

      const s3Key = await newsStorageService.save(
        filename,
        req.file.buffer,
        req.file.mimetype || "image/png"
      );

      return sendSuccess(
        res,
        "Berkas gambar berita berhasil diunggah ke S3",
        {
          url: `/api/news/assets/${filename}`,
          key: s3Key,
          filename,
        },
        201
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Menampilkan / streaming gambar dari S3 storage
   */
  static async getAsset(req: Request, res: Response, next: NextFunction) {
    try {
      const rawParam = req.params.filename as string;

      if (
        !rawParam ||
        rawParam.includes("..") ||
        rawParam.includes("/") ||
        rawParam.includes("\\")
      ) {
        return sendError(res, "Nama berkas gambar tidak valid", 400);
      }

      const filename = path.basename(rawParam);
      if (!filename || filename === ".") {
        return sendError(res, "Nama berkas gambar tidak valid", 400);
      }

      let buffer: Buffer | null = null;
      try {
        buffer = await newsStorageService.read(`library/news/${filename}`);
      } catch {
        try {
          buffer = await newsStorageService.read(filename);
        } catch {
          buffer = null;
        }
      }

      if (!buffer) {
        return sendError(
          res,
          "Berkas gambar tidak ditemukan di penyimpanan server",
          404
        );
      }

      const ext = path.extname(filename).toLowerCase();
      const mimeMap: Record<string, string> = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
        ".svg": "image/svg+xml",
      };

      const contentType = mimeMap[ext] || "application/octet-stream";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=86400, immutable");
      return res.status(200).send(buffer);
    } catch (error) {
      next(error);
    }
  }
}
