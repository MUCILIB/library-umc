import { Router } from "express";
import multer from "multer";
import { ebookController } from "../controller/ebook.controller";
import { isAuthenticated, requireRole } from "../../../middlewares/auth.middleware";
import { publicApiLimiter } from "../../../middlewares/rateLimiter";

const router = Router();

// Upload middleware in memory untuk validasi dan komputasi binary PDF sebelum dikirim ke S3
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024 // 100 MB max limit untuk e-book
  },
  fileFilter: (_req, file, cb) => {
    if (
      file.mimetype === "application/pdf" ||
      file.originalname.toLowerCase().endsWith(".pdf")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Hanya berkas format PDF yang diperbolehkan"));
    }
  }
});

// Admin CRUD E-Book
router.post(
  ["/ebooks", "/api/ebooks"],
  publicApiLimiter,
  isAuthenticated,
  requireRole(["super_admin", "admin", "staff"]),
  upload.single("file"),
  (req, res, next) => ebookController.create(req, res, next)
);

router.get(
  ["/ebooks", "/api/ebooks"],
  publicApiLimiter,
  (req, res, next) => ebookController.getAll(req, res, next)
);

router.get(
  ["/ebooks/:id", "/api/ebooks/:id"],
  publicApiLimiter,
  (req, res, next) => ebookController.getById(req, res, next)
);

router.put(
  ["/ebooks/:id", "/api/ebooks/:id"],
  publicApiLimiter,
  isAuthenticated,
  requireRole(["super_admin", "admin", "staff"]),
  upload.single("file"),
  (req, res, next) => ebookController.update(req, res, next)
);

router.delete(
  ["/ebooks/:id", "/api/ebooks/:id"],
  publicApiLimiter,
  isAuthenticated,
  requireRole(["super_admin", "admin", "staff"]),
  (req, res, next) => ebookController.delete(req, res, next)
);

// Streaming / Viewing E-Book PDF dengan slicing & ACL
router.get(
  [
    "/ebooks/:id/stream",
    "/api/ebooks/:id/stream",
    "/ebooks/:id/stream-pdf",
    "/api/ebooks/:id/stream-pdf"
  ],
  publicApiLimiter,
  (req, res, next) => ebookController.streamPdf(req, res, next)
);

export const ebookRoutes = router;
export default ebookRoutes;
