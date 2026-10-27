import { type Request, type Response, type NextFunction } from "express";
import { ebookService } from "../service/ebook.service";
import {
  createEbookSchema,
  updateEbookSchema,
  queryEbookSchema
} from "../validation/ebook.validation";
import { sendSuccess, sendValidationError } from "../../../utils/api-utils";
import { getSession } from "../../../utils/auth-utils";

export class EbookController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = createEbookSchema.safeParse(req.body);
      if (!parsed.success) {
        return sendValidationError(res, parsed.error.flatten());
      }

      const file = req.file;
      const result = await ebookService.create(parsed.data, file);
      return sendSuccess(res, "E-Book berhasil ditambahkan", result, 201);
    } catch (error) {
      next(error);
    }
  }

  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = queryEbookSchema.safeParse(req.query);
      if (!parsed.success) {
        return sendValidationError(res, parsed.error.flatten());
      }

      const result = await ebookService.getAll(parsed.data);
      res.status(200).json({
        success: true,
        message: "Daftar e-book berhasil diambil",
        data: result.data,
        meta: result.meta
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const result = await ebookService.getById(id);
      return sendSuccess(res, "Detail e-book berhasil diambil", result, 200);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const parsed = updateEbookSchema.safeParse(req.body);
      if (!parsed.success) {
        return sendValidationError(res, parsed.error.flatten());
      }

      const file = req.file;
      const result = await ebookService.update(id, parsed.data, file);
      return sendSuccess(res, "E-Book berhasil diperbarui", result, 200);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const result = await ebookService.delete(id);
      return sendSuccess(res, "E-Book berhasil dihapus", result, 200);
    } catch (error) {
      next(error);
    }
  }

  async streamPdf(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const isPublicPreview =
        req.query?.preview === "public" ||
        req.query?.mode === "public" ||
        req.query?.forcePublic === "true";

      // Cek sesi login requester (optional auth)
      const session = (req as any).user
        ? { user: (req as any).user }
        : await getSession(req).catch(() => null);

      const user = session?.user;
      const requester = {
        userId: user?.id,
        role: ((user as any)?.role || "public"),
        email: user?.email
      };

      const result = await ebookService.getStreamPdf(id, requester, {
        forcePublicPreview: isPublicPreview
      });

      const wantsDownload =
        req.query?.download === "true" || req.query?.mode === "download";

      res.setHeader("Content-Type", "application/pdf");
      const disposition = wantsDownload && result.allowDownload ? "attachment" : "inline";
      const sanitizedTitle = result.title.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 50);
      res.setHeader(
        "Content-Disposition",
        `${disposition}; filename="ebook-${sanitizedTitle}-${id.slice(0, 8)}.pdf"`
      );
      res.setHeader("X-Total-Document-Pages", result.totalDocumentPages.toString());
      res.setHeader("X-Preview-Start-Page", result.startPage.toString());
      res.setHeader("X-Preview-End-Page", result.endPage.toString());
      res.setHeader("X-Is-Restricted", result.isRestricted ? "true" : "false");
      res.setHeader("X-Allow-Download", result.allowDownload ? "true" : "false");

      res.status(200).send(result.buffer);
    } catch (error) {
      next(error);
    }
  }
}

export const ebookController = new EbookController();
