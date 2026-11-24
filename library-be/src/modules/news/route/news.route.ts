import { Router } from "express";
import multer from "multer";
import { NewsController } from "../controller/news.controller";
import {
  isAuthenticated,
  requirePermission,
} from "../../../middlewares/auth.middleware";

const router = Router();

const newsUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (_req, file, cb) => {
    const isImage = file.mimetype.startsWith("image/");
    if (isImage) {
      cb(null, true);
    } else {
      cb(new Error("Hanya file gambar (JPG, PNG, WebP, SVG) yang diperbolehkan"));
    }
  },
});

// ==========================================
// RUTE PUBLIK
// ==========================================

// Streaming / ambil aset gambar cover atau artikel dari S3
router.get("/news/assets/:filename", (req, res, next) =>
  NewsController.getAsset(req, res, next)
);

// Ambil beberapa berita terbaru (Landing Page)
router.get("/news/recent", (req, res, next) =>
  NewsController.getRecent(req, res, next)
);

// Ambil ringkasan statistik dan analitik traffic berita (CMS Admin)
router.get(
  "/news/stats/summary",
  isAuthenticated,
  requirePermission(["news", "cms"], "view"),
  (req, res, next) => NewsController.getStats(req, res, next)
);

// Ambil daftar artikel berita (publik melihat status 'published', admin melihat sesuai query)
router.get("/news", (req, res, next) =>
  NewsController.getAll(req, res, next)
);

// Ambil detail artikel berita berdasarkan slug
router.get("/news/:slug", (req, res, next) =>
  NewsController.getBySlug(req, res, next)
);

// ==========================================
// RUTE TERPROTEKSI (CMS ADMIN / PUSTAKAWAN)
// ==========================================

// Ambil data artikel berita berdasarkan ID untuk diedit
router.get(
  "/news/id/:id",
  isAuthenticated,
  requirePermission(["news", "cms"], "view"),
  (req, res, next) => NewsController.getById(req, res, next)
);

// Upload gambar cover atau inline artikel ke S3
router.post(
  "/news/upload",
  isAuthenticated,
  requirePermission(["news", "cms"], "edit"),
  newsUpload.single("file"),
  (req, res, next) => NewsController.uploadImage(req, res, next)
);

// Buat artikel berita baru
router.post(
  "/news",
  isAuthenticated,
  requirePermission(["news", "cms"], "add"),
  (req, res, next) => NewsController.create(req, res, next)
);

// Perbarui artikel berita
router.put(
  "/news/:id",
  isAuthenticated,
  requirePermission(["news", "cms"], "edit"),
  (req, res, next) => NewsController.update(req, res, next)
);

// Hapus artikel berita
router.delete(
  "/news/:id",
  isAuthenticated,
  requirePermission(["news", "cms"], "delete"),
  (req, res, next) => NewsController.delete(req, res, next)
);

export const newsRoutes = router;
