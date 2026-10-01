import { type Request, type Response, type NextFunction } from "express";
import { exportService, type ExportFilter } from "../service/export.service";

function parseFilter(query: Request["query"]): ExportFilter {
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
    facultyId: parseNum(query.facultyId),
    studyProgramId: parseNum(query.studyProgramId),
    categoryId: parseNum(query.categoryId),
    subject: parseStr(query.subject),
    status: parseStr(query.status),
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
      const { status, startDate, endDate, loanDateFrom, loanDateTo, faculty, search } = req.query as Record<string, string>;
      const csv = await exportService.exportLoans({
        status,
        startDate: startDate || loanDateFrom,
        endDate: endDate || loanDateTo,
        faculty,
        search,
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
