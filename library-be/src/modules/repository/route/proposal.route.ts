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
 * /repository/proposals:
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
 *   get:
 *     summary: Get proposals list (Authenticated)
 *     description: Mahasiswa hanya melihat proposal miliknya; Staff dan Admin melihat seluruh proposal.
 *     tags: [Digital Repository]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [DRAFT, SUBMITTED, UNDER_REVIEW, REVISION_REQUIRED, APPROVED, REJECTED]
 *         description: Filter berdasarkan status
 *       - in: query
 *         name: studyProgramId
 *         schema:
 *           type: integer
 *         description: Filter program studi
 *     responses:
 *       200:
 *         description: Daftar proposal berhasil diambil
 *       401:
 *         description: Unauthorized
 *
 * /repository/published:
 *   get:
 *     summary: Get published documents catalog (Public)
 *     description: Mengambil daftar karya ilmiah dan proposal yang telah disetujui (APPROVED) untuk akses publik.
 *     tags: [Digital Repository]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Kata kunci judul, abstrak, atau nama pembimbing
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [PROPOSAL, THESIS, REPORT]
 *         description: Filter kategori dokumen
 *       - in: query
 *         name: studyProgramId
 *         schema:
 *           type: integer
 *         description: Filter program studi
 *       - in: query
 *         name: facultyId
 *         schema:
 *           type: integer
 *         description: Filter fakultas
 *       - in: query
 *         name: yearStart
 *         schema:
 *           type: integer
 *         description: Filter tahun awal
 *       - in: query
 *         name: yearEnd
 *         schema:
 *           type: integer
 *         description: Filter tahun akhir
 *     responses:
 *       200:
 *         description: Berhasil mengambil katalog publik
 *       500:
 *         description: Internal server error
 *
 * /repository/proposals/{id}:
 *   get:
 *     summary: Get proposal detail by ID
 *     description: Publik hanya dapat melihat jika status APPROVED; pemilik atau admin dapat melihat status apapun.
 *     tags: [Digital Repository]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID proposal
 *     responses:
 *       200:
 *         description: Detail proposal ditemukan
 *       403:
 *         description: Dokumen ini belum dipublikasikan untuk umum
 *       404:
 *         description: Dokumen tidak ditemukan
 *   put:
 *     summary: Update proposal document or metadata
 *     description: Pemilik proposal atau staff/admin memperbarui metadata dan/atau mengunggah revisi PDF baru.
 *     tags: [Digital Repository]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID proposal
 *     requestBody:
 *       required: false
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               abstract:
 *                 type: string
 *               advisorName1:
 *                 type: string
 *               advisorName2:
 *                 type: string
 *               studyProgramId:
 *                 type: integer
 *               documentCategory:
 *                 type: string
 *                 enum: [PROPOSAL, THESIS, REPORT]
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Proposal berhasil diperbarui
 *       400:
 *         description: Validasi gagal
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Proposal tidak ditemukan
 *   delete:
 *     summary: Delete proposal document
 *     description: Hapus proposal dari repository (pemilik atau staff/admin).
 *     tags: [Digital Repository]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID proposal
 *     responses:
 *       200:
 *         description: Proposal berhasil dihapus
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Proposal tidak ditemukan
 *
 * /repository/proposals/{id}/review:
 *   patch:
 *     summary: Review and transition proposal status (Staff / Admin)
 *     description: Menyetujui atau meminta revisi proposal yang diajukan mahasiswa.
 *     tags: [Digital Repository]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID proposal
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
 *                 example: Dokumen disetujui untuk publikasi repositori
 *     responses:
 *       200:
 *         description: Status proposal berhasil diperbarui
 *       400:
 *         description: Transisi status tidak valid
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Khusus Staff/Admin
 *       404:
 *         description: Proposal tidak ditemukan
 *
 * /repository/proposals/{id}/page-rules:
 *   post:
 *     summary: Configure page-level slicing rules for PDF (Staff / Admin)
 *     description: Mengatur batas halaman yang boleh diakses publik vs member terdaftar.
 *     tags: [Digital Repository]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID proposal
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
 *                 enum: [PUBLIC, STUDENT, MEMBER, ALL]
 *                 default: PUBLIC
 *               allowedStartPage:
 *                 type: integer
 *                 example: 1
 *               allowedEndPage:
 *                 type: integer
 *                 example: 15
 *               allowDownloadFull:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       200:
 *         description: Aturan halaman PDF berhasil dikonfigurasi
 *       400:
 *         description: Parameter halaman tidak valid
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Khusus Staff/Admin
 *       404:
 *         description: Proposal tidak ditemukan
 *
 * /repository/proposals/{id}/view-pdf:
 *   get:
 *     summary: Stream or download PDF with Page-Level Access Control
 *     description: Streaming dokumen PDF. Tamu publik hanya menerima halaman terpotong (misal hal 1-15), user terotorisasi menerima full dokumen.
 *     tags: [Digital Repository]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID proposal
 *       - in: query
 *         name: download
 *         schema:
 *           type: boolean
 *         description: Set true untuk mengunduh berkas
 *       - in: query
 *         name: mode
 *         schema:
 *           type: string
 *           enum: [download, public]
 *       - in: query
 *         name: preview
 *         schema:
 *           type: string
 *           enum: [public]
 *       - in: query
 *         name: forcePublic
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Binary PDF stream
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       403:
 *         description: Dokumen terkunci atau belum dipublikasikan
 *       404:
 *         description: Dokumen PDF tidak ditemukan
 */
export const repositoryRoutes = router;

