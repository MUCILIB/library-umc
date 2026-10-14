import { type NextFunction, type Request, type Response } from "express";
import { AuthService } from "../service/auth.service";
import {
  loginSchema,
  registerSchema,
  loginCredentialSchema
} from "../validation/auth.validation";
import { UserService } from "../service/user.service";
import {
  sendSuccess,
  sendError,
  sendValidationError
} from "../../../utils/api-utils";
import auditService from "../../audit/service/audit.service";

const authService = new AuthService();

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const validation = registerSchema.safeParse(req.body);
      if (!validation.success) {
        return sendValidationError(res, validation.error.flatten());
      }

      const { name, email, password } = validation.data;
      const result = await authService.registerWithCredentials(
        name,
        email,
        password
      );

      sendSuccess(res, "Registrasi berhasil", result, 201);
    } catch (error) {
      next(error);
    }
  }

  async loginCredential(req: Request, res: Response, next: NextFunction) {
    try {
      const validation = loginCredentialSchema.safeParse(req.body);
      if (!validation.success) {
        const attemptedEmail =
          typeof req.body?.email === "string" ? req.body.email : undefined;
        await auditService.createLog({
          action: "failed_login",
          entity: "auth",
          ipAddress: req.ip,
          userAgent: req.get("user-agent") || undefined,
          detail: `validation_failed${
            attemptedEmail ? `; email=${attemptedEmail}` : ""
          }`
        });
        return sendValidationError(res, validation.error.flatten());
      }

      const { email, password } = validation.data;
      const result = await authService.loginWithCredentials(email, password);

      sendSuccess(res, "Login berhasil", result);
    } catch (error) {
      const attemptedEmail =
        typeof req.body?.email === "string" ? req.body.email : undefined;
      const statusCode =
        typeof (error as { statusCode?: unknown })?.statusCode === "number"
          ? (error as { statusCode: number }).statusCode
          : 500;

      if (statusCode === 401 || statusCode === 400) {
        await auditService.createLog({
          action: "failed_login",
          entity: "auth",
          ipAddress: req.ip,
          userAgent: req.get("user-agent") || undefined,
          detail: `invalid_credentials${
            attemptedEmail ? `; email=${attemptedEmail}` : ""
          }`
        });
      }
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const validation = loginSchema.safeParse(req.body);
      if (!validation.success) {
        return sendValidationError(res, validation.error.flatten());
      }

      const { email } = validation.data;
      const result = await authService.verifyWithCampus(email);

      if (!result.campusData) {
        return sendError(res, "Email tidak ditemukan di sistem kampus", 404);
      }

      sendSuccess(res, "Verifikasi kampus berhasil", result);
    } catch (error) {
      next(error);
    }
  }

  async getAllUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await UserService.getAllUsers();

      if (!result.success) {
        return sendError(
          res,
          result.message ?? "Gagal mengambil data pengguna",
          500
        );
      }

      sendSuccess(res, "Data pengguna berhasil diambil", result.data);
    } catch (error) {
      next(error);
    }
  }

  async updateUserRole(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = String(req.params.id || "");
      const role = String(req.body?.role || "");
      const actorUserId = String(req.user?.id || "");

      if (!userId || !role || !actorUserId) {
        return sendError(res, "Data update role tidak lengkap", 400);
      }

      const result = await UserService.updateUserRole(
        userId,
        role,
        actorUserId
      );

      if (!result.success) {
        return sendError(
          res,
          result.message ?? "Gagal memperbarui role user",
          400
        );
      }

      await auditService.createLog({
        userId: actorUserId,
        action: "update",
        entity: "Users",
        entityId: userId,
        ipAddress: req.ip
      });

      sendSuccess(res, "Role user berhasil diperbarui", result.data);
    } catch (error) {
      next(error);
    }
  }

  async updateUserBanStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = String(req.params.id || "");
      const banned = Boolean(req.body?.banned);
      const banReason = req.body?.banReason
        ? String(req.body.banReason)
        : undefined;
      const actorUserId = String(req.user?.id || "");

      if (!userId || !actorUserId || typeof req.body?.banned !== "boolean") {
        return sendError(res, "Data update ban tidak lengkap", 400);
      }

      const result = await UserService.updateUserBanStatus(
        userId,
        banned,
        actorUserId,
        banReason
      );

      if (!result.success) {
        return sendError(
          res,
          result.message ?? "Gagal memperbarui status ban user",
          400
        );
      }

      await auditService.createLog({
        userId: actorUserId,
        action: banned ? "blacklist" : "update",
        entity: "Users",
        entityId: userId,
        ipAddress: req.ip
      });

      sendSuccess(
        res,
        banned ? "User berhasil diblokir" : "User berhasil diaktifkan kembali",
        result.data
      );
    } catch (error) {
      next(error);
    }
  }

  async syncUserMember(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = String(req.params.id || "");
      const actorUserId = String(req.user?.id || "");

      if (!userId || !actorUserId) {
        return sendError(res, "Data sinkronisasi tidak lengkap", 400);
      }

      const result = await authService.syncUserMemberByUserId(userId);

      await auditService.createLog({
        userId: actorUserId,
        action: "update",
        entity: "Users",
        entityId: userId,
        ipAddress: req.ip,
        detail: `sync_member; mode=${result.mode}; email=${result.email}`
      });

      sendSuccess(res, "Sinkronisasi member user berhasil", result);
    } catch (error) {
      next(error);
    }
  }

  async syncMyMember(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = String(req.user?.id || "");

      if (!userId) {
        return sendError(res, "Unauthorized", 401);
      }

      const result = await authService.syncUserMemberByUserId(userId);

      await auditService.createLog({
        userId,
        action: "update",
        entity: "auth",
        entityId: userId,
        ipAddress: req.ip,
        detail: `self_sync_member; mode=${result.mode}; email=${result.email}`
      });

      sendSuccess(res, "Sinkronisasi profil member Anda berhasil", result);
    } catch (error) {
      next(error);
    }
  }

  async deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = String(req.params.id || "");
      const actorUserId = String(req.user?.id || "");

      if (!userId || !actorUserId) {
        return sendError(res, "Data user tidak lengkap", 400);
      }

      const result = await UserService.deleteUser(userId, actorUserId);

      if (!result.success) {
        return sendError(
          res,
          result.message ?? "Gagal menghapus user",
          400
        );
      }

      await auditService.createLog({
        userId: actorUserId,
        action: "delete",
        entity: "Users",
        entityId: userId,
        ipAddress: req.ip,
        detail: `delete_user; target_user_id=${userId}`
      });

      sendSuccess(res, result.message ?? "User berhasil dihapus", result.data);
    } catch (error) {
      next(error);
    }
  }
}
