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
router.post(
  "/repository/proposals",
  publicApiLimiter,
  isAuthenticated,
  upload.single("file"),
  (req, res, next) => proposalController.create(req, res, next)
);

/**
 * @swagger
 * /api/repository/proposals:
 *   get:
 *     summary: Get list of proposals (Librarian gets all, student gets own submissions)
 *     tags: [Digital Repository]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [SUBMITTED, UNDER_REVIEW, REVISION_REQUIRED, APPROVED, ARCHIVED]
 *         description: Filter by review status
 *       - in: query
 *         name: studyProgramId
 *         schema:
 *           type: integer
 *         description: Filter by study program ID
 *     responses:
 *       200:
 *         description: List of proposals retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/repository/proposals",
  publicApiLimiter,
  isAuthenticated,
  (req, res, next) => proposalController.getAll(req, res, next)
);

/**
 * @swagger
 * /api/repository/proposals/{id}:
 *   get:
 *     summary: Get detail of a proposal along with review history and page rules
 *     tags: [Digital Repository]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Proposal details
 *       404:
 *         description: Proposal not found
 */
router.get(
  "/repository/proposals/:id",
  publicApiLimiter,
  isAuthenticated,
  (req, res, next) => proposalController.getById(req, res, next)
);

/**
 * @swagger
 * /api/repository/proposals/{id}/review:
 *   patch:
 *     summary: Review and verify student proposal (Staff/Super Admin only)
 *     tags: [Digital Repository]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [APPROVE, REVISION_REQUIRED, UNDER_REVIEW]
 *                 example: APPROVE
 *               reviewNotes:
 *                 type: string
 *                 example: Berkas telah diverifikasi dan disetujui untuk dipublikasikan.
 *     responses:
 *       200:
 *         description: Proposal review updated successfully
 *       403:
 *         description: Forbidden - requires staff or super_admin role
 */
router.patch(
  "/repository/proposals/:id/review",
  publicApiLimiter,
  isAuthenticated,
  requireRole(["super_admin", "staff"]),
  (req, res, next) => proposalController.review(req, res, next)
);

/**
 * @swagger
 * /api/repository/proposals/{id}/page-rules:
 *   post:
 *     summary: Configure page-level PDF ACL for public preview (Staff/Super Admin only)
 *     tags: [Digital Repository]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - allowedStartPage
 *               - allowedEndPage
 *             properties:
 *               roleScope:
 *                 type: string
 *                 default: PUBLIC
 *                 example: PUBLIC
 *               allowedStartPage:
 *                 type: integer
 *                 example: 1
 *               allowedEndPage:
 *                 type: integer
 *                 example: 10
 *               allowDownloadFull:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       200:
 *         description: Page rule saved successfully
 *       403:
 *         description: Forbidden
 */
router.post(
  "/repository/proposals/:id/page-rules",
  publicApiLimiter,
  isAuthenticated,
  requireRole(["super_admin", "staff"]),
  (req, res, next) => proposalController.configurePageRule(req, res, next)
);

/**
 * @swagger
 * /api/repository/proposals/{id}/view-pdf:
 *   get:
 *     summary: Stream dynamically sliced PDF based on requester role and page rules
 *     tags: [Digital Repository]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Binary PDF stream (Public gets pages 1-10; logged-in civitas gets full pages)
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Document or physical file not found
 */
router.get(
  "/repository/proposals/:id/view-pdf",
  publicApiLimiter,
  (req, res, next) => proposalController.viewPdf(req, res, next)
);

export const repositoryRoutes = router;
