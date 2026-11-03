import { type Request, type Response, type NextFunction } from "express";
import { importService } from "../service/import.service";
import { sendSuccess, sendError } from "../../../utils/api-utils";

const isUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

export class ImportController {
  async uploadBibliography(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) return sendError(res, "No file uploaded", 400);
      const content = req.file.buffer.toString("utf-8");
      const batch = await importService.createBatch("bibliography", req.file.originalname, (req as any).user.id, content);
      sendSuccess(res, "File uploaded", { batchId: batch.id, filename: batch.filename }, 201);
    } catch (error) { next(error); }
  }

  async uploadItem(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) return sendError(res, "No file uploaded", 400);
      const content = req.file.buffer.toString("utf-8");
      const batch = await importService.createBatch("item", req.file.originalname, (req as any).user.id, content);
      sendSuccess(res, "File uploaded", { batchId: batch.id, filename: batch.filename }, 201);
    } catch (error) { next(error); }
  }

  async parseBatch(req: Request, res: Response, next: NextFunction) {
    try {
      const batchId = req.params.batchId as string;
      if (!isUuid(batchId)) return sendError(res, "Batch not found", 404);
      const result = await importService.parseBatch(batchId);
      sendSuccess(res, "Batch parsed and validated", result);
    } catch (error) { next(error); }
  }

  async validateBatch(req: Request, res: Response, next: NextFunction) {
    try {
      const batchId = req.params.batchId as string;
      if (!isUuid(batchId)) return sendError(res, "Batch not found", 404);
      const result = await importService.validateBatch(batchId);
      sendSuccess(res, "Batch validated", result);
    } catch (error) { next(error); }
  }

  async previewBatch(req: Request, res: Response, next: NextFunction) {
    try {
      const batchId = req.params.batchId as string;
      if (!isUuid(batchId)) return sendError(res, "Batch not found", 404);
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const result = await importService.previewBatch(batchId, limit);
      sendSuccess(res, "Preview retrieved", result);
    } catch (error) { next(error); }
  }

  async approveBatch(req: Request, res: Response, next: NextFunction) {
    try {
      const batchId = req.params.batchId as string;
      if (!isUuid(batchId)) return sendError(res, "Batch not found", 404);
      const result = await importService.approveBatch(batchId, (req as any).user.id);
      sendSuccess(res, "Batch committed", result);
    } catch (error) { next(error); }
  }

  async cancelBatch(req: Request, res: Response, next: NextFunction) {
    try {
      const batchId = req.params.batchId as string;
      if (!isUuid(batchId)) return sendError(res, "Batch not found", 404);
      const result = await importService.cancelBatch(batchId);
      sendSuccess(res, "Batch cancelled", result);
    } catch (error) { next(error); }
  }

  async getErrors(req: Request, res: Response, next: NextFunction) {
    try {
      const batchId = req.params.batchId as string;
      if (!isUuid(batchId)) return sendError(res, "Batch not found", 404);
      const errors = await importService.getErrors(batchId);
      sendSuccess(res, "Errors retrieved", errors);
    } catch (error) { next(error); }
  }

  async downloadErrorsCsv(req: Request, res: Response, next: NextFunction) {
    try {
      const batchId = req.params.batchId as string;
      if (!isUuid(batchId)) return sendError(res, "Batch not found", 404);
      const errors = await importService.getErrors(batchId);
      const header = "row_number,errors,raw_data";
      const csvRows = errors.map((r: any) => {
        const errs = Array.isArray(r.errors) ? r.errors.join("; ") : String(r.errors);
        const rawJson = JSON.stringify(r.rawData).replace(/"/g, '""');
        return `${r.rowNumber},"${errs.replace(/"/g, '""')}","${rawJson}"`;
      });
      const csv = [header, ...csvRows].join("\n");
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="errors-${batchId}.csv"`);
      res.send("\uFEFF" + csv);
    } catch (error) { next(error); }
  }

  async listBatches(req: Request, res: Response, next: NextFunction) {
    try {
      const batches = await importService.listBatches();
      sendSuccess(res, "Batches retrieved", batches);
    } catch (error) { next(error); }
  }

  async getBatch(req: Request, res: Response, next: NextFunction) {
    try {
      const batchId = req.params.batchId as string;
      if (!isUuid(batchId)) return sendError(res, "Batch not found", 404);
      const batch = await importService.getBatch(batchId);
      if (!batch) return sendError(res, "Batch not found", 404);
      sendSuccess(res, "Batch retrieved", batch);
    } catch (error) { next(error); }
  }

  async downloadTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const rawModule = req.params.module;
      const mod = Array.isArray(rawModule) ? rawModule[0] : String(rawModule || "");
      const result = importService.getTemplate(mod);
      if (!result) {
        return sendError(
          res,
          `Template untuk modul '${mod}' tidak ditemukan. Modul yang tersedia: guests, users, loans, bibliographies, items`,
          400
        );
      }
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
      res.send(result.csv);
    } catch (error) { next(error); }
  }

  async importGuests(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) return sendError(res, "File CSV wajib diunggah", 400);
      const content = req.file.buffer.toString("utf-8");
      const result = await importService.importGuests(content);
      sendSuccess(res, `Import pengunjung selesai: ${result.successCount} berhasil, ${result.errorCount} gagal`, result);
    } catch (error) { next(error); }
  }

  async importUsers(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) return sendError(res, "File CSV wajib diunggah", 400);
      const content = req.file.buffer.toString("utf-8");
      const result = await importService.importUsers(content);
      sendSuccess(res, `Import user selesai: ${result.successCount} berhasil, ${result.errorCount} gagal`, result);
    } catch (error) { next(error); }
  }

  async importLoans(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) return sendError(res, "File CSV wajib diunggah", 400);
      const content = req.file.buffer.toString("utf-8");
      const result = await importService.importLoans(content);
      sendSuccess(res, `Import peminjaman selesai: ${result.successCount} berhasil, ${result.errorCount} gagal`, result);
    } catch (error) { next(error); }
  }
}

export const importController = new ImportController();
