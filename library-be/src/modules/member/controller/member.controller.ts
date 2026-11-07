import { type NextFunction, type Request, type Response } from "express";
import { MemberService } from "../service/member.service";
import {
  approveCardSchema,
  rejectCardSchema,
  updateProfileSchema
} from "../validation/member.validation";
import {
  sendSuccess,
  sendError,
  sendValidationError
} from "../../../utils/api-utils";
import auditService from "../../audit/service/audit.service";

const memberService = new MemberService();

export class MemberController {
  /**
   * GET /me — Ambil profil user yang sedang login
   */
  async getMyProfile(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user?.id) {
        return sendError(res, "Tidak terautentikasi", 401);
      }

      const result = await memberService.getMemberByUserId(req.user.id);

      if (!result.success) {
        return sendError(res, result.message ?? "Data tidak ditemukan", 404);
      }

      sendSuccess(res, "Profil berhasil diambil", result.data);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /me — Update profil user yang sedang login
   */
  async updateMyProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const validation = updateProfileSchema.safeParse(req.body);
      if (!validation.success) {
        return sendValidationError(res, validation.error.flatten());
      }

      if (!req.user?.id) {
        return sendError(res, "Tidak terautentikasi", 401);
      }

      const result = await memberService.updateProfile(
        req.user.id,
        validation.data
      );

      if (!result.success) {
        return sendError(
          res,
          result.message ?? "Gagal memperbarui profil",
          400
        );
      }

      sendSuccess(res, "Profil berhasil diperbarui", result.data);
    } catch (error) {
      next(error);
    }
  }

  async requestMyMemberCard(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user?.id) {
        return sendError(res, "Tidak terautentikasi", 401);
      }

      const result = await memberService.requestMemberCard(req.user.id);
      if (!result.success) {
        return sendError(
          res,
          result.message ?? "Gagal mengajukan kartu member",
          400
        );
      }

      await auditService.createLog({
        userId: req.user.id,
        action: "create",
        entity: "Users",
        entityId: String(result.data?.id || req.user.id),
        ipAddress: req.ip,
        detail: "request_member_card"
      });

      sendSuccess(res, "Pengajuan kartu member berhasil", result.data, 201);
    } catch (error) {
      next(error);
    }
  }

  async getMyMemberCard(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user?.id) {
        return sendError(res, "Tidak terautentikasi", 401);
      }

      const result = await memberService.getMyCardByUserId(req.user.id);
      if (!result.success) {
        return sendError(
          res,
          result.message ?? "Data kartu member tidak ditemukan",
          404
        );
      }

      sendSuccess(res, "Data kartu member berhasil diambil", result.data);
    } catch (error) {
      next(error);
    }
  }

  async getPendingCardRequests(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const limit = Number(req.query.limit || 100);
      const result = await memberService.getPendingCardMembers(limit);

      if (!result.success) {
        return sendError(
          res,
          result.message ?? "Gagal mengambil daftar pengajuan",
          400
        );
      }

      sendSuccess(
        res,
        "Daftar pengajuan kartu member berhasil diambil",
        result.data
      );
    } catch (error) {
      next(error);
    }
  }

  async approveMemberCard(req: Request, res: Response, next: NextFunction) {
    try {
      const validation = approveCardSchema.safeParse(req.body ?? {});
      if (!validation.success) {
        return sendValidationError(res, validation.error.flatten());
      }

      const memberId = String(req.params.id || "");
      if (!memberId) {
        return sendError(res, "Member ID tidak valid", 400);
      }

      const result = await memberService.approveMemberCard(
        memberId,
        validation.data.cardNumber
      );
      if (!result.success) {
        return sendError(
          res,
          result.message ?? "Gagal approve kartu member",
          400
        );
      }

      await auditService.createLog({
        userId: req.user?.id,
        action: "approve",
        entity: "Users",
        entityId: memberId,
        ipAddress: req.ip,
        detail: "approve_member_card"
      });

      sendSuccess(res, "Kartu member berhasil diaktifkan", result.data);
    } catch (error) {
      next(error);
    }
  }

  async issueMemberCard(req: Request, res: Response, next: NextFunction) {
    try {
      const validation = approveCardSchema.safeParse(req.body ?? {});
      if (!validation.success) {
        return sendValidationError(res, validation.error.flatten());
      }

      const userId = String(req.params.id || "");
      if (!userId) {
        return sendError(res, "User ID tidak valid", 400);
      }

      const memberResult = await memberService.getMemberByUserId(userId);
      if (!memberResult.success || !memberResult.data?.id) {
        return sendError(res, "Member belum tersinkronisasi", 404);
      }

      const result = await memberService.approveMemberCard(
        memberResult.data.id,
        validation.data.cardNumber
      );
      if (!result.success) {
        return sendError(
          res,
          result.message ?? "Gagal menerbitkan kartu member",
          400
        );
      }

      await auditService.createLog({
        userId: req.user?.id,
        action: "create",
        entity: "Users",
        entityId: memberResult.data.id,
        ipAddress: req.ip,
        detail: "issue_member_card"
      });

      sendSuccess(res, "Kartu member berhasil diterbitkan", result.data);
    } catch (error) {
      next(error);
    }
  }

  async rejectMemberCard(req: Request, res: Response, next: NextFunction) {
    try {
      const validation = rejectCardSchema.safeParse(req.body);
      if (!validation.success) {
        return sendValidationError(res, validation.error.flatten());
      }

      const memberId = String(req.params.id || "");
      if (!memberId) {
        return sendError(res, "Member ID tidak valid", 400);
      }

      const result = await memberService.rejectMemberCard(
        memberId,
        validation.data.reason
      );
      if (!result.success) {
        return sendError(
          res,
          result.message ?? "Gagal menolak pengajuan kartu member",
          400
        );
      }

      await auditService.createLog({
        userId: req.user?.id,
        action: "update",
        entity: "Users",
        entityId: memberId,
        ipAddress: req.ip,
        detail: `reject_member_card; reason=${validation.data.reason}`
      });

      sendSuccess(res, "Pengajuan kartu member berhasil ditolak", result.data);
    } catch (error) {
      next(error);
    }
  }

  async getAllMembers(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = Number(req.query.limit || 200);
      const result = await memberService.getAllMembers(limit);

      if (!result.success) {
        return sendError(
          res,
          result.message ?? "Gagal mengambil daftar anggota",
          400
        );
      }

      sendSuccess(res, "Daftar anggota berhasil diambil", result.data);
    } catch (error) {
      next(error);
    }
  }

  async requestCardRenewal(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return sendError(res, "User tidak terautentikasi", 401);
      }

      const result = await memberService.requestCardRenewal(userId);
      if (!result.success) {
        return sendError(res, result.message ?? "Gagal mengajukan perpanjangan", 400);
      }

      await auditService.createLog({
        userId,
        action: "update",
        entity: "Users",
        entityId: result.data?.id,
        ipAddress: req.ip,
        detail: "request_card_renewal"
      });

      sendSuccess(res, "Pengajuan perpanjangan kartu berhasil", result.data);
    } catch (error) {
      next(error);
    }
  }

  async getPendingCardRenewals(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = Number(req.query.limit || 100);
      const result = await memberService.getPendingCardRenewals(limit);

      if (!result.success) {
        return sendError(res, result.message ?? "Gagal memuat perpanjangan kartu", 400);
      }

      sendSuccess(res, "Daftar perpanjangan kartu berhasil diambil", result.data);
    } catch (error) {
      next(error);
    }
  }

  async approveCardRenewal(req: Request, res: Response, next: NextFunction) {
    try {
      const memberId = String(req.params.id || "");
      if (!memberId) {
        return sendError(res, "Member ID tidak valid", 400);
      }

      const durationDays = req.body?.durationDays ? Number(req.body.durationDays) : 365;
      const result = await memberService.approveCardRenewal(memberId, durationDays);

      if (!result.success) {
        return sendError(res, result.message ?? "Gagal menyetujui perpanjangan", 400);
      }

      await auditService.createLog({
        userId: req.user?.id,
        action: "update",
        entity: "Users",
        entityId: memberId,
        ipAddress: req.ip,
        detail: `approve_card_renewal; durationDays=${durationDays}`
      });

      sendSuccess(res, "Perpanjangan kartu member berhasil disetujui", result.data);
    } catch (error) {
      next(error);
    }
  }

  async rejectCardRenewal(req: Request, res: Response, next: NextFunction) {
    try {
      const validation = rejectCardSchema.safeParse(req.body);
      if (!validation.success) {
        return sendValidationError(res, validation.error.flatten());
      }

      const memberId = String(req.params.id || "");
      if (!memberId) {
        return sendError(res, "Member ID tidak valid", 400);
      }

      const result = await memberService.rejectCardRenewal(
        memberId,
        validation.data.reason
      );

      if (!result.success) {
        return sendError(res, result.message ?? "Gagal menolak perpanjangan kartu", 400);
      }

      await auditService.createLog({
        userId: req.user?.id,
        action: "update",
        entity: "Users",
        entityId: memberId,
        ipAddress: req.ip,
        detail: `reject_card_renewal; reason=${validation.data.reason}`
      });

      sendSuccess(res, "Pengajuan perpanjangan kartu member berhasil ditolak", result.data);
    } catch (error) {
      next(error);
    }
  }
}
