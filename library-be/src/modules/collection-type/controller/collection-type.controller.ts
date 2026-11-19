import { type Request, type Response, type NextFunction } from "express";
import { collectionTypeService } from "../service/collection-type.service";
import {
  createCollectionTypeSchema,
  updateCollectionTypeSchema,
} from "../validation/collection-type.validation";
import { sendSuccess, sendError, sendValidationError } from "../../../utils/api-utils";
import { db } from "../../../db";
import { gmds } from "../../../db/schema";
import { isNull, asc } from "drizzle-orm";

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
      const list = await db.query.gmds.findMany({
        where: isNull(gmds.deletedAt),
        orderBy: [asc(gmds.name)],
      });
      return sendSuccess(res, "Daftar GMD berhasil diambil", list);
    } catch (err) {
      next(err);
    }
  }

  async createGmd(req: Request, res: Response, next: NextFunction) {
    try {
      const name = (req.body?.name || "").trim();
      if (!name) return sendError(res, "Nama GMD wajib diisi", 400);

      const [created] = await db.insert(gmds).values({ name }).returning();
      return sendSuccess(res, "GMD berhasil ditambahkan", created, 201);
    } catch (err) {
      next(err);
    }
  }
}

export const collectionTypeController = new CollectionTypeController();
