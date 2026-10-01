import { db } from "../../../db";
import {
  bibliographies,
  items,
  loans,
  members,
  fines,
  transactions,
  guestLogs,
  reservations,
  Users,
  webTraffic,
  studyPrograms
} from "../../../db/schema";
import { eq, sql, and, desc, isNull } from "drizzle-orm";
import PDFDocument from "pdfkit";
import { type Response } from "express";

export class ReportService {
  private getDatePrefix(): string {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, "0");
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const yyyy = String(now.getFullYear());
    return `${dd}-${mm}-${yyyy}`;
  }

  async trackWebTraffic(payload: {
    path: string;
    ipAddress?: string | null;
    userAgent?: string | null;
    userId?: string | null;
  }) {
    try {
      await db.insert(webTraffic).values({
        id: crypto.randomUUID(),
        ipAddress: payload.ipAddress ?? null,
        userAgent: payload.userAgent ?? null,
        userId: payload.userId ?? null,
        pageVisited: payload.path,
        visitTimestamp: new Date()
      });

      return { success: true };
    } catch (error) {
      console.error("[ReportService] trackWebTraffic error:", error);
      throw error;
    }
  }

  async getWebTrafficSummary(days = 30) {
    try {
      const safeDays = Math.max(1, Math.min(days, 90));
      const startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      startDate.setDate(startDate.getDate() - (safeDays - 1));

      const rows = await db.execute(sql<{
        date: string;
        page_views: string | number;
        unique_visitors: string | number;
        sessions: string | number;
      }>`
        SELECT
          TO_CHAR(DATE(${webTraffic.visitTimestamp}), 'YYYY-MM-DD') AS date,
          COUNT(*)::int AS page_views,
          COUNT(DISTINCT COALESCE(${webTraffic.userId}, ${webTraffic.ipAddress}, 'unknown'))::int AS unique_visitors,
          COUNT(DISTINCT CONCAT(
            COALESCE(${webTraffic.userId}, ${webTraffic.ipAddress}, 'unknown'),
            '|',
            COALESCE(${webTraffic.userAgent}, 'unknown'),
            '|',
            TO_CHAR(DATE_TRUNC('hour', ${webTraffic.visitTimestamp}), 'YYYY-MM-DD HH24')
          ))::int AS sessions
        FROM ${webTraffic}
        WHERE ${webTraffic.visitTimestamp} >= ${startDate}
        GROUP BY DATE(${webTraffic.visitTimestamp})
        ORDER BY DATE(${webTraffic.visitTimestamp}) ASC
      `);

      const aggregateMap = new Map(
        rows.rows.map((row) => [
          row.date,
          {
            pageViews: Number(row.page_views) || 0,
            uniqueVisitors: Number(row.unique_visitors) || 0,
            sessions: Number(row.sessions) || 0
          }
        ])
      );

      const daily = Array.from({ length: safeDays }, (_, index) => {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() - (safeDays - 1 - index));
        const key = date.toISOString().slice(0, 10);
        const stat = aggregateMap.get(key) ?? {
          pageViews: 0,
          uniqueVisitors: 0,
          sessions: 0
        };

        return {
          date: key,
          pageViews: stat.pageViews,
          uniqueVisitors: stat.uniqueVisitors,
          sessions: stat.sessions
        };
      });

      const summary = daily.reduce(
        (acc, item, index) => {
          acc.totalPageViews += item.pageViews;
          acc.totalUniqueVisitors += item.uniqueVisitors;
          acc.totalSessions += item.sessions;

          if (index === daily.length - 1) {
            acc.todayPageViews = item.pageViews;
            acc.todayUniqueVisitors = item.uniqueVisitors;
            acc.todaySessions = item.sessions;
          }

          return acc;
        },
        {
          todayPageViews: 0,
          todayUniqueVisitors: 0,
          todaySessions: 0,
          totalPageViews: 0,
          totalUniqueVisitors: 0,
          totalSessions: 0
        }
      );

      return {
        success: true,
        data: {
          days: safeDays,
          daily,
          summary
        }
      };
    } catch (error) {
      console.error("[ReportService] getWebTrafficSummary error:", error);
      throw error;
    }
  }

  private buildExportFilename(reportName: string, extension: "csv" | "pdf") {
    return `${this.getDatePrefix()}_${reportName}.${extension}`;
  }

  /**
   * Get main dashboard statistics summary
   */
  async getDashboardStats() {
    try {
    const [totalBibliographies] = await db
      .select({ count: sql<number>`count(*)` })
      .from(bibliographies)
      .where(isNull(bibliographies.deletedAt));

      const [totalItems] = await db
        .select({ count: sql<number>`count(*)` })
        .from(items)
        .where(isNull(items.deletedAt));

      const [activeLoans] = await db
        .select({ count: sql<number>`count(*)` })
        .from(loans)
        .where(sql`${loans.status} IN ('approved', 'pending')`);

      const [overdueLoans] = await db
        .select({ count: sql<number>`count(*)` })
        .from(loans)
        .where(
          and(
            eq(loans.status, "approved"),
            sql`${loans.dueDate} < CURRENT_DATE`
          )
        );

      const [totalMembers] = await db
        .select({ count: sql<number>`count(*)` })
        .from(members);

      const [unpaidFines] = await db
        .select({ total: sql<number>`COALESCE(SUM(amount::numeric), 0)` })
        .from(fines)
        .where(eq(fines.status, "unpaid"));

      const [waitingReservations] = await db
        .select({ count: sql<number>`count(*)` })
        .from(reservations)
        .where(
          and(
            eq(reservations.status, "waiting"),
            isNull(reservations.deletedAt)
          )
        );

      return {
        success: true,
        data: {
          totalCollections: Number(totalBibliographies.count),
          totalItems: Number(totalItems.count),
          activeLoans: Number(activeLoans.count),
          overdueLoans: Number(overdueLoans.count),
          totalMembers: Number(totalMembers.count),
          unpaidFinesTotal: Number(unpaidFines.total),
          waitingReservations: Number(waitingReservations.count)
        }
      };
    } catch (error) {
      console.error("[ReportService] getDashboardStats error:", error);
      throw error;
    }
  }

  /**
   * Get top most borrowed books
   */
  async getPopularBooks(limit = 10) {
    try {
      const result = await db
        .select({
          id: bibliographies.id,
          title: bibliographies.title,
          author: bibliographies.sor,
          image: bibliographies.image,
          loanCount: sql<number>`count(${loans.id})`
        })
        .from(bibliographies)
        .innerJoin(items, eq(items.bibliographyId, bibliographies.id))
        .innerJoin(loans, eq(loans.itemId, items.id))
        .where(isNull(bibliographies.deletedAt))
        .groupBy(bibliographies.id)
        .orderBy(desc(sql`count(${loans.id})`))
        .limit(limit);

      return { success: true, data: result };
    } catch (error) {
      console.error("[ReportService] getPopularBooks error:", error);
      throw error;
    }
  }

  /**
   * Get comparative visitor analytics: Physical (guest_logs) vs Web Traffic (web_traffic)
   */
  async getVisitorAnalytics(query: {
    range?: "day" | "week" | "month" | "custom";
    startDate?: string;
    endDate?: string;
  }) {
    try {
      const range = query.range || "week";
      let start: Date;
      let end: Date = new Date();
      end.setHours(23, 59, 59, 999);

      if (range === "day") {
        start = new Date();
        start.setHours(0, 0, 0, 0);
      } else if (range === "month") {
        start = new Date();
        start.setDate(start.getDate() - 29);
        start.setHours(0, 0, 0, 0);
      } else if (range === "custom" && query.startDate && query.endDate) {
        start = new Date(query.startDate);
        start.setHours(0, 0, 0, 0);
        end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
      } else {
        // week default (last 7 days)
        start = new Date();
        start.setDate(start.getDate() - 6);
        start.setHours(0, 0, 0, 0);
      }

      // 1. Physical visits aggregated
      const physicalRaw = range === "day"
        ? await db
            .select({
              timeKey: sql<string>`TO_CHAR(DATE_TRUNC('hour', ${guestLogs.visitDate}), 'HH24:00')`,
              count: sql<number>`count(*)::int`
            })
            .from(guestLogs)
            .where(
              and(
                sql`${guestLogs.visitDate} >= ${start} AND ${guestLogs.visitDate} <= ${end}`,
                isNull(guestLogs.deletedAt)
              )
            )
            .groupBy(sql`DATE_TRUNC('hour', ${guestLogs.visitDate})`)
            .orderBy(sql`DATE_TRUNC('hour', ${guestLogs.visitDate})`)
        : await db
            .select({
              timeKey: sql<string>`TO_CHAR(DATE(${guestLogs.visitDate}), 'YYYY-MM-DD')`,
              count: sql<number>`count(*)::int`
            })
            .from(guestLogs)
            .where(
              and(
                sql`${guestLogs.visitDate} >= ${start} AND ${guestLogs.visitDate} <= ${end}`,
                isNull(guestLogs.deletedAt)
              )
            )
            .groupBy(sql`DATE(${guestLogs.visitDate})`)
            .orderBy(sql`DATE(${guestLogs.visitDate})`);

      // 2. Web traffic visits aggregated (unique visitors)
      const webRaw = range === "day"
        ? await db
            .select({
              timeKey: sql<string>`TO_CHAR(DATE_TRUNC('hour', ${webTraffic.visitTimestamp}), 'HH24:00')`,
              count: sql<number>`COUNT(DISTINCT COALESCE(${webTraffic.userId}, ${webTraffic.ipAddress}, 'unknown'))::int`
            })
            .from(webTraffic)
            .where(
              sql`${webTraffic.visitTimestamp} >= ${start} AND ${webTraffic.visitTimestamp} <= ${end}`
            )
            .groupBy(sql`DATE_TRUNC('hour', ${webTraffic.visitTimestamp})`)
            .orderBy(sql`DATE_TRUNC('hour', ${webTraffic.visitTimestamp})`)
        : await db
            .select({
              timeKey: sql<string>`TO_CHAR(DATE(${webTraffic.visitTimestamp}), 'YYYY-MM-DD')`,
              count: sql<number>`COUNT(DISTINCT COALESCE(${webTraffic.userId}, ${webTraffic.ipAddress}, 'unknown'))::int`
            })
            .from(webTraffic)
            .where(
              sql`${webTraffic.visitTimestamp} >= ${start} AND ${webTraffic.visitTimestamp} <= ${end}`
            )
            .groupBy(sql`DATE(${webTraffic.visitTimestamp})`)
            .orderBy(sql`DATE(${webTraffic.visitTimestamp})`);

      // 3. Physical visits breakdown by Study Program & Faculty
      const prodiBreakdown = await db
        .select({
          studyProgramName: sql<string>`COALESCE(${studyPrograms.name}, ${guestLogs.major}, 'Umum / Lainnya')`,
          count: sql<number>`count(*)::int`
        })
        .from(guestLogs)
        .leftJoin(studyPrograms, eq(guestLogs.studyProgramId, studyPrograms.id))
        .where(
          and(
            sql`${guestLogs.visitDate} >= ${start} AND ${guestLogs.visitDate} <= ${end}`,
            isNull(guestLogs.deletedAt)
          )
        )
        .groupBy(sql`COALESCE(${studyPrograms.name}, ${guestLogs.major}, 'Umum / Lainnya')`)
        .orderBy(desc(sql`count(*)`))
        .limit(10);

      // Build unified timeline
      const physicalMap = new Map(physicalRaw.map(r => [r.timeKey, Number(r.count) || 0]));
      const webMap = new Map(webRaw.map(r => [r.timeKey, Number(r.count) || 0]));

      const timeline: { label: string; key: string; physical: number; web: number; total: number }[] = [];

      if (range === "day") {
        for (let h = 0; h < 24; h++) {
          const key = `${String(h).padStart(2, "0")}:00`;
          const p = physicalMap.get(key) || 0;
          const w = webMap.get(key) || 0;
          timeline.push({ label: key, key, physical: p, web: w, total: p + w });
        }
      } else {
        const cur = new Date(start);
        while (cur <= end) {
          const yyyy = cur.getFullYear();
          const mm = String(cur.getMonth() + 1).padStart(2, "0");
          const dd = String(cur.getDate()).padStart(2, "0");
          const key = `${yyyy}-${mm}-${dd}`;
          const p = physicalMap.get(key) || 0;
          const w = webMap.get(key) || 0;
          timeline.push({
            label: `${cur.getDate()}/${cur.getMonth() + 1}`,
            key,
            physical: p,
            web: w,
            total: p + w
          });
          cur.setDate(cur.getDate() + 1);
        }
      }

      const totalPhysical = timeline.reduce((acc, t) => acc + t.physical, 0);
      const totalWeb = timeline.reduce((acc, t) => acc + t.web, 0);

      return {
        success: true,
        data: {
          range,
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          summary: {
            totalPhysical,
            totalWeb,
            combinedTotal: totalPhysical + totalWeb,
            physicalPercentage: totalPhysical + totalWeb > 0 ? Math.round((totalPhysical / (totalPhysical + totalWeb)) * 100) : 0,
            webPercentage: totalPhysical + totalWeb > 0 ? Math.round((totalWeb / (totalPhysical + totalWeb)) * 100) : 0
          },
          timeline,
          studyProgramDistribution: prodiBreakdown
        }
      };
    } catch (error) {
      console.error("[ReportService] getVisitorAnalytics error:", error);
      throw error;
    }
  }

  /**
   * Get guest visit statistics with configurable range
   * @param range - "day" (per hour, today), "week" (per day, 7 days), "month" (per day, 30 days)
   */
  async getGuestStats(range: "day" | "week" | "month" = "week") {
    try {
      if (range === "day") {
        const result = await db
          .select({
            date: sql<string>`TO_CHAR(DATE_TRUNC('hour', ${guestLogs.visitDate}), 'HH24:00')`,
            count: sql<number>`count(*)::int`
          })
          .from(guestLogs)
          .where(
            and(
              sql`DATE(${guestLogs.visitDate}) = CURRENT_DATE`,
              isNull(guestLogs.deletedAt)
            )
          )
          .groupBy(sql`DATE_TRUNC('hour', ${guestLogs.visitDate})`)
          .orderBy(sql`DATE_TRUNC('hour', ${guestLogs.visitDate})`);

        return { success: true, data: result };
      }

      const intervalCondition = range === "month"
        ? sql`${guestLogs.visitDate} >= CURRENT_DATE - INTERVAL '30 days'`
        : sql`${guestLogs.visitDate} >= CURRENT_DATE - INTERVAL '7 days'`;

      const result = await db
        .select({
          date: sql<string>`TO_CHAR(DATE(${guestLogs.visitDate}), 'YYYY-MM-DD')`,
          count: sql<number>`count(*)::int`
        })
        .from(guestLogs)
        .where(
          and(
            intervalCondition,
            isNull(guestLogs.deletedAt)
          )
        )
        .groupBy(sql`DATE(${guestLogs.visitDate})`)
        .orderBy(sql`DATE(${guestLogs.visitDate})`);

      return { success: true, data: result };
    } catch (error) {
      console.error("[ReportService] getGuestStats error:", error);
      throw error;
    }
  }

  /**
   * Get detailed loan report (for export)
   */
  async getLoanReport(
    filters: { status?: string; from?: string; to?: string } = {}
  ) {
    try {
      const conditions = [];
      if (filters.status) {
        conditions.push(sql`${loans.status} = ${filters.status}`);
      }
      if (filters.from) {
        conditions.push(sql`${loans.createdAt} >= ${filters.from}::date`);
      }
      if (filters.to) {
        conditions.push(
          sql`${loans.createdAt} <= ${filters.to}::date + INTERVAL '1 day'`
        );
      }

      const result = await db.query.loans.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        with: {
          member: { with: { user: true } },
          item: { with: { bibliography: true } }
        },
        orderBy: [desc(loans.createdAt)]
      });

      return { success: true, data: result };
    } catch (error) {
      console.error("[ReportService] getLoanReport error:", error);
      throw error;
    }
  }

  /**
   * Get fines report (for export)
   */
  async getFinesReport(filters: { status?: string } = {}) {
    try {
      const conditions = [isNull(fines.deletedAt)];
      if (filters.status) {
        conditions.push(sql`${fines.status} = ${filters.status}`);
      }

      const result = await db
        .select({
          id: fines.id,
          amount: fines.amount,
          status: fines.status,
          fineCreatedAt: fines.createdAt,
          paidAt: transactions.paidAt,
          memberName: Users.name,
          memberEmail: Users.email,
          bookTitle: bibliographies.title
        })
        .from(fines)
        .leftJoin(loans, eq(fines.loanId, loans.id))
        .leftJoin(members, eq(loans.memberId, members.id))
        .leftJoin(Users, eq(members.userId, Users.id))
        .leftJoin(items, eq(loans.itemId, items.id))
        .leftJoin(bibliographies, eq(items.bibliographyId, bibliographies.id))
        .leftJoin(transactions, eq(transactions.fineId, fines.id))
        .where(and(...conditions))
        .orderBy(desc(fines.createdAt));

      return { success: true, data: result };
    } catch (error) {
      console.error("[ReportService] getFinesReport error:", error);
      throw error;
    }
  }

  /**
   * Get fines report (for export), with optional month/year filter for revenue audits.
   */
  async getFinesReportForAudit(
    filters: { status?: string; month?: number; year?: number } = {}
  ) {
    try {
      const conditions = [isNull(fines.deletedAt)];

      if (filters.status) {
        conditions.push(sql`${fines.status} = ${filters.status}`);
      }

      if ((filters.month || filters.year) && !filters.status) {
        conditions.push(eq(fines.status, "paid"));
      }

      if (filters.year) {
        conditions.push(
          sql`EXTRACT(YEAR FROM ${transactions.paidAt})::int = ${filters.year}`
        );
      }

      if (filters.month) {
        conditions.push(
          sql`EXTRACT(MONTH FROM ${transactions.paidAt})::int = ${filters.month}`
        );
      }

      const result = await db
        .select({
          id: fines.id,
          amount: fines.amount,
          status: fines.status,
          fineCreatedAt: fines.createdAt,
          paidAt: transactions.paidAt,
          memberName: Users.name,
          memberEmail: Users.email,
          bookTitle: bibliographies.title
        })
        .from(fines)
        .leftJoin(loans, eq(fines.loanId, loans.id))
        .leftJoin(members, eq(loans.memberId, members.id))
        .leftJoin(Users, eq(members.userId, Users.id))
        .leftJoin(items, eq(loans.itemId, items.id))
        .leftJoin(bibliographies, eq(items.bibliographyId, bibliographies.id))
        .leftJoin(transactions, eq(transactions.fineId, fines.id))
        .where(and(...conditions))
        .orderBy(
          desc(
            sql`COALESCE(${transactions.paidAt}::timestamp, ${fines.createdAt})`
          )
        );

      return { success: true, data: result };
    } catch (error) {
      console.error("[ReportService] getFinesReportForAudit error:", error);
      throw error;
    }
  }

  /**
   * Get fine revenue summary for selected month and year.
   */
  async getFinesRevenueSummary(
    filters: { month?: number; year?: number } = {}
  ) {
    try {
      const now = new Date();
      const selectedYear = filters.year ?? now.getFullYear();
      const selectedMonth = filters.month ?? now.getMonth() + 1;

      const [monthlyRevenue] = await db
        .select({
          total: sql<number>`COALESCE(SUM(${fines.amount}::numeric), 0)`
        })
        .from(transactions)
        .innerJoin(fines, eq(transactions.fineId, fines.id))
        .where(
          and(
            isNull(fines.deletedAt),
            eq(fines.status, "paid"),
            sql`EXTRACT(YEAR FROM ${transactions.paidAt})::int = ${selectedYear}`,
            sql`EXTRACT(MONTH FROM ${transactions.paidAt})::int = ${selectedMonth}`
          )
        );

      const [outstandingFines] = await db
        .select({
          total: sql<number>`COALESCE(SUM(${fines.amount}::numeric), 0)`
        })
        .from(fines)
        .where(and(isNull(fines.deletedAt), eq(fines.status, "unpaid")));

      const yearlyRows = await db
        .select({
          month: sql<number>`EXTRACT(MONTH FROM ${transactions.paidAt})::int`,
          total: sql<number>`COALESCE(SUM(${fines.amount}::numeric), 0)`
        })
        .from(transactions)
        .innerJoin(fines, eq(transactions.fineId, fines.id))
        .where(
          and(
            isNull(fines.deletedAt),
            eq(fines.status, "paid"),
            sql`EXTRACT(YEAR FROM ${transactions.paidAt})::int = ${selectedYear}`
          )
        )
        .groupBy(sql`EXTRACT(MONTH FROM ${transactions.paidAt})`)
        .orderBy(sql`EXTRACT(MONTH FROM ${transactions.paidAt})`);

      const monthlyBreakdown = Array.from({ length: 12 }, (_, index) => {
        const month = index + 1;
        const found = yearlyRows.find((row) => Number(row.month) === month);
        return {
          month,
          total: Number(found?.total ?? 0)
        };
      });

      return {
        success: true,
        data: {
          month: selectedMonth,
          year: selectedYear,
          totalFineRevenue: Number(monthlyRevenue?.total ?? 0),
          outstandingFines: Number(outstandingFines?.total ?? 0),
          monthlyBreakdown
        }
      };
    } catch (error) {
      console.error("[ReportService] getFinesRevenueSummary error:", error);
      throw error;
    }
  }

  // ============================================================
  // EXPORT HELPERS
  // ============================================================

  /**
   * Export any data array to CSV and stream to response
   */
  exportToCSV<T extends Record<string, unknown>>(
    res: Response,
    filename: string,
    data: T[],
    columns: { key: keyof T; header: string }[]
  ): void {
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${this.buildExportFilename(filename, "csv")}"`
    );

    // BOM for Excel UTF-8 compatibility
    res.write("\uFEFF");

    // Header row
    res.write(columns.map((c) => `"${c.header}"`).join(",") + "\n");

    // Data rows
    for (const row of data) {
      const line = columns
        .map((c) => {
          const val = row[c.key] ?? "";
          return `"${String(val).replace(/"/g, '""')}"`;
        })
        .join(",");
      res.write(line + "\n");
    }

    res.end();
  }

  /**
   * Export loan report to PDF and stream to response
   */
  exportLoansToPDF(
    res: Response,
    data: Array<{
      memberName?: string;
      bookTitle?: string;
      status?: string;
      borrowDate?: string;
      dueDate?: string;
      returnDate?: string | null;
    }>,
    title = "Laporan Peminjaman Buku"
  ): void {
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${this.buildExportFilename("Laporan Peminjaman", "pdf")}"`
    );

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    doc.pipe(res);

    // Header
    doc
      .fontSize(18)
      .font("Helvetica-Bold")
      .text("MUCILIB — Perpustakaan UMC", { align: "center" });
    doc.fontSize(13).font("Helvetica").text(title, { align: "center" });
    doc.fontSize(9).text(`Dicetak: ${new Date().toLocaleString("id-ID")}`, {
      align: "center"
    });
    doc.moveDown(1);

    // Table Header
    const colWidths = [160, 100, 70, 80, 80];
    const headers = [
      "Peminjam",
      "Judul Buku",
      "Status",
      "Tgl Pinjam",
      "Tgl Kembali"
    ];
    const startX = 40;
    let y = doc.y;

    doc.font("Helvetica-Bold").fontSize(9);
    doc.rect(startX, y, 515, 16).fill("#2563EB");
    doc.fill("white");
    let x = startX + 4;
    headers.forEach((h, i) => {
      doc.text(h, x, y + 3, { width: colWidths[i] - 4, lineBreak: false });
      x += colWidths[i];
    });
    doc.fill("black");
    y += 16;

    // Table Rows
    doc.font("Helvetica").fontSize(8);
    data.forEach((row, idx) => {
      if (y > 740) {
        doc.addPage();
        y = 40;
      }
      const bg = idx % 2 === 0 ? "#F1F5F9" : "white";
      doc.rect(startX, y, 515, 14).fill(bg);
      doc.fill("black");

      x = startX + 4;
      const cols = [
        row.memberName ?? "-",
        row.bookTitle ?? "-",
        row.status ?? "-",
        row.borrowDate ?? "-",
        row.returnDate ?? row.dueDate ?? "-"
      ];
      cols.forEach((val, i) => {
        doc.text(String(val).substring(0, 25), x, y + 3, {
          width: colWidths[i] - 4,
          lineBreak: false
        });
        x += colWidths[i];
      });
      y += 14;
    });

    doc.moveDown(1);
    doc
      .fontSize(8)
      .fill("#64748B")
      .text(`Total: ${data.length} records`, startX);

    doc.end();
  }

  /**
   * Export fines report to PDF and stream to response
   */
  exportFinesToPDF(
    res: Response,
    data: Array<{
      memberName?: string;
      bookTitle?: string;
      status?: string;
      paidAt?: string;
      amount?: string;
    }>,
    title = "Laporan Denda Peminjaman",
    filenameBase = "Laporan Denda"
  ): void {
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${this.buildExportFilename(filenameBase, "pdf")}"`
    );

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    doc.pipe(res);

    doc
      .fontSize(18)
      .font("Helvetica-Bold")
      .text("MUCILIB - Perpustakaan UMC", { align: "center" });
    doc.fontSize(13).font("Helvetica").text(title, { align: "center" });
    doc.fontSize(9).text(`Dicetak: ${new Date().toLocaleString("id-ID")}`, {
      align: "center"
    });
    doc.moveDown(1);

    const colWidths = [145, 140, 70, 70, 90];
    const headers = ["Member", "Judul Buku", "Status", "Tgl Bayar", "Jumlah"];
    const startX = 40;
    let y = doc.y;

    doc.font("Helvetica-Bold").fontSize(9);
    doc.rect(startX, y, 515, 16).fill("#B91C1C");
    doc.fill("white");
    let x = startX + 4;
    headers.forEach((h, i) => {
      doc.text(h, x, y + 3, { width: colWidths[i] - 4, lineBreak: false });
      x += colWidths[i];
    });
    doc.fill("black");
    y += 16;

    doc.font("Helvetica").fontSize(8);
    data.forEach((row, idx) => {
      if (y > 740) {
        doc.addPage();
        y = 40;
      }

      const bg = idx % 2 === 0 ? "#F8FAFC" : "white";
      doc.rect(startX, y, 515, 14).fill(bg);
      doc.fill("black");

      x = startX + 4;
      const cols = [
        row.memberName ?? "-",
        row.bookTitle ?? "-",
        row.status ?? "-",
        row.paidAt ?? "-",
        row.amount ?? "-"
      ];

      cols.forEach((val, i) => {
        doc.text(String(val).substring(0, 28), x, y + 3, {
          width: colWidths[i] - 4,
          lineBreak: false
        });
        x += colWidths[i];
      });
      y += 14;
    });

    doc.moveDown(1);
    doc
      .fontSize(8)
      .fill("#64748B")
      .text(`Total: ${data.length} records`, startX);

    doc.end();
  }
}

export default new ReportService();
