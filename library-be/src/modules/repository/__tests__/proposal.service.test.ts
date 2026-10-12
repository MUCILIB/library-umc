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
});
