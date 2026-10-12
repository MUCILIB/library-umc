import { describe, it, expect, beforeAll } from "vitest";
import { PDFDocument } from "pdf-lib";
import { pdfSlicingService } from "../service/pdf-slicing.service";

describe("PdfSlicingService", () => {
  let samplePdfBuffer: Buffer;
  const TOTAL_PAGES = 25;

  beforeAll(async () => {
    // Generate sample PDF dengan 25 halaman
    const doc = await PDFDocument.create();
    for (let i = 1; i <= TOTAL_PAGES; i++) {
      const page = doc.addPage([400, 600]);
      page.drawText(`Halaman ${i} dari ${TOTAL_PAGES}`);
    }
    const pdfBytes = await doc.save();
    samplePdfBuffer = Buffer.from(pdfBytes);
  });

  it("extracts page count correctly", async () => {
    const pageCount = await pdfSlicingService.getPageCount(samplePdfBuffer);
    expect(pageCount).toBe(TOTAL_PAGES);
  });

  it("slices pages within range (e.g., 1 to 10) producing exact page count", async () => {
    const slicedBuffer = await pdfSlicingService.slicePdf(samplePdfBuffer, 1, 10);
    const slicedDoc = await PDFDocument.load(slicedBuffer);
    expect(slicedDoc.getPageCount()).toBe(10);
  });

  it("caps out-of-bounds endPage to maximum document pages", async () => {
    const slicedBuffer = await pdfSlicingService.slicePdf(samplePdfBuffer, 1, 50);
    const slicedDoc = await PDFDocument.load(slicedBuffer);
    expect(slicedDoc.getPageCount()).toBe(TOTAL_PAGES);
  });

  it("throws BadRequest error if startPage is greater than endPage or < 1", async () => {
    await expect(pdfSlicingService.slicePdf(samplePdfBuffer, 10, 5)).rejects.toThrow();
    await expect(pdfSlicingService.slicePdf(samplePdfBuffer, 0, 5)).rejects.toThrow();
  });
});
