import { Router } from "express";
import multer from "multer";
import { proposalController } from "../controller/proposal.controller";
import { isAuthenticated, requireRole } from "../../../middlewares/auth.middleware";
import { publicApiLimiter } from "../../../middlewares/rateLimiter";

const router = Router();

// Upload middleware in memory untuk validasi binary magic bytes sebelum simpan ke disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024 // 25 MB max limit
  }
});

// Mahasiswa submit proposal
router.post(
  "/repository/proposals",
  publicApiLimiter,
  isAuthenticated,
  upload.single("file"),
  (req, res, next) => proposalController.create(req, res, next)
);

// Get list proposals (Admin: all, Student: mine)
router.get(
  "/repository/proposals",
  publicApiLimiter,
  isAuthenticated,
  (req, res, next) => proposalController.getAll(req, res, next)
);

// Get detail proposal
router.get(
  "/repository/proposals/:id",
  publicApiLimiter,
  isAuthenticated,
  (req, res, next) => proposalController.getById(req, res, next)
);

// Review proposal (Pustakawan / Staff / Super Admin)
router.patch(
  "/repository/proposals/:id/review",
  publicApiLimiter,
  isAuthenticated,
  requireRole(["super_admin", "staff"]),
  (req, res, next) => proposalController.review(req, res, next)
);

// Konfigurasi batas halaman (Super Admin / Staff)
router.post(
  "/repository/proposals/:id/page-rules",
  publicApiLimiter,
  isAuthenticated,
  requireRole(["super_admin", "staff"]),
  (req, res, next) => proposalController.configurePageRule(req, res, next)
);

// Stream PDF preview terpotong secara dinamis (Publik & Mahasiswa)
router.get(
  "/repository/proposals/:id/view-pdf",
  publicApiLimiter,
  (req, res, next) => proposalController.viewPdf(req, res, next)
);

export const repositoryRoutes = router;
