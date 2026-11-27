import { type NextFunction, type Request, type Response } from "express";
import { LoanService } from "../service/loan.service";
import {
  createLoanSchema,
  directLoanSchema,
  getLoansQuerySchema
} from "../validation/loan.validation";
import {
  sendSuccess,
  sendError,
  sendValidationError
} from "../../../utils/api-utils";
import { MemberService } from "../../member/service/member.service";
import reservationService from "../../reservation/service/reservation.service";
import auditService from "../../audit/service/audit.service";
import { db } from "../../../db";
import { members } from "../../../db/schema";
import { eq, and, isNull } from "drizzle-orm";

const loanService = new LoanService();
const memberService = new MemberService();

export class LoanController {
  /**
   * POST /loans/request — Ajukan permintaan peminjaman (Member)
   */
  async createRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const validation = createLoanSchema.safeParse(req.body);
      if (!validation.success) {
        return sendValidationError(res, validation.error.flatten());
      }

      if (!req.user?.id) {
        return sendError(res, "Tidak terautentikasi", 401);
      }

      let memberIdToUse: string | undefined;
      const requestedMemberId = validation.data.memberId || (req.body as any)?.memberId;
      if (
        (req.user.role === "super_admin" || req.user.role === "staff") &&
        requestedMemberId &&
        requestedMemberId !== "current-user"
      ) {
        const targetMember = await db.query.members.findFirst({
          where: and(eq(members.id, requestedMemberId), isNull(members.deletedAt)),
        });
        if (targetMember) {
          if (targetMember.cardStatus !== "active" || !targetMember.cardNumber) {
            return sendError(
              res,
              "Member belum memiliki kartu anggota yang aktif dan diterbitkan. Peminjaman hanya dapat dilakukan jika kartu sudah terbit.",
              400
            );
          }
          memberIdToUse = targetMember.id;
        }
      }

      if (!memberIdToUse) {
        const eligibility = await memberService.getBorrowEligibilityByUserId(
          req.user.id
        );
        if (!eligibility.success || !eligibility.data?.memberId) {
          return sendError(res, eligibility.message, 400);
        }
        memberIdToUse = eligibility.data.memberId;
      }

      const targetBibId = (validation.data.bibliographyId || validation.data.collectionId || validation.data.itemId)!;

      const result = await loanService.requestLoan(
        memberIdToUse,
        targetBibId,
        validation.data.loanDate,
        validation.data.dueDate,
        validation.data.notes,
        validation.data.itemId
      );

      void auditService.createLog({
        userId: req.user.id,
        action: "create",
        entity: "loan",
        entityId: result.id,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        detail: `Pengajuan peminjaman mandiri buku (${targetBibId}) jatuh tempo ${result.dueDate}`,
      });

      sendSuccess(res, "Permintaan peminjaman berhasil diajukan", result);
    } catch (error: any) {
      if (
        error?.message &&
        (error.message.includes("tidak tersedia") ||
          error.message.includes("perbaikan") ||
          error.message.includes("diperbaiki") ||
          error.message.includes("sedang berstatus") ||
          error.message.includes("batas maksimal") ||
          error.message.includes("Referensi") ||
          error.message.includes("dipesan") ||
          error.message.includes("setelah tanggal") ||
          error.message.includes("tidak valid") ||
          error.message.includes("maksimal adalah 7"))
      ) {
        return sendError(res, error.message, 400);
      }
      next(error);
    }
  }

  /**
   * POST /loans/direct — Input Peminjaman Langsung di Tempat oleh Petugas (Staff/Admin)
   */
  async createDirectLoan(req: Request, res: Response, next: NextFunction) {
    try {
      const validation = directLoanSchema.safeParse(req.body);
      if (!validation.success) {
        return sendValidationError(res, validation.error.flatten());
      }

      if (!req.user?.id) {
        return sendError(res, "Tidak terautentikasi", 401);
      }

      const result = await loanService.createDirectLoan(req.user.id, validation.data);

      void auditService.createLog({
        userId: req.user.id,
        action: "create",
        entity: "loan",
        entityId: (result as any)?.id,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        detail: `Peminjaman langsung petugas untuk member ${validation.data.memberIdentifier}, item ${validation.data.itemIdentifier}`,
      });

      sendSuccess(res, "Peminjaman langsung berhasil diproses", result, 201);
    } catch (error: any) {
      if (
        error.message &&
        (error.message.includes("tidak ditemukan") ||
          error.message.includes("belum aktif") ||
          error.message.includes("kedaluwarsa") ||
          error.message.includes("tertunggak") ||
          error.message.includes("kuota maksimal") ||
          error.message.includes("terlambat") ||
          error.message.includes("tidak tersedia") ||
          error.message.includes("sedang berstatus"))
      ) {
        return sendError(res, error.message, 400);
      }
      next(error);
    }
  }


  /**
   * GET /loans/verify/:token — Verifikasi token QR peminjaman
   */
  async verifyToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.params;

      if (!token) {
        return sendError(res, "Token wajib diisi", 400);
      }

      const result = await loanService.verifyToken(token as string);
      sendSuccess(res, "Token berhasil diverifikasi", result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /loans/approve/:requestId — Approve peminjaman (Admin/Staff)
   */
  async approveLoan(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;

      if (!user || (user.role !== "super_admin" && user.role !== "staff")) {
        return sendError(res, "Akses ditolak — hanya Admin/Staff", 403);
      }

      const result = await loanService.approveLoan(
        String(req.params.requestId),
        user.id
      );

      void auditService.createLog({
        userId: user.id,
        action: "approve",
        entity: "loan",
        entityId: String(req.params.requestId),
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        detail: `Persetujuan peminjaman oleh petugas/admin (${user.name || user.id})`,
      });

      sendSuccess(res, "Peminjaman berhasil diapprove", result);
    } catch (error: any) {
      if (
        error?.message &&
        (error.message.includes("tidak ditemukan") ||
          error.message.includes("Sedang Diperbaiki") ||
          error.message.includes("sedang berstatus") ||
          error.message.includes("tidak tersedia"))
      ) {
        return sendError(res, error.message, 400);
      }
      next(error);
    }
  }

  /**
   * PATCH /loans/reject/:requestId — Tolak peminjaman (Admin/Staff)
   */
  async rejectLoan(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;

      if (!user || (user.role !== "super_admin" && user.role !== "staff")) {
        return sendError(res, "Akses ditolak — hanya Admin/Staff", 403);
      }

      const result = await loanService.rejectLoan(
        String(req.params.requestId),
        user.id
      );

      void auditService.createLog({
        userId: user.id,
        action: "update",
        entity: "loan",
        entityId: String(req.params.requestId),
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        detail: `Penolakan peminjaman oleh petugas/admin (${user.name || user.id})`,
      });

      sendSuccess(res, "Peminjaman berhasil ditolak", result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /loans/:id/cancel — Batalkan pemesanan peminjaman (Member)
   */
  async cancelLoan(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user) {
        return sendError(res, "Tidak terautentikasi", 401);
      }

      const loanId = String(req.params.id);
      const memberId = await loanService.getMemberIdByUserId(user.id);
      if (!memberId && user.role !== "super_admin" && user.role !== "staff") {
        return sendError(res, "Member tidak ditemukan", 400);
      }

      const result = await loanService.cancelLoan(
        loanId,
        memberId || "",
        user.role || undefined
      );

      void auditService.createLog({
        userId: user.id,
        action: "delete",
        entity: "loan",
        entityId: loanId,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        detail: `Pemesanan peminjaman dibatalkan oleh pengguna`,
      });

      sendSuccess(res, "Pemesanan berhasil dibatalkan", result);
    } catch (error: unknown) {
      const err = error as Error;
      if (
        err.message &&
        (err.message.includes("tidak ditemukan") ||
          err.message.includes("Akses ditolak") ||
          err.message.includes("status pending"))
      ) {
        return sendError(res, err.message, 400);
      }
      next(error);
    }
  }

  /**
   * PATCH /loans/return/:loanId — Proses pengembalian buku (Admin/Staff)
   */
  async returnLoan(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;

      if (!user || (user.role !== "super_admin" && user.role !== "staff")) {
        return sendError(res, "Akses ditolak — hanya Admin/Staff", 403);
      }

      const { condition, staffName, signature, notes } = req.body || {};
      const result = await loanService.returnLoan(
        String(req.params.loanId),
        user.id,
        {
          condition,
          staffName: staffName || user.name || "Petugas Perpustakaan",
          signature,
          notes,
        }
      );

      void auditService.createLog({
        userId: user.id,
        action: "update",
        entity: "loan",
        entityId: String(req.params.loanId),
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        detail: `Pengembalian buku diproses. Kondisi: ${condition || "good"}${result.fine ? `, Denda: Rp ${result.fine.assessedAmount}` : ", Bebas Denda"}`,
      });

      sendSuccess(res, "Buku berhasil dikembalikan", result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /loans/:loanId — Ambil detail satu peminjaman
   */
  async getLoanById(req: Request, res: Response, next: NextFunction) {
    try {
      const loan = await loanService.getLoanById(String(req.params.loanId));
      if (!loan) {
        return sendError(res, "Data peminjaman tidak ditemukan", 404);
      }
      sendSuccess(res, "Detail data peminjaman", loan);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /loans/:loanId/return-receipt — Unduh Berita Acara / Tanda Terima Pengembalian PDF
   */
  async downloadReturnReceiptPdf(req: Request, res: Response, next: NextFunction) {
    try {
      const loanId = String(req.params.loanId || "");
      const loan = await loanService.getLoanById(loanId);
      const rawRef = loan?.returnReceiptNo || `BA-RET-${loanId.slice(0, 8).toUpperCase()}`;
      const safeRef = rawRef
        .toLowerCase()
        .replace(/[^a-z0-9-_]+/g, "-")
        .replace(/^-+|-+$/g, "");
      const filename = `berita-acara-pengembalian_${safeRef}.pdf`;

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

      void auditService.createLog({
        userId: req.user?.id,
        action: "update",
        entity: "loan",
        entityId: loanId,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        detail: `Unduh Berita Acara / Resi Pengembalian Buku PDF (${filename})`,
      });

      await loanService.generateReturnReceiptPdf(loanId, res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /loans/my — Ambil peminjaman milik member yang login
   */
  async getMyLoans(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user?.id) {
        return sendError(res, "Tidak terautentikasi", 401);
      }

      const memberId = await loanService.getMemberIdByUserId(req.user.id);
      if (!memberId) {
        return sendSuccess(
          res,
          "Profil member tidak ditemukan, riwayat peminjaman kosong",
          []
        );
      }

      const result = await loanService.getAllLoans({ memberId, limit: 100 });
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /loans — Ambil semua peminjaman (Admin/Staff)
   */
  async getAllLoans(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;

      if (!user || (user.role !== "super_admin" && user.role !== "staff")) {
        return sendError(res, "Akses ditolak — hanya Admin/Staff", 403);
      }

      const validation = getLoansQuerySchema.safeParse(req.query);
      if (!validation.success) {
        return sendValidationError(res, validation.error.flatten());
      }

      const { status, memberId } = validation.data;

      if (!status || status === "pending") {
        await reservationService.syncPendingReservationsWithAvailableStock();
      }

      const result = await loanService.getAllLoans({
        status: status as any,
        memberId,
        limit: 100
      });

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
  /**
   * POST /loans/:loanId/extend — Perpanjang peminjaman (Member)
   */
  /**
   * POST /loans/:loanId/return-request — Member creates a return request (offline)
   */
  async createReturnRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user) {
        return sendError(res, "Tidak terautentikasi", 401);
      }
      const loanId = String(req.params.loanId);
      const memberId = await loanService.getMemberIdByUserId(user.id);
      if (!memberId) {
        return sendError(res, "Member tidak ditemukan", 400);
      }
      const result = await loanService.createReturnRequest(loanId, memberId);

      void auditService.createLog({
        userId: user.id,
        action: "create",
        entity: "loan",
        entityId: loanId,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        detail: `Permintaan pengembalian buku diajukan oleh peminjam`,
      });

      sendSuccess(res, result.message, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /loans/return-requests/:requestId/approve — Super Admin / Staff approves return
   */
  async approveReturnRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user || (user.role !== "super_admin" && user.role !== "staff")) {
        return sendError(res, "Akses ditolak — hanya Super Admin atau Staff", 403);
      }
      const requestId = String(req.params.requestId);
      const { condition, staffName, signature, notes } = req.body || {};
      const result = await loanService.approveReturnRequest(requestId, user.id, {
        condition,
        staffName: staffName || user.name || "Petugas Perpustakaan",
        signature,
        notes,
      });

      void auditService.createLog({
        userId: user.id,
        action: "approve",
        entity: "loan",
        entityId: requestId,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        detail: `Permintaan pengembalian buku disetujui petugas. Kondisi: ${condition || "good"}`,
      });

      sendSuccess(res, result.message, result);
    } catch (error: any) {
      if (
        error.message &&
        (error.message.includes("tidak ditemukan") ||
          error.message.includes("harus disetujui") ||
          error.message.includes("tidak dalam status") ||
          error.message.includes("sudah diproses"))
      ) {
        return sendError(res, error.message, 400);
      }
      next(error);
    }
  }
  /**
   * POST /loans/:loanId/extend — Perpanjang peminjaman (Member)
   */
  async extendLoan(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user) {
        return sendError(res, "Tidak terautentikasi", 401);
      }
      const { loanId } = req.params;
      const memberId = await loanService.getMemberIdByUserId(user.id);
      if (!memberId) {
        return sendError(res, "Member tidak ditemukan", 400);
      }

      const result = await loanService.requestExtension(String(loanId), memberId);

      void auditService.createLog({
        userId: user.id,
        action: "update",
        entity: "loan",
        entityId: String(loanId),
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        detail: `Pengajuan perpanjangan peminjaman diajukan oleh peminjam`,
      });

      sendSuccess(res, result.message, result.data);
    } catch (error: unknown) {
      const err = error as Error;
      if (
        err.message &&
        (err.message.includes("sudah pernah diperpanjang") ||
          err.message.includes("melewati batas waktu") ||
          err.message.includes("dipesan (reserved)") ||
          err.message.includes("sedang diproses") ||
          err.message.includes("Akses ditolak"))
      ) {
        return sendError(res, err.message, 400);
      }
      next(error);
    }
  }

  /**
   * POST /loans/:loanId/approve-extension — Admin approve perpanjangan
   */
  async approveExtension(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user || (user.role !== "super_admin" && user.role !== "staff")) {
        return sendError(res, "Akses ditolak — hanya Admin/Staff", 403);
      }
      const { loanId } = req.params;
      const result = await loanService.approveExtension(String(loanId), user.id);

      void auditService.createLog({
        userId: user.id,
        action: "approve",
        entity: "loan",
        entityId: String(loanId),
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        detail: `Perpanjangan peminjaman disetujui petugas (+7 hari)`,
      });

      sendSuccess(res, result.message, result.data);
    } catch (error: unknown) {
      const err = error as Error;
      if (
        err.message &&
        (err.message.includes("tidak ditemukan") ||
          err.message.includes("Tidak ada permintaan") ||
          err.message.includes("batas maksimal") ||
          err.message.includes("dipesan"))
      ) {
        return sendError(res, err.message, 400);
      }
      next(error);
    }
  }

  /**
   * POST /loans/:loanId/reject-extension — Admin reject perpanjangan
   */
  async rejectExtension(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user || (user.role !== "super_admin" && user.role !== "staff")) {
        return sendError(res, "Akses ditolak — hanya Admin/Staff", 403);
      }
      const { loanId } = req.params;
      const result = await loanService.rejectExtension(String(loanId), user.id);

      void auditService.createLog({
        userId: user.id,
        action: "update",
        entity: "loan",
        entityId: String(loanId),
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        detail: `Perpanjangan peminjaman ditolak petugas`,
      });

      sendSuccess(res, result.message, result.data);
    } catch (error: unknown) {
      const err = error as Error;
      if (
        err.message &&
        (err.message.includes("tidak ditemukan") ||
          err.message.includes("Tidak ada permintaan"))
      ) {
        return sendError(res, err.message, 400);
      }
      next(error);
    }
  }

  /**
   * GET /loans/return-requests/pending — Super Admin gets all pending return requests
   */
  async getPendingReturnRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user || user.role !== "super_admin") {
        return sendError(res, "Akses ditolak — hanya Super Admin", 403);
      }
      const result = await loanService.getPendingReturnRequests();
      sendSuccess(res, "Pending return requests retrieved", result.data);
    } catch (error) {
      next(error);
    }
  }
}
