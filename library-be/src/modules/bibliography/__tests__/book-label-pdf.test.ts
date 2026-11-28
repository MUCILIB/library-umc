import { Writable } from "node:stream";
import type { Response } from "express";
import PDFDocument from "pdfkit";
import { PDFDocument as PdfLibDocument } from "pdf-lib";
import { describe, expect, it, vi } from "vitest";
import { encodeCode128B } from "../../../utils/code128";
import { bookLabelsPdfQuerySchema } from "../validation/bibliography.validation";
import {
  formatAuthorsText,
  formatClassificationText,
  getLabelGridLayout,
  getSpineClassificationLines,
  LABEL_CARD_HEIGHT_PT,
  LABEL_CARD_WIDTH_PT,
  streamBookLabelsPdf,
} from "../service/book-label-pdf.service";

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

describe("Book Label & Barcode PDF", () => {
  it("validates perPage query options (4, 6, 8, 10, 12) and defaults to 6", () => {
    expect(bookLabelsPdfQuerySchema.parse({}).perPage).toBe(6);
    expect(bookLabelsPdfQuerySchema.parse({ perPage: "12" }).perPage).toBe(12);
    expect(bookLabelsPdfQuerySchema.safeParse({ perPage: "5" }).success).toBe(false);
  });

  it("returns expected grid layouts for each perPage preset", () => {
    expect(getLabelGridLayout(4)).toEqual({ cols: 2, rows: 2, perPage: 4 });
    expect(getLabelGridLayout(6)).toEqual({ cols: 2, rows: 3, perPage: 6 });
    expect(getLabelGridLayout(8)).toEqual({ cols: 2, rows: 4, perPage: 8 });
    expect(getLabelGridLayout(10)).toEqual({ cols: 2, rows: 5, perPage: 10 });
    expect(getLabelGridLayout(12)).toEqual({ cols: 2, rows: 6, perPage: 12 });
  });

  it("keeps identical sticker width and height regardless of perPage layout", async () => {
    const items = [
      { id: "item-1", itemCode: "S-26-10001-c1" },
      { id: "item-2", itemCode: "S-26-10001-c2" },
    ];
    const bib = {
      id: "bib-size",
      title: "Uji Ukuran Tetap",
      classification: "005.1",
      authors: [{ name: "Penulis Uji" }],
      items,
    };

    for (const perPage of [4, 6, 8, 10, 12] as const) {
      const rectSpy = vi.spyOn(PDFDocument.prototype, "roundedRect");
      const res = createMockPdfResponse();
      streamBookLabelsPdf(res, bib, items, perPage);
      await res.getBuffer();

      const outerCards = rectSpy.mock.calls.filter(
        (call) => call[2] === LABEL_CARD_WIDTH_PT && call[3] === LABEL_CARD_HEIGHT_PT
      );
      rectSpy.mockRestore();
      expect(outerCards.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("formats authors and classification text cleanly", () => {
    expect(
      formatAuthorsText([{ name: "Budi Santoso" }, { name: "Siti Aminah" }], "dkk")
    ).toBe("Budi Santoso, Siti Aminah, dkk");
    expect(formatAuthorsText([], null)).toBe("-");
    expect(formatClassificationText("005.133", "005.133 BUD s", null)).toBe(
      "005.133 BUD s"
    );
    expect(formatClassificationText("005.1", "RK-01", null)).toBe("005.1 / RK-01");
    expect(getSpineClassificationLines("348.1", "348.1 JOH b", null)).toEqual([
      "348.1",
      "JOH",
      "b",
    ]);
    expect(getSpineClassificationLines("005.1", "RK-01", null)).toEqual([
      "005.1",
      "RK-01",
    ]);
  });

  it("encodes itemCode into Code 128B bars with quiet zones", () => {
    const encoded = encodeCode128B("S-26-10001-c1");
    expect(encoded.value).toBe("S-26-10001-c1");
    expect(encoded.bars.length).toBeGreaterThan(20);
    expect(encoded.totalModules).toBeGreaterThan(100);
  });

  it("generates 1 PDF page for 6 copies with perPage=6 and includes barcode, classification, author, and title", async () => {
    const res = createMockPdfResponse();
    const textSpy = vi.spyOn(PDFDocument.prototype, "text");

    const items = Array.from({ length: 6 }, (_, i) => ({
      id: `item-${i + 1}`,
      itemCode: `S-26-10001-c${i + 1}`,
      callNumber: "005.133 BUD d",
    }));

    streamBookLabelsPdf(
      res,
      {
        id: "bib-1",
        title: "Dasar-Dasar Pemrograman Web Modern",
        classification: "005.133",
        callNumber: "005.133 BUD d",
        authors: [{ name: "Budi Raharjo" }],
        items,
      },
      items,
      6
    );

    const pdfBuffer = await res.getBuffer();
    const printedTexts = textSpy.mock.calls.map((c) => String(c[0]));
    textSpy.mockRestore();

    expect(res.headers["content-type"]).toBe("application/pdf");
    expect(res.headers["cache-control"]).toContain("no-store");
    expect(printedTexts).toContain("Dasar-Dasar Pemrograman Web Modern");
    expect(printedTexts).toContain("Penulis: Budi Raharjo");
    expect(printedTexts).toContain("KLASIFIKASI");
    expect(printedTexts).toContain("005.133");
    expect(printedTexts).toContain("BUD");
    expect(printedTexts).toContain("d");
    expect(printedTexts).toContain("S-26-10001-c1");
    expect(printedTexts).toContain("S-26-10001-c6");

    const parsed = await PdfLibDocument.load(pdfBuffer);
    expect(parsed.getPageCount()).toBe(1);
  });

  it("paginates 14 copies across 3 pages when perPage=6 and 2 pages when perPage=12", async () => {
    const items = Array.from({ length: 14 }, (_, i) => ({
      id: `item-${i + 1}`,
      itemCode: `R-26-10002-c${i + 1}`,
    }));

    const res6 = createMockPdfResponse();
    streamBookLabelsPdf(
      res6,
      {
        id: "bib-2",
        title: "Kamus Istilah Teknik Informatika",
        classification: "004.03",
        authors: [{ name: "Tim Penyusun" }],
        items,
      },
      items,
      6
    );
    const buf6 = await res6.getBuffer();
    expect((await PdfLibDocument.load(buf6)).getPageCount()).toBe(3);

    const res12 = createMockPdfResponse();
    streamBookLabelsPdf(
      res12,
      {
        id: "bib-2",
        title: "Kamus Istilah Teknik Informatika",
        classification: "004.03",
        authors: [{ name: "Tim Penyusun" }],
        items,
      },
      items,
      12
    );
    const buf12 = await res12.getBuffer();
    expect((await PdfLibDocument.load(buf12)).getPageCount()).toBe(2);
  });
});
