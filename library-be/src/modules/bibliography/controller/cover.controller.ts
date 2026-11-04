import { type Request, type Response, type NextFunction } from "express";
import path from "path";
import crypto from "crypto";
import { coverStorageService } from "../../repository/service/storage.service";
import { sendSuccess, sendError } from "../../../utils/api-utils";

export class CoverController {
  async upload(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return sendError(res, "Berkas gambar sampul wajib diunggah", 400);
      }

      const originalExt = path.extname(req.file.originalname).toLowerCase();
      const safeExt = [".jpg", ".jpeg", ".png", ".webp"].includes(originalExt)
        ? originalExt
        : ".jpg";

      const filename = `cover-${Date.now()}-${crypto.randomBytes(4).toString("hex")}${safeExt}`;
      const s3Key = await coverStorageService.save(
        filename,
        req.file.buffer,
        req.file.mimetype || "image/jpeg"
      );

      return sendSuccess(res, "Gambar sampul berhasil diunggah", {
        url: `/api/covers/${filename}`,
        key: s3Key,
        filename,
      }, 201);
    } catch (error) {
      next(error);
    }
  }

  async getCover(req: Request, res: Response, next: NextFunction) {
    try {
      const rawParam = req.params.filename as string;
      const filename = path.basename(rawParam);

      if (!filename || filename === "." || filename.includes("..")) {
        return sendError(res, "Nama berkas gambar tidak valid", 400);
      }

      let buffer: Buffer | null = null;
      try {
        buffer = await coverStorageService.read(`library/covers/${filename}`);
      } catch {
        // Fallback jika disimpan dengan path langsung
        try {
          buffer = await coverStorageService.read(filename);
        } catch {
          buffer = null;
        }
      }

      if (!buffer) {
        return sendError(res, "Gambar sampul tidak ditemukan di penyimpanan server", 404);
      }

      const ext = path.extname(filename).toLowerCase();
      let contentType = "image/jpeg";
      if (ext === ".png") contentType = "image/png";
      else if (ext === ".webp") contentType = "image/webp";
      else if (ext === ".svg") contentType = "image/svg+xml";
      else if (ext === ".gif") contentType = "image/gif";

      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
      res.setHeader("Content-Length", buffer.length);
      return res.end(buffer);
    } catch (error) {
      next(error);
    }
  }
}

export const coverController = new CoverController();
