import { type NextFunction, type Request, type Response } from "express";
import recommendationService from "../service/recommendation.service";
import {
  createRecommendationSchema,
  updateRecommendationStatusSchema,
} from "../validation/recommendation.validation";
import {
  sendSuccess,
  sendError,
  sendValidationError,
} from "../../../utils/api-utils";

class RecommendationController {
  /**
   * Submit Rekomendasi
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const validation = createRecommendationSchema.safeParse(req.body);
      if (!validation.success) {
        return sendValidationError(res, validation.error.flatten());
      }

      const user = (req as any).user;
      if (!user?.id) {
        return sendError(res, "Tidak terautentikasi", 401);
      }

      const result = await recommendationService.createRecommendation(
        user.id,
        validation.data
      );

      sendSuccess(res, "Rekomendasi berhasil diajukan", result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get All (Admin) or My (Dosen) Recommendations
   */
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      if (!user) return sendError(res, "Tidak terautentikasi", 401);

      let dosenId: string | undefined;
      // Jika bukan admin/staff, hanya bisa lihat miliknya sendiri
      if (user.role !== "super_admin" && user.role !== "staff") {
        dosenId = user.id;
      }

      const statusStr = req.query.status as string | undefined;
      const validStatuses = ["pending", "approved", "rejected"];
      const status = (validStatuses.includes(statusStr || "") 
        ? statusStr 
        : undefined) as "pending" | "approved" | "rejected" | undefined;

      const result = await recommendationService.getRecommendations({
        dosenId,
        status,
      });

      sendSuccess(res, "Berhasil mengambil data recommendation", result);
    } catch (error: unknown) {
      next(error);
    }
  }

  /**
   * Update Status (Admin)
   */
  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const validation = updateRecommendationStatusSchema.safeParse(req.body);
      
      if (!validation.success) {
        return sendValidationError(res, validation.error.flatten());
      }

      const result = await recommendationService.updateStatus(String(id), validation.data.status);
      sendSuccess(res, "Status rekomendasi berhasil diperbarui", result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * getMyRecommendations (Dosen)
   */
  async getMyRecommendations(req: Request, res: Response, next: NextFunction) {
    return this.getAll(req, res, next);
  }

  /**
   * getAllRecommendations (Admin)
   */
  async getAllRecommendations(req: Request, res: Response, next: NextFunction) {
    return this.getAll(req, res, next);
  }

  /**
   * createRecommendation (Dosen)
   */
  async createRecommendation(req: Request, res: Response, next: NextFunction) {
    return this.create(req, res, next);
  }

  /**
   * updateRecommendationStatus (Admin)
   */
  async updateRecommendationStatus(req: Request, res: Response, next: NextFunction) {
    return this.updateStatus(req, res, next);
  }

  /**
   * Soft Delete Recommendation
   */
  async deleteRecommendation(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = (req as any).user;
      const result = await recommendationService.deleteRecommendation(
        String(id),
        user?.id,
        user?.role
      );
      sendSuccess(res, "Rekomendasi berhasil dihapus", result);
    } catch (error: unknown) {
      next(error);
    }
  }

}

export default new RecommendationController();
