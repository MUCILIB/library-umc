import { describe, it, expect, vi } from "vitest";
import { PDFDocument } from "pdf-lib";
import { proposalService } from "../service/proposal.service";
import { pdfSlicingService } from "../service/pdf-slicing.service";
import fs from "fs";

describe("ProposalService Lifecycle Unit Tests", () => {
  it("rejects file buffer that is not a real PDF (magic bytes check)", async () => {
    const invalidBuffer = Buffer.from("Hello world not a pdf");
    await expect(
      proposalService.createProposal(
        "user-test-id",
        {
          title: "Proposal Testing Non-PDF",
          advisorName1: "Dr. Budi",
          studyProgramId: 1,
          documentCategory: "PROPOSAL"
        },
        invalidBuffer,
        "dummy.txt"
      )
    ).rejects.toThrow("Format file tidak valid. Berkas wajib berupa PDF asli.");
  });

  it("extracts page bounds correctly for slicing", async () => {
    const doc = await PDFDocument.create();
    for (let i = 1; i <= 15; i++) {
      doc.addPage([400, 600]);
    }
    const pdfBytes = await doc.save();
    const pdfBuf = Buffer.from(pdfBytes);

    const count = await pdfSlicingService.getPageCount(pdfBuf);
    expect(count).toBe(15);

    const sliced = await pdfSlicingService.slicePdf(pdfBuf, 1, 10);
    const slicedDoc = await PDFDocument.load(sliced);
    expect(slicedDoc.getPageCount()).toBe(10);
  });

  describe("Validation & Chapter Schema", () => {
    it("parses proposal with chapter and chapterTitle correctly", async () => {
      const { createProposalSchema } = await import("../validation/proposal.validation");
      const parsed = createProposalSchema.parse({
        title: "Analisis Algoritma Dijkstra pada Jaringan Komputer",
        advisorName1: "Dr. Budi",
        studyProgramId: 1,
        documentCategory: "THESIS",
        chapter: "BAB_1",
        chapterTitle: "Pendahuluan",
        authorName: "Ahmad Dahlan",
        authorNim: "202001001",
        status: "APPROVED",
        allowedStartPage: 1,
        allowedEndPage: 5
      });

      expect(parsed.chapter).toBe("BAB_1");
      expect(parsed.chapterTitle).toBe("Pendahuluan");
      expect(parsed.authorName).toBe("Ahmad Dahlan");
      expect(parsed.authorNim).toBe("202001001");
      expect(parsed.status).toBe("APPROVED");
      expect(parsed.allowedStartPage).toBe(1);
      expect(parsed.allowedEndPage).toBe(5);
    });

    it("defaults chapter to FULL_TEXT if omitted", async () => {
      const { createProposalSchema } = await import("../validation/proposal.validation");
      const parsed = createProposalSchema.parse({
        title: "Pengembangan Sistem Informasi Perpustakaan",
        advisorName1: "Dr. Siti",
        studyProgramId: 2,
        documentCategory: "PROPOSAL"
      });

      expect(parsed.chapter).toBe("FULL_TEXT");
      expect(parsed.chapterTitle).toBeUndefined();
    });

    it("parses proposal with BAB_6 for Teknik Informatika thesis", async () => {
      const { createProposalSchema } = await import("../validation/proposal.validation");
      const parsed = createProposalSchema.parse({
        title: "Penerapan Deep Learning pada Klasifikasi Gambar",
        advisorName1: "Dr. Budi",
        studyProgramId: 1,
        documentCategory: "THESIS",
        chapter: "BAB_6",
        chapterTitle: "Kesimpulan dan Saran",
      });

      expect(parsed.chapter).toBe("BAB_6");
      expect(parsed.chapterTitle).toBe("Kesimpulan dan Saran");
    });

    it("supports partial updates for chapterTitle and allowedEndPage", async () => {
      const { updateProposalSchema } = await import("../validation/proposal.validation");
      const updated = updateProposalSchema.parse({
        chapterTitle: "Pendahuluan & Latar Belakang Masalah",
        allowedEndPage: 10
      });

      expect(updated.chapterTitle).toBe("Pendahuluan & Latar Belakang Masalah");
      expect(updated.allowedEndPage).toBe(10);
      expect(updated.title).toBeUndefined();
    });
  });
});
