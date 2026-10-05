import { type NextFunction, type Request, type Response } from "express";
import { LoanService } from "../service/loan.service";
import {
  createLoanSchema,
  getLoansQuerySchema
} from "../validation/loan.validation";
import {
  sendSuccess,
  sendError,
  sendValidationError
} from "../../../utils/api-utils";
import { MemberService } from "../../member/service/member.service";

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

      const eligibility = await memberService.getBorrowEligibilityByUserId(
        req.user.id
      );
      if (!eligibility.success || !eligibility.data?.memberId) {
        return sendError(res, eligibility.message, 400);
      }

      const result = await loanService.requestLoan(
        eligibility.data.memberId,
        validation.data.bibliographyId,
        validation.data.loanDate,
        validation.data.dueDate,
        validation.data.notes
      );
      sendSuccess(res, "Permintaan peminjaman berhasil diajukan", result);
    } catch (error) {
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
      sendSuccess(res, "Peminjaman berhasil diapprove", result);
    } catch (error) {
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

      const result = await loanService.returnLoan(
        String(req.params.loanId),
        user.id
      );
      sendSuccess(res, "Buku berhasil dikembalikan", result);
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
      sendSuccess(res, result.message, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /loans/return-requests/:requestId/approve — Super Admin approves return
   */
  async approveReturnRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user || user.role !== "super_admin") {
        return sendError(res, "Akses ditolak — hanya Super Admin", 403);
      }
      const requestId = String(req.params.requestId);
      const result = await loanService.approveReturnRequest(requestId, user.id);
      sendSuccess(res, result.message, result);
    } catch (error) {
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
