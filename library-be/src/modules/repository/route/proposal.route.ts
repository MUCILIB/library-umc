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

// Helper agar endpoint terdaftar di kedua path (dengan dan tanpa alias /api)
// Mengembalikan router agar routes modular
router.post(
  ["/repository/proposals", "/api/repository/proposals"],
  publicApiLimiter,
  isAuthenticated,
  upload.single("file"),
  (req, res, next) => proposalController.create(req, res, next)
);

router.get(
  ["/repository/published", "/api/repository/published", "/repository/public", "/api/repository/public"],
  publicApiLimiter,
  (req, res, next) => proposalController.getPublished(req, res, next)
);

router.get(
  ["/repository/proposals", "/api/repository/proposals"],
  publicApiLimiter,
  isAuthenticated,
  (req, res, next) => proposalController.getAll(req, res, next)
);

router.get(
  ["/repository/proposals/:id", "/api/repository/proposals/:id"],
  publicApiLimiter,
  (req, res, next) => proposalController.getById(req, res, next)
);

router.patch(
  ["/repository/proposals/:id/review", "/api/repository/proposals/:id/review"],
  publicApiLimiter,
  isAuthenticated,
  requireRole(["super_admin", "admin", "staff"]),
  (req, res, next) => proposalController.review(req, res, next)
);

router.post(
  ["/repository/proposals/:id/page-rules", "/api/repository/proposals/:id/page-rules"],
  publicApiLimiter,
  isAuthenticated,
  requireRole(["super_admin", "admin", "staff"]),
  (req, res, next) => proposalController.configurePageRule(req, res, next)
);

router.get(
  ["/repository/proposals/:id/view-pdf", "/api/repository/proposals/:id/view-pdf"],
  publicApiLimiter,
  (req, res, next) => proposalController.viewPdf(req, res, next)
);

router.put(
  ["/repository/proposals/:id", "/api/repository/proposals/:id"],
  publicApiLimiter,
  isAuthenticated,
  upload.single("file"),
  (req, res, next) => proposalController.update(req, res, next)
);

router.delete(
  ["/repository/proposals/:id", "/api/repository/proposals/:id"],
  publicApiLimiter,
  isAuthenticated,
  (req, res, next) => proposalController.delete(req, res, next)
);

/**
 * @swagger
 * tags:
 *   name: Digital Repository
 *   description: Endpoints for student thesis/proposal repository and page-level PDF ACL
 */

/**
 * @swagger
 * /api/repository/proposals:
 *   post:
 *     summary: Submit a new proposal or thesis document (Mahasiswa)
 *     tags: [Digital Repository]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - advisorName1
 *               - studyProgramId
 *               - documentCategory
 *               - file
 *             properties:
 *               title:
 *                 type: string
 *                 example: Analisis Sentimen Opini Publik Menggunakan BERT
 *               abstract:
 *                 type: string
 *                 example: Ringkasan naskah penelitian...
 *               advisorName1:
 *                 type: string
 *                 example: Dr. Budi Santoso, M.Kom
 *               advisorName2:
 *                 type: string
 *                 example: Ahmad Dani, M.T
 *               studyProgramId:
 *                 type: integer
 *                 example: 1
 *               documentCategory:
 *                 type: string
 *                 enum: [PROPOSAL, THESIS, REPORT]
 *                 example: PROPOSAL
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Proposal successfully submitted
 *       400:
 *         description: Validation error or duplicate file content
 *       401:
 *         description: Unauthorized
 */
export const repositoryRoutes = router;

