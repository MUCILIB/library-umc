import { Writable } from "node:stream";
import type { Response } from "express";
import PDFDocument from "pdfkit";
import { PDFDocument as PdfLibDocument } from "pdf-lib";
import { describe, expect, it, vi } from "vitest";
import { ReportService } from "../service/report.service";
import { normalizePdfCell, renderPdfTable } from "../../../utils/pdf-table";

function createMockPdfResponse() {
  const chunks: Buffer[] = [];
  const headers: Record<string, string> = {};

  const stream = new Writable({
    write(chunk, _encoding, callback) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      callback();
    },
  });

  const res = stream as unknown as Response & {
    setHeader: (name: string, value: string) => void;
    getBuffer: () => Promise<Buffer>;
    headers: Record<string, string>;
  };

  res.headers = headers;
  res.setHeader = (name: string, value: string) => {
    headers[name.toLowerCase()] = value;
  };
  res.getBuffer = () =>
    new Promise<Buffer>((resolve, reject) => {
      if (stream.writableFinished) {
        resolve(Buffer.concat(chunks));
        return;
      }
      stream.on("finish", () => resolve(Buffer.concat(chunks)));
      stream.on("error", reject);
    });

  return res;
}

describe("PDF Table & Report PDF Export", () => {
  it("normalizePdfCell normalizes empty values and whitespace", () => {
    expect(normalizePdfCell(null)).toBe("-");
    expect(normalizePdfCell(undefined)).toBe("-");
    expect(normalizePdfCell("   ")).toBe("-");
    expect(normalizePdfCell(0)).toBe("0");
    expect(normalizePdfCell("Dasar-Dasar\n  Psikologi\tPendidikan")).toBe(
      "Dasar-Dasar Psikologi Pendidikan"
    );
  });

  it("renderPdfTable expands row height for long wrapped titles and adds pages cleanly", async () => {
    const doc = new PDFDocument({ margin: 36, size: "A4", layout: "landscape" });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));

    const startY = 80;
    const singleLineRowY = renderPdfTable(doc, {
      startX: 36,
      startY,
      headers: ["Peminjam", "Judul Buku"],
      colWidths: [120, 180],
      rows: [["Budi", "Matematika Diskrit"]],
      headerBgColor: "#2563EB",
    });

    const multiLineDoc = new PDFDocument({ margin: 36, size: "A4", layout: "landscape" });
    const multiChunks: Buffer[] = [];
    multiLineDoc.on("data", (c: Buffer) => multiChunks.push(c));

    const multiLineRowY = renderPdfTable(multiLineDoc, {
      startX: 36,
      startY,
      headers: ["Peminjam", "Judul Buku"],
      colWidths: [120, 180],
      rows: [
        [
          "Budi",
          "Dasar-Dasar Psikologi Pendidikan dan Perkembangan Peserta Didik Edisi Revisi Lengkap",
        ],
      ],
      headerBgColor: "#2563EB",
    });

    doc.end();
    multiLineDoc.end();

    expect(multiLineRowY - startY).toBeGreaterThan(singleLineRowY - startY);
  });

  it("exportLoansToPDF writes full book titles without truncation and paginates tall tables", async () => {
    const reportService = new ReportService();
    const res = createMockPdfResponse();

    const longTitle1 =
      "Dasar-Dasar Psikologi Pendidikan dan Perkembangan Peserta Didik Edisi Terbaru";
    const longTitle2 =
      "Bahasa Inggris untuk Perguruan Tinggi: Panduan Membaca, Menulis, dan Komunikasi Akademik";

    const textSpy = vi.spyOn(PDFDocument.prototype, "text");

    const rows = Array.from({ length: 30 }, (_, idx) => ({
      memberName: `Mahasiswa Uji ${idx + 1}`,
      bookTitle: idx % 2 === 0 ? longTitle1 : longTitle2,
      faculty: "Fakultas Keguruan dan Ilmu Pendidikan",
      studyProgram: "Pendidikan Guru Sekolah Dasar",
      status: idx % 3 === 0 ? "returned" : "approved",
      borrowDate: "26/11/2026",
      dueDate: "2026-12-03",
      returnDate: idx % 3 === 0 ? "2026-11-26" : null,
    }));

    reportService.exportLoansToPDF(res, rows, "Laporan Peminjaman Buku");
    const pdfBuffer = await res.getBuffer();

    const printedTexts = textSpy.mock.calls.map((call) => String(call[0]));
    textSpy.mockRestore();

    expect(printedTexts).toContain(longTitle1);
    expect(printedTexts).toContain(longTitle2);
    expect(res.headers["content-type"]).toBe("application/pdf");

    const parsed = await PdfLibDocument.load(pdfBuffer);
    expect(parsed.getPageCount()).toBeGreaterThan(1);
  });

  it("exportFinesToPDF writes full book titles without truncation", async () => {
    const reportService = new ReportService();
    const res = createMockPdfResponse();
    const longTitle = "Bahasa Inggris untuk Profesi Teknologi Informasi dan Komunikasi Modern";

    const textSpy = vi.spyOn(PDFDocument.prototype, "text");

    reportService.exportFinesToPDF(res, [
      {
        memberName: "Baji Brave",
        bookTitle: longTitle,
        status: "paid",
        paidAt: "27/11/2026",
        amount: "Rp 5.000",
      },
    ]);

    const pdfBuffer = await res.getBuffer();
    const printedTexts = textSpy.mock.calls.map((call) => String(call[0]));
    textSpy.mockRestore();

    expect(printedTexts).toContain(longTitle);
    const parsed = await PdfLibDocument.load(pdfBuffer);
    expect(parsed.getPageCount()).toBe(1);
  });

  it("exportToCSV formats rows using semicolon (;) or comma (,) delimiter", async () => {
    const reportService = new ReportService();
    const rows = [
      { memberName: "Budi", bookTitle: "Algoritma, Struktur Data" },
    ];
    const cols = [
      { key: "memberName" as const, header: "Nama" },
      { key: "bookTitle" as const, header: "Judul" },
    ];

    const resSemi = createMockPdfResponse();
    reportService.exportToCSV(resSemi, "laporan-peminjaman", rows, cols, ";");
    const semiCsv = (await resSemi.getBuffer()).toString("utf8").replace(/^\uFEFF/, "");
    expect(semiCsv).toBe('"Nama";"Judul"\n"Budi";"Algoritma, Struktur Data"\n');

    const resComma = createMockPdfResponse();
    reportService.exportToCSV(resComma, "laporan-peminjaman", rows, cols, ",");
    const commaCsv = (await resComma.getBuffer()).toString("utf8").replace(/^\uFEFF/, "");
    expect(commaCsv).toBe('"Nama","Judul"\n"Budi","Algoritma, Struktur Data"\n');
  });
});
