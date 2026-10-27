import { describe, it, expect } from "vitest";
import {
  createEbookSchema,
  updateEbookSchema,
  queryEbookSchema
} from "../validation/ebook.validation";
import { PDFDocument } from "pdf-lib";
import { pdfSlicingService } from "../../repository/service/pdf-slicing.service";

describe("Ebook Module Tests", () => {
  describe("Ebook Validation Schemas", () => {
    it("validates valid createEbookSchema input with defaults", () => {
      const input = {
        title: "Clean Architecture in TypeScript",
        authorName: "Robert C. Martin",
        publisherName: "Prentice Hall",
        publishYear: 2018,
        isbn: "978-0134494166",
        categoryId: 1,
        isFullAccess: "true",
        previewStartPage: "1",
        previewEndPage: "15"
      };

      const result = createEbookSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe("Clean Architecture in TypeScript");
        expect(result.data.isFullAccess).toBe(true);
        expect(result.data.previewStartPage).toBe(1);
        expect(result.data.previewEndPage).toBe(15);
        expect(result.data.allowDownload).toBe(false); // default
      }
    });

    it("fails when title is less than 3 characters", () => {
      const input = {
        title: "AB"
      };
      const result = createEbookSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("parses queryEbookSchema with default pagination", () => {
      const result = queryEbookSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(10);
      }
    });

    it("validates updateEbookSchema partial input", () => {
      const result = updateEbookSchema.safeParse({
        title: "Updated Title",
        isFullAccess: false,
        previewEndPage: 20
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe("Updated Title");
        expect(result.data.isFullAccess).toBe(false);
        expect(result.data.previewEndPage).toBe(20);
      }
    });
  });

  describe("Ebook Slicing Simulation", () => {
    it("slices PDF preview for limited access e-book", async () => {
      // Buat sample PDF 30 halaman
      const doc = await PDFDocument.create();
      for (let i = 1; i <= 30; i++) {
        const page = doc.addPage([400, 600]);
        page.drawText(`Ebook Page ${i}`);
      }
      const fullBuffer = Buffer.from(await doc.save());

      // Simulasi slicing preview halaman 1 s/d 10
      const slicedBuffer = await pdfSlicingService.slicePdf(fullBuffer, 1, 10);
      const slicedDoc = await PDFDocument.load(slicedBuffer);

      expect(slicedDoc.getPageCount()).toBe(10);
    });
  });
});
