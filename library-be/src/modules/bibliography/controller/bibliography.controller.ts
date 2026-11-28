import { type Request, type Response, type NextFunction } from "express";
import { bibliographyService } from "../service/bibliography.service";
import {
  createBibliographySchema,
  updateBibliographySchema,
  bibliographyQuerySchema,
  checkDuplicateSchema,
  bookLabelsPdfQuerySchema,
} from "../validation/bibliography.validation";
import { streamBookLabelsPdf } from "../service/book-label-pdf.service";
import { sendSuccess, sendError, sendValidationError } from "../../../utils/api-utils";
import auditService from "../../audit/service/audit.service";

export class BibliographyController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const validation = bibliographyQuerySchema.safeParse(req.query);
      if (!validation.success) {
        return sendValidationError(res, validation.error.flatten());
      }
      const result = await bibliographyService.list(validation.data);
      sendSuccess(res, "Bibliographies retrieved", result);
    } catch (error) { next(error); }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const bib = await bibliographyService.getById(id);
      if (!bib) return sendError(res, "Bibliography not found", 404);
      sendSuccess(res, "Bibliography retrieved", bib);
    } catch (error) { next(error); }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const validation = createBibliographySchema.safeParse(req.body);
      if (!validation.success) {
        return sendValidationError(res, validation.error.flatten());
      }
      const bib = await bibliographyService.create(validation.data);
      await auditService.createLog({
        action: "create", entity: "bibliography", entityId: bib?.id,
        userId: (req as any).user?.id, ipAddress: req.ip,
      });
      sendSuccess(res, "Bibliography created", bib, 201);
    } catch (error) { next(error); }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const existing = await bibliographyService.getById(id);
      if (!existing) return sendError(res, "Bibliography not found", 404);

      const validation = updateBibliographySchema.safeParse(req.body);
      if (!validation.success) {
        return sendValidationError(res, validation.error.flatten());
      }
      const bib = await bibliographyService.update(id, validation.data);
      await auditService.createLog({
        action: "update", entity: "bibliography", entityId: id,
        userId: (req as any).user?.id, ipAddress: req.ip,
      });
      sendSuccess(res, "Bibliography updated", bib);
    } catch (error) { next(error); }
  }

  async checkDuplicate(req: Request, res: Response, next: NextFunction) {
    try {
      const validation = checkDuplicateSchema.safeParse(req.query);
      if (!validation.success) {
        return sendValidationError(res, validation.error.flatten());
      }
      const result = await bibliographyService.checkDuplicate(validation.data);
      sendSuccess(res, "Duplicate check completed", result);
    } catch (error) { next(error); }
  }

  async softDelete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const existing = await bibliographyService.getById(id);
      if (!existing) return sendError(res, "Bibliography not found", 404);

      await bibliographyService.softDelete(id);
      await auditService.createLog({
        action: "delete", entity: "bibliography", entityId: id,
        userId: (req as any).user?.id, ipAddress: req.ip,
      });
      sendSuccess(res, "Bibliography deleted", null);
    } catch (error) { next(error); }
  }

  async getItems(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const bib = await bibliographyService.getById(id);
      if (!bib) return sendError(res, "Bibliography not found", 404);
      const bibItems = await bibliographyService.getItemsForBibliography(id);
      sendSuccess(res, "Items retrieved", bibItems);
    } catch (error) { next(error); }
  }

  async exportLabelsPdf(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const validation = bookLabelsPdfQuerySchema.safeParse(req.query);
      if (!validation.success) {
        return sendValidationError(res, validation.error.flatten());
      }

      const bib = await bibliographyService.getById(id);
      if (!bib) return sendError(res, "Bibliography not found", 404);

      const selectedIds = (validation.data.itemIds || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const allItems = bib.items || [];
      const itemsToPrint =
        selectedIds.length > 0
          ? allItems.filter((item: any) => selectedIds.includes(item.id))
          : allItems;

      if (itemsToPrint.length === 0) {
        return sendError(
          res,
          "Tidak ada eksemplar fisik yang dapat dicetak pada bibliografi ini",
          400
        );
      }

      streamBookLabelsPdf(
        res,
        {
          id: bib.id,
          title: bib.title,
          classification: bib.classification,
          callNumber: bib.callNumber,
          unlistedAuthorsLabel: bib.unlistedAuthorsLabel,
          authors: bib.authors,
          items: allItems,
        },
        itemsToPrint,
        validation.data.perPage
      );
    } catch (error) {
      next(error);
    }
  }

  async deduplicate(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await bibliographyService.deduplicateBibliographies();
      await auditService.createLog({
        action: "update",
        entity: "bibliography",
        entityId: "batch-deduplicate",
        userId: (req as any).user?.id,
        ipAddress: req.ip,
      });
      sendSuccess(res, "Deduplikasi bibliografi berhasil dijalankan", result);
    } catch (error) { next(error); }
  }
}

export const bibliographyController = new BibliographyController();
