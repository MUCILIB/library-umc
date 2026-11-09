import { Router } from "express";
import { SiteSettingController } from "./controller/site-setting.controller";
import { isAuthenticated, requirePermission } from "../../middlewares/auth.middleware";

const router = Router();

// Public: Ambil seluruh konfigurasi site settings (dengan caching & fallback)
router.get("/site-settings", (req, res, next) =>
  SiteSettingController.getAllSettings(req, res, next)
);

// Public: Ambil satu konfigurasi spesifik
router.get("/site-settings/:key", (req, res, next) =>
  SiteSettingController.getSettingByKey(req, res, next)
);

// Terproteksi: Update konfigurasi site settings berdasarkan kunci
router.put(
  "/site-settings/:key",
  isAuthenticated,
  requirePermission("cms", "edit"),
  (req, res, next) => SiteSettingController.updateSetting(req, res, next)
);

export const siteSettingRoutes = router;
export default siteSettingRoutes;
