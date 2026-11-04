import { Router } from "express";
import multer from "multer";
import { bibliographyController } from "../controller/bibliography.controller";
import { coverController } from "../controller/cover.controller";
import { isAuthenticated, requireRole } from "../../../middlewares/auth.middleware";
import { publicApiLimiter } from "../../../middlewares/rateLimiter";

const router = Router();

const coverUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Hanya file gambar (JPG, PNG, WebP) yang diperbolehkan"));
    }
  },
});

// Upload cover gambar sampul ke S3 Dahono
router.post(
  ["/upload/cover", "/bibliographies/upload-cover"],
  publicApiLimiter,
  isAuthenticated,
  requireRole(["super_admin", "staff"]),
  coverUpload.single("file"),
  (req, res, next) => coverController.upload(req, res, next)
);

// Streaming gambar cover dari S3 Dahono
router.get(
  ["/covers/:filename", "/api/covers/:filename"],
  publicApiLimiter,
  (req, res, next) => coverController.getCover(req, res, next)
);

router.get("/bibliographies/check-duplicate", publicApiLimiter, (req, res, next) => bibliographyController.checkDuplicate(req, res, next));
router.get("/bibliographies", publicApiLimiter, (req, res, next) => bibliographyController.list(req, res, next));
router.get("/bibliographies/:id", publicApiLimiter, (req, res, next) => bibliographyController.getById(req, res, next));
router.get("/bibliographies/:id/items", publicApiLimiter, (req, res, next) => bibliographyController.getItems(req, res, next));
router.post("/bibliographies", publicApiLimiter, isAuthenticated, requireRole(["super_admin", "staff"]), (req, res, next) => bibliographyController.create(req, res, next));
router.patch("/bibliographies/:id", publicApiLimiter, isAuthenticated, requireRole(["super_admin", "staff"]), (req, res, next) => bibliographyController.update(req, res, next));
router.delete("/bibliographies/:id", publicApiLimiter, isAuthenticated, requireRole(["super_admin"]), (req, res, next) => bibliographyController.softDelete(req, res, next));

export default router;
