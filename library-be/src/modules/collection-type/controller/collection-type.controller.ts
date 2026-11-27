import { type Request, type Response, type NextFunction } from "express";
import { collectionTypeService } from "../service/collection-type.service";
import {
  createCollectionTypeSchema,
  updateCollectionTypeSchema,
  createGmdSchema,
  updateGmdSchema,
} from "../validation/collection-type.validation";
import { sendSuccess, sendError, sendValidationError } from "../../../utils/api-utils";

export class CollectionTypeController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await collectionTypeService.getAll();
      return sendSuccess(res, "Daftar tipe koleksi berhasil diambil", data);
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return sendError(res, "ID tidak valid", 400);

      const data = await collectionTypeService.getById(id);
      if (!data) return sendError(res, "Tipe koleksi tidak ditemukan", 404);

      return sendSuccess(res, "Tipe koleksi ditemukan", data);
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = createCollectionTypeSchema.safeParse(req.body);
      if (!parsed.success) {
        return sendValidationError(res, parsed.error.flatten());
      }

      const created = await collectionTypeService.create(parsed.data);
      return sendSuccess(res, "Tipe koleksi berhasil ditambahkan", created, 201);
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return sendError(res, "ID tidak valid", 400);

      const parsed = updateCollectionTypeSchema.safeParse(req.body);
      if (!parsed.success) {
        return sendValidationError(res, parsed.error.flatten());
      }

      const updated = await collectionTypeService.update(id, parsed.data);
      if (!updated) return sendError(res, "Tipe koleksi tidak ditemukan", 404);

      return sendSuccess(res, "Tipe koleksi berhasil diperbarui", updated);
    } catch (err) {
      next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return sendError(res, "ID tidak valid", 400);

      const deleted = await collectionTypeService.delete(id);
      if (!deleted) return sendError(res, "Tipe koleksi tidak ditemukan", 404);

      return sendSuccess(res, "Tipe koleksi berhasil dihapus", deleted);
    } catch (err) {
      next(err);
    }
  }

  // Endpoints untuk GMD (Spesifikasi Isi Bahan Pustaka)
  async getGmds(req: Request, res: Response, next: NextFunction) {
    try {
      const list = await collectionTypeService.getAllGmds();
      return sendSuccess(res, "Daftar GMD berhasil diambil", list);
    } catch (err) {
      next(err);
    }
  }

  async createGmd(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = createGmdSchema.safeParse(req.body);
      if (!parsed.success) {
        return sendValidationError(res, parsed.error.flatten());
      }

      try {
        const created = await collectionTypeService.createGmd(parsed.data.name);
        return sendSuccess(res, "GMD berhasil ditambahkan", created, 201);
      } catch (err) {
        if (err instanceof Error && err.message.includes("sudah ada")) {
          return sendError(res, err.message, 409);
        }
        throw err;
      }
    } catch (err) {
      next(err);
    }
  }

  async updateGmd(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return sendError(res, "ID GMD tidak valid", 400);

      const parsed = updateGmdSchema.safeParse(req.body);
      if (!parsed.success) {
        return sendValidationError(res, parsed.error.flatten());
      }

      try {
        const updated = await collectionTypeService.updateGmd(id, parsed.data.name);
        if (!updated) return sendError(res, "Tipe GMD tidak ditemukan", 404);
        return sendSuccess(res, "Tipe GMD berhasil diperbarui", updated);
      } catch (err) {
        if (err instanceof Error && err.message.includes("sudah ada")) {
          return sendError(res, err.message, 409);
        }
        throw err;
      }
    } catch (err) {
      next(err);
    }
  }

  async deleteGmd(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return sendError(res, "ID GMD tidak valid", 400);

      const deleted = await collectionTypeService.deleteGmd(id);
      if (!deleted) return sendError(res, "Tipe GMD tidak ditemukan", 404);

      return sendSuccess(res, "Tipe GMD berhasil dihapus", deleted);
    } catch (err) {
      next(err);
    }
  }
}

export const collectionTypeController = new CollectionTypeController();
