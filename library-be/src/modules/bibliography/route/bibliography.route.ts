import { Router } from "express";
import multer from "multer";
import { bibliographyController } from "../controller/bibliography.controller";
import { coverController } from "../controller/cover.controller";
import { itemController } from "../../item/controller/item.controller";
import {
  isAuthenticated,
  requireRole,
  requirePermission,
} from "../../../middlewares/auth.middleware";
import { publicApiLimiter } from "../../../middlewares/rateLimiter";
import { sendError } from "../../../utils/api-utils";

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

router.get("/bibliographies/check-duplicate", publicApiLimiter, isAuthenticated, requirePermission("bibliographies", "view"), (req, res, next) => bibliographyController.checkDuplicate(req, res, next));
router.get("/bibliographies", publicApiLimiter, isAuthenticated, requirePermission("bibliographies", "view"), (req, res, next) => bibliographyController.list(req, res, next));
router.post("/bibliographies/deduplicate", publicApiLimiter, isAuthenticated, requireRole(["super_admin"]), (req, res, next) => bibliographyController.deduplicate(req, res, next));
router.get("/bibliographies/:id", publicApiLimiter, (req, res, next) => bibliographyController.getById(req, res, next));
router.get("/bibliographies/:id/items", publicApiLimiter, (req, res, next) => bibliographyController.getItems(req, res, next));
router.post("/bibliographies/:bibliographyId/items/standardize", publicApiLimiter, isAuthenticated, requireRole(["super_admin", "staff"]), (req, res, next) => itemController.standardize(req, res, next));
router.post("/bibliographies", publicApiLimiter, isAuthenticated, requirePermission("bibliographies", "add"), (req, res, next) => bibliographyController.create(req, res, next));
router.patch("/bibliographies", publicApiLimiter, isAuthenticated, requirePermission("bibliographies", "edit"), (req, res) => sendError(res, "ID bibliografi diperlukan", 400));
router.patch("/bibliographies/:id", publicApiLimiter, isAuthenticated, requirePermission("bibliographies", "edit"), (req, res, next) => bibliographyController.update(req, res, next));
router.delete("/bibliographies", publicApiLimiter, isAuthenticated, requirePermission("bibliographies", "delete"), (req, res) => sendError(res, "ID bibliografi diperlukan", 400));
router.delete("/bibliographies/:id", publicApiLimiter, isAuthenticated, requirePermission("bibliographies", "delete"), (req, res, next) => bibliographyController.softDelete(req, res, next));

export default router;
