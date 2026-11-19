import { type Request, type Response, type NextFunction } from "express";
import { exportService, type ExportFilter } from "../service/export.service";
import { BadRequestError } from "../../../exceptions/AppError";

function parseFilter(query: Request["query"]): ExportFilter {
  if (query.format !== undefined && query.format !== "library" && query.format !== "slims") {
    throw new BadRequestError("format must be library or slims");
  }
  const parseNum = (val: unknown) => {
    if (val === undefined || val === null || val === "") return undefined;
    const n = Number(val);
    return isNaN(n) ? undefined : n;
  };
  const parseStr = (val: unknown) => {
    if (typeof val !== "string") return undefined;
    const s = val.trim();
    return s.length > 0 ? s : undefined;
  };

  return {
    format: query.format === "slims" ? "slims" : "library",
    facultyId: parseNum(query.facultyId),
    studyProgramId: parseNum(query.studyProgramId),
    categoryId: parseNum(query.categoryId),
    subject: parseStr(query.subject),
    status: parseStr(query.status),
    delimiter: query.delimiter === "," ? "," : ";",
  };
}

export class ExportController {
  async exportBibliographies(req: Request, res: Response, next: NextFunction) {
    try {
      const filter = parseFilter(req.query);
      const csv = await exportService.exportBibliographies(filter);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="bibliographies_export.csv"');
      res.send(csv);
    } catch (error) { next(error); }
  }

  async exportBibliographiesPdf(req: Request, res: Response, next: NextFunction) {
    try {
      const filter = parseFilter(req.query);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", 'attachment; filename="katalog_koleksi_umc.pdf"');
      await exportService.exportBibliographiesPdf(res, filter);
    } catch (error) { next(error); }
  }

  async exportItems(req: Request, res: Response, next: NextFunction) {
    try {
      const filter = parseFilter(req.query);
      const csv = await exportService.exportItems(filter);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="items_export.csv"');
      res.send(csv);
    } catch (error) { next(error); }
  }

  async exportGuests(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate, dateFrom, dateTo, faculty, major, studyProgram, search } = req.query as Record<string, string>;
      const csv = await exportService.exportGuests({
        startDate: startDate || dateFrom,
        endDate: endDate || dateTo,
        faculty,
        major: major || studyProgram,
        search,
      });
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="guests_export.csv"');
      res.send(csv);
    } catch (error) { next(error); }
  }

  async exportLoans(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, startDate, endDate, loanDateFrom, loanDateTo, faculty, search, delimiter } = req.query as Record<string, string>;
      const studyProgramId = req.query.studyProgramId ? Number(req.query.studyProgramId) : undefined;
      const facultyId = req.query.facultyId ? Number(req.query.facultyId) : undefined;
      const csv = await exportService.exportLoans({
        status,
        startDate: startDate || loanDateFrom,
        endDate: endDate || loanDateTo,
        faculty,
        search,
        studyProgramId: isNaN(studyProgramId!) ? undefined : studyProgramId,
        facultyId: isNaN(facultyId!) ? undefined : facultyId,
        delimiter: delimiter === "," ? "," : ";",
      });
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="loans_export.csv"');
      res.send(csv);
    } catch (error) { next(error); }
  }

  async exportUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const { role, faculty, banned, search } = req.query as Record<string, string>;
      const csv = await exportService.exportUsers({
        role,
        faculty,
        banned: banned === "true" ? true : banned === "false" ? false : undefined,
        search,
      });
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="users_export.csv"');
      res.send(csv);
    } catch (error) { next(error); }
  }
}

export const exportController = new ExportController();
