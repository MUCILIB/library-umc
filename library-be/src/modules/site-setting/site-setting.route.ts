import { Router } from "express";
import multer from "multer";
import { SiteSettingController } from "./controller/site-setting.controller";
import { isAuthenticated, requirePermission } from "../../middlewares/auth.middleware";

const router = Router();

const cmsUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (_req, file, cb) => {
    const isImage =
      file.mimetype.startsWith("image/") ||
      file.mimetype === "image/x-icon" ||
      file.mimetype === "image/vnd.microsoft.icon";
    if (isImage) {
      cb(null, true);
    } else {
      cb(new Error("Hanya file gambar (JPG, PNG, WebP, SVG, ICO) yang diperbolehkan"));
    }
  },
});

// Public: Stream / ambil asset gambar CMS yang diunggah
router.get("/site-settings/assets/:filename", (req, res, next) =>
  SiteSettingController.getAsset(req, res, next)
);

// Terproteksi: Upload asset gambar CMS (Logo, Favicon, Hero Background) ke S3
router.post(
  "/site-settings/upload-asset",
  isAuthenticated,
  requirePermission("cms", "edit"),
  cmsUpload.single("file"),
  (req, res, next) => SiteSettingController.uploadAsset(req, res, next)
);

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
