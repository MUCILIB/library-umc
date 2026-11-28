/* eslint-disable @typescript-eslint/no-explicit-any */
import { type Request, type Response, type NextFunction } from "express";
import reportService from "../service/report.service";
import { db } from "../../../db";
import { studyPrograms, faculties } from "../../../db/schema";
import { eq } from "drizzle-orm";
import {
  getPopularBooksQuerySchema,
  exportLoansQuerySchema,
  exportFinesQuerySchema,
  finesRevenueSummaryQuerySchema,
  guestStatsQuerySchema,
  webTrafficQuerySchema,
  trackWebTrafficBodySchema
} from "../validation/report.validation";
import { sendValidationError } from "../../../utils/api-utils";

class ReportController {
  private getMonthName(month: number): string {
    const monthNames = [
      "Januari",
      "Februari",
      "Maret",
      "April",
      "Mei",
      "Juni",
      "Juli",
      "Agustus",
      "September",
      "Oktober",
      "November",
      "Desember"
    ];
    return monthNames[month - 1] ?? String(month);
  }

  // GET /reports/dashboard
  async getDashboardStats(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await reportService.getDashboardStats();
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // GET /reports/badges
  async getBadgeCounts(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await reportService.getBadgeCounts();
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // GET /reports/popular-books?limit=10
  async getPopularBooks(req: Request, res: Response, next: NextFunction) {
    try {
      const validation = getPopularBooksQuerySchema.safeParse(req.query);
      if (!validation.success) {
        return sendValidationError(res, validation.error.flatten());
      }

      const limit = validation.data.limit ? Number(validation.data.limit) : 10;
      const result = await reportService.getPopularBooks(limit);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // GET /reports/guest-stats?range=day|week|month
  async getGuestStats(req: Request, res: Response, next: NextFunction) {
    try {
      const validation = guestStatsQuerySchema.safeParse(req.query);
      if (!validation.success) {
        return sendValidationError(res, validation.error.flatten());
      }

      const { range } = validation.data;
      const result = await reportService.getGuestStats(range);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // GET /reports/loans/export?format=csv|pdf&status=approved&from=2025-01-01&to=2025-12-31&studyProgramId=1
  async exportLoans(req: Request, res: Response, next: NextFunction) {
    try {
      const validation = exportLoansQuerySchema.safeParse(req.query);
      if (!validation.success) {
        return sendValidationError(res, validation.error.flatten());
      }

      const { format, delimiter, status, from, to, studyProgramId, facultyId } = validation.data;

      const { data } = await reportService.getLoanReport({
        status,
        from,
        to,
        studyProgramId,
        facultyId
      });

      let subtitle = "Semua Fakultas & Program Studi";
      let scopeSlug = "semua-fakultas";
      if (studyProgramId) {
        const sp = await db.query.studyPrograms.findFirst({
          where: eq(studyPrograms.id, studyProgramId)
        });
        if (sp) {
          subtitle = `Program Studi: ${sp.name}`;
          scopeSlug = `prodi-${sp.name}`;
        }
      } else if (facultyId) {
        const fac = await db.query.faculties.findFirst({
          where: eq(faculties.id, facultyId)
        });
        if (fac) {
          subtitle = `Fakultas: ${fac.name}`;
          scopeSlug = `fakultas-${fac.name}`;
        }
      }

      const rows = data.map((loan) => {
        const bib = (loan as any).item?.bibliography;
        const prodiList = (bib?.bibliographyStudyPrograms ?? [])
          .map((bsp: any) => bsp.studyProgram?.name)
          .filter(Boolean);
        const bibFacList = [
          ...(bib?.bibliographyFaculties ?? []).map((bf: any) => bf.faculty?.name),
          ...(bib?.bibliographyStudyPrograms ?? []).map((bsp: any) => bsp.studyProgram?.faculty?.name)
        ].filter(Boolean);

        const uniqueProdi = [...new Set(prodiList)].join(", ");
        const uniqueBibFac = [...new Set(bibFacList)].join(", ");

        return {
          memberName: (loan as any).member?.user?.name ?? "-",
          memberEmail: (loan as any).member?.user?.email ?? "-",
          faculty: (loan as any).member?.faculty || uniqueBibFac || "-",
          studyProgram: uniqueProdi || "-",
          bookTitle: bib?.title ?? "-",
          ISBN: bib?.isbn ?? bib?.isbnIssn ?? "-",
          status: (loan as any).status,
          borrowDate: (loan as any).createdAt
            ? new Date((loan as any).createdAt).toLocaleDateString("id-ID")
            : "-",
          dueDate: (loan as any).dueDate ?? "-",
          returnDate: (loan as any).returnDate ?? "-"
        };
      });

      const filenameParts = [scopeSlug, status || ""].filter(Boolean);

      if (format === "pdf") {
        const pdfRows = rows.map((r) => ({
          memberName: r.memberName,
          bookTitle: r.bookTitle,
          faculty: r.faculty,
          studyProgram: r.studyProgram,
          status: r.status,
          borrowDate: r.borrowDate,
          dueDate: r.dueDate,
          returnDate: r.returnDate || null
        }));
        return reportService.exportLoansToPDF(
          res,
          pdfRows,
          "Laporan Peminjaman Buku",
          subtitle,
          filenameParts
        );
      }

      // Default: CSV
      return reportService.exportToCSV(
        res,
        `laporan-peminjaman_${scopeSlug}`,
        rows,
        [
          { key: "memberName", header: "Nama Peminjam" },
          { key: "memberEmail", header: "Email" },
          { key: "faculty", header: "Fakultas" },
          { key: "studyProgram", header: "Program Studi" },
          { key: "bookTitle", header: "Judul Buku" },
          { key: "ISBN", header: "ISBN" },
          { key: "status", header: "Status" },
          { key: "borrowDate", header: "Tgl Pinjam" },
          { key: "dueDate", header: "Tgl Jatuh Tempo" },
          { key: "returnDate", header: "Tgl Kembali" }
        ],
        delimiter
      );
    } catch (error) {
      next(error);
    }
  }

  // GET /reports/fines/export?format=csv&status=unpaid
  async exportFines(req: Request, res: Response, next: NextFunction) {
    try {
      const validation = exportFinesQuerySchema.safeParse(req.query);
      if (!validation.success) {
        return sendValidationError(res, validation.error.flatten());
      }

      const { format, delimiter, status, month, year } = validation.data;

      const numericMonth = month ? Number(month) : undefined;
      const numericYear = year ? Number(year) : undefined;
      const isMonthlyRevenueExport =
        status === "paid" && !!numericMonth && !!numericYear;
      const monthLabel = isMonthlyRevenueExport
        ? this.getMonthName(numericMonth)
        : null;

      const finesFilenameParts = isMonthlyRevenueExport
        ? [`pendapatan-bulanan-${monthLabel}-${numericYear}`]
        : status
          ? [status]
          : ["semua-status"];

      const { data } = await reportService.getFinesReportForAudit({
        status,
        month: numericMonth,
        year: numericYear
      });

      const rows = data.map((fine) => ({
        memberName: (fine as any).memberName ?? "-",
        memberEmail: (fine as any).memberEmail ?? "-",
        bookTitle: (fine as any).bookTitle ?? "-",
        amount: `Rp ${Number((fine as any).amount).toLocaleString("id-ID")}`,
        status: (fine as any).status,
        createdAt: (fine as any).fineCreatedAt
          ? new Date((fine as any).fineCreatedAt).toLocaleDateString("id-ID")
          : "-",
        paidAt: (fine as any).paidAt
          ? new Date((fine as any).paidAt).toLocaleDateString("id-ID")
          : "-"
      }));

      if (format === "pdf") {
        const pdfRows = rows.map((r) => ({
          memberName: r.memberName,
          bookTitle: r.bookTitle,
          status: r.status,
          paidAt: r.paidAt !== "-" ? r.paidAt : r.createdAt,
          amount: r.amount
        }));
        return reportService.exportFinesToPDF(
          res,
          pdfRows,
          isMonthlyRevenueExport
            ? `Laporan Pendapatan Denda Bulanan ${monthLabel} ${numericYear}`
            : "Laporan Denda Peminjaman",
          "laporan-denda",
          finesFilenameParts
        );
      }

      return reportService.exportToCSV(res, `laporan-denda_${finesFilenameParts.join("_")}`, rows, [
        { key: "memberName", header: "Nama Member" },
        { key: "memberEmail", header: "Email" },
        { key: "bookTitle", header: "Judul Buku" },
        { key: "amount", header: "Jumlah Denda" },
        { key: "status", header: "Status Denda" },
        { key: "createdAt", header: "Tgl Denda Dibuat" },
        { key: "paidAt", header: "Tgl Pembayaran" }
      ], delimiter);
    } catch (error) {
      next(error);
    }
  }

  // GET /reports/fines/revenue?month=3&year=2026
  async getFinesRevenueSummary(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const validation = finesRevenueSummaryQuerySchema.safeParse(req.query);
      if (!validation.success) {
        return sendValidationError(res, validation.error.flatten());
      }

      const { month, year } = validation.data;
      const result = await reportService.getFinesRevenueSummary({
        month: month ? Number(month) : undefined,
        year: year ? Number(year) : undefined
      });

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // GET /reports/visitor-analytics
  async getVisitorAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const range = (req.query.range as "day" | "week" | "month" | "custom") || "week";
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      const result = await reportService.getVisitorAnalytics({
        range,
        startDate,
        endDate
      });

      return res.status(200).json({
        success: true,
        message: "Data analitik pengunjung berhasil diambil",
        data: result.data
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /reports/web-traffic?days=30
  async getWebTraffic(req: Request, res: Response, next: NextFunction) {
    try {
      const validation = webTrafficQuerySchema.safeParse(req.query);
      if (!validation.success) {
        return sendValidationError(res, validation.error.flatten());
      }

      const days = validation.data.days ? Number(validation.data.days) : 30;
      const result = await reportService.getWebTrafficSummary(days);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // POST /reports/web-traffic/track
  async trackWebTraffic(req: Request, res: Response, next: NextFunction) {
    try {
      const validation = trackWebTrafficBodySchema.safeParse(req.body);
      if (!validation.success) {
        return sendValidationError(res, validation.error.flatten());
      }

      const forwarded = req.headers["x-forwarded-for"];
      const forwardedIp = Array.isArray(forwarded)
        ? forwarded[0]
        : forwarded?.split(",")[0]?.trim();
      const ipAddress = forwardedIp || req.ip || null;
      const userAgent = req.headers["user-agent"] || null;

      await reportService.trackWebTraffic({
        path: validation.data.path,
        ipAddress,
        userAgent
      });

      res.status(201).json({ success: true, message: "Traffic tracked" });
    } catch (error) {
      next(error);
    }
  }
}

export default new ReportController();
