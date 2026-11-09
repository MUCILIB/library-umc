import { Request, Response, NextFunction } from "express";
import path from "path";
import crypto from "crypto";
import { SiteSettingService } from "../service/site-setting.service";
import { VALID_SETTING_KEYS, type ValidSettingKey } from "../site-setting.constants";
import { cmsStorageService } from "../../repository/service/storage.service";
import { sendSuccess, sendError } from "../../../utils/api-utils";

export class SiteSettingController {
  static async getAllSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await SiteSettingService.getAllSettings();
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSettingByKey(req: Request, res: Response, next: NextFunction) {
    try {
      const keyParam = req.params.key;
      const key = Array.isArray(keyParam) ? keyParam[0] : keyParam;
      const data = await SiteSettingService.getSettingByKey(key);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateSetting(req: Request, res: Response, next: NextFunction) {
    try {
      const keyParam = req.params.key;
      const key = Array.isArray(keyParam) ? keyParam[0] : keyParam;

      if (!VALID_SETTING_KEYS.includes(key as ValidSettingKey)) {
        res.status(400).json({
          success: false,
          message: `Key pengaturan '${key}' tidak dikenali. Kunci yang valid: ${VALID_SETTING_KEYS.join(", ")}`,
        });
        return;
      }

      // Payload bisa berupa { value: { ... } } atau langsung objek { ... }
      const payload = req.body?.value !== undefined ? req.body.value : req.body;
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        res.status(400).json({
          success: false,
          message: "Format payload pengaturan harus berupa objek JSON",
        });
        return;
      }

      const session = (req as any).user || (req as any).session?.user;
      const userId = session?.id || session?.userId;

      const updated = await SiteSettingService.updateSetting(key, payload, userId);

      res.status(200).json({
        success: true,
        message: `Pengaturan ${key} berhasil diperbarui`,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  static async uploadAsset(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return sendError(res, "Berkas gambar wajib diunggah", 400);
      }

      const originalExt = path.extname(req.file.originalname).toLowerCase();
      const safeExt = [".jpg", ".jpeg", ".png", ".webp", ".svg", ".ico"].includes(originalExt)
        ? originalExt
        : ".png";

      const filename = `cms-${Date.now()}-${crypto.randomBytes(4).toString("hex")}${safeExt}`;
      const s3Key = await cmsStorageService.save(
        filename,
        req.file.buffer,
        req.file.mimetype || "image/png"
      );

      return sendSuccess(
        res,
        "Berkas gambar berhasil diunggah ke S3",
        {
          url: `/api/site-settings/assets/${filename}`,
          key: s3Key,
          filename,
        },
        201
      );
    } catch (error) {
      next(error);
    }
  }

  static async getAsset(req: Request, res: Response, next: NextFunction) {
    try {
      const rawParam = req.params.filename as string;

      if (!rawParam || rawParam.includes("..") || rawParam.includes("/") || rawParam.includes("\\")) {
        return sendError(res, "Nama berkas gambar tidak valid", 400);
      }

      const filename = path.basename(rawParam);
      if (!filename || filename === ".") {
        return sendError(res, "Nama berkas gambar tidak valid", 400);
      }

      let buffer: Buffer | null = null;
      try {
        buffer = await cmsStorageService.read(`library/cms/${filename}`);
      } catch {
        try {
          buffer = await cmsStorageService.read(filename);
        } catch {
          buffer = null;
        }
      }

      if (!buffer) {
        return sendError(res, "Berkas gambar tidak ditemukan di penyimpanan server", 404);
      }

      const ext = path.extname(filename).toLowerCase();
      const mimeMap: Record<string, string> = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
        ".svg": "image/svg+xml",
        ".ico": "image/x-icon",
      };

      res.setHeader("Content-Type", mimeMap[ext] || "image/png");
      res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
      return res.status(200).send(buffer);
    } catch (error) {
      next(error);
    }
  }
}
