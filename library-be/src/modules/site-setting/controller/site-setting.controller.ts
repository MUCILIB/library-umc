import { Request, Response, NextFunction } from "express";
import { SiteSettingService } from "../service/site-setting.service";
import { VALID_SETTING_KEYS, type ValidSettingKey } from "../site-setting.constants";

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
}
