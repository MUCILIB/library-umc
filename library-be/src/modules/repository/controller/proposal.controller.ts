import { type Request, type Response, type NextFunction } from "express";
import { proposalService } from "../service/proposal.service";
import {
  createProposalSchema,
  reviewProposalSchema,
  configurePageRuleSchema
} from "../validation/proposal.validation";
import {
  sendSuccess,
  sendError,
  sendValidationError
} from "../../../utils/api-utils";
import { getSession } from "../../../utils/auth-utils";

export class ProposalController {
  /**
   * Mahasiswa submit proposal baru
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      if (!user?.id) {
        return sendError(res, "Silakan login terlebih dahulu", 401);
      }

      if (!req.file) {
        return sendError(res, "File PDF proposal wajib diunggah", 400);
      }

      const validation = createProposalSchema.safeParse(req.body);
      if (!validation.success) {
        return sendValidationError(res, validation.error.flatten());
      }

      const proposal = await proposalService.createProposal(
        user.id,
        validation.data,
        req.file.buffer,
        req.file.originalname
      );

      sendSuccess(res, "Proposal skripsi berhasil diajukan", proposal, 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Ambil daftar proposal
   */
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const isStaffOrAdmin =
        user?.role === "super_admin" ||
        user?.role === "staff" ||
        user?.role === "admin";

      const proposals = await proposalService.getProposals({
        userId: user?.id,
        isStaffOrAdmin,
        status: req.query.status as string,
        studyProgramId: req.query.studyProgramId ? Number(req.query.studyProgramId) : undefined
      });

      sendSuccess(res, "Daftar proposal berhasil diambil", proposals);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mengambil daftar proposal yang telah disetujui (APPROVED) untuk halaman publik E-Resources
   */
  async getPublished(req: Request, res: Response, next: NextFunction) {
    try {
      const proposals = await proposalService.getPublishedProposals({
        search: req.query.search as string,
        category: req.query.category as string,
        studyProgramId: req.query.studyProgramId ? Number(req.query.studyProgramId) : undefined,
        facultyId: req.query.facultyId ? Number(req.query.facultyId) : undefined,
        yearStart: req.query.yearStart ? Number(req.query.yearStart) : undefined,
        yearEnd: req.query.yearEnd ? Number(req.query.yearEnd) : undefined
      });

      sendSuccess(res, "Daftar repositori karya ilmiah publik berhasil diambil", proposals);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Ambil detail proposal (Publik jika APPROVED, privat jika draft)
   */
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const proposal = await proposalService.getProposalById(id);

      if (proposal.status !== "APPROVED") {
        const session = req.user
          ? { user: req.user }
          : await getSession(req).catch(() => null);
        const user = session?.user;
        const isStaffOrAdmin =
          user?.role === "super_admin" ||
          user?.role === "staff" ||
          user?.role === "admin";
        if (!user || (!isStaffOrAdmin && user.id !== proposal.authorUserId)) {
          return sendError(res, "Dokumen ini belum dipublikasikan untuk umum", 403);
        }
      }

      sendSuccess(res, "Detail proposal berhasil diambil", proposal);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Review proposal (Maker-Checker Pustakawan/Admin)
   */
  async review(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      if (!user?.id) {
        return sendError(res, "Silakan login terlebih dahulu", 401);
      }

      const validation = reviewProposalSchema.safeParse(req.body);
      if (!validation.success) {
        return sendValidationError(res, validation.error.flatten());
      }

      const id = String(req.params.id);
      const updated = await proposalService.reviewProposal(
        id,
        user.id,
        validation.data
      );

      sendSuccess(res, "Status verifikasi proposal berhasil diperbarui", updated);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Konfigurasi batas halaman (Page-Level ACL)
   */
  async configurePageRule(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      if (!user?.id) {
        return sendError(res, "Silakan login terlebih dahulu", 401);
      }

      const validation = configurePageRuleSchema.safeParse(req.body);
      if (!validation.success) {
        return sendValidationError(res, validation.error.flatten());
      }

      const id = String(req.params.id);
      const rule = await proposalService.configurePageRule(
        id,
        user.id,
        validation.data
      );

      sendSuccess(res, "Konfigurasi pembatasan halaman berhasil disimpan", rule);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Endpoint stream PDF terpotong (Page-Level Dynamic PDF Delivery)
   */
  async viewPdf(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const isPublicPreview =
        req.query?.preview === "public" ||
        req.query?.mode === "public" ||
        req.query?.forcePublic === "true";

      // Cek apakah requester memiliki sesi login (optional auth)
      const session = req.user
        ? { user: req.user }
        : await getSession(req).catch(() => null);

      const requester = {
        userId: session?.user?.id,
        role: ((session?.user as any)?.role || "public")
      };

      const result = await proposalService.getDocumentPdf(id, requester, {
        forcePublicPreview: isPublicPreview
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="proposal-preview-${id}.pdf"`
      );
      res.setHeader("X-Total-Document-Pages", result.totalDocumentPages.toString());
      res.setHeader("X-Preview-Start-Page", result.startPage.toString());
      res.setHeader("X-Preview-End-Page", result.endPage.toString());
      res.setHeader("X-Is-Restricted", result.isRestricted ? "true" : "false");

      res.status(200).send(result.buffer);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mahasiswa mengupdate naskah proposal / revisi
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      if (!user?.id) {
        return sendError(res, "Silakan login terlebih dahulu", 401);
      }

      const id = String(req.params.id);
      const isStaffOrAdmin =
        user.role === "super_admin" ||
        user.role === "staff" ||
        user.role === "admin";

      const updated = await proposalService.updateProposal(
        id,
        user.id,
        req.body,
        req.file ? req.file.buffer : undefined,
        req.file ? req.file.originalname : undefined,
        isStaffOrAdmin
      );

      sendSuccess(res, "Proposal skripsi berhasil diperbarui", updated);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mahasiswa / Admin menghapus proposal
   */
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      if (!user?.id) {
        return sendError(res, "Silakan login terlebih dahulu", 401);
      }

      const id = String(req.params.id);
      const isStaffOrAdmin =
        user.role === "super_admin" ||
        user.role === "staff" ||
        user.role === "admin";

      const result = await proposalService.deleteProposal(id, user.id, isStaffOrAdmin);
      sendSuccess(res, "Dokumen proposal berhasil dihapus", result);
    } catch (error) {
      next(error);
    }
  }
}

export const proposalController = new ProposalController();
