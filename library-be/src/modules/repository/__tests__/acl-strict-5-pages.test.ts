import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { PDFDocument } from "pdf-lib";
import fs from "fs";
import path from "path";
import { proposalService } from "../service/proposal.service";
import { proposalController } from "../controller/proposal.controller";
import type { Request, Response } from "express";

function createSelectChain(resolvedData: any = []) {
  const chain: any = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    then: (resolve: any) => Promise.resolve(resolvedData).then(resolve)
  };
  chain.from.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  chain.orderBy.mockReturnValue(chain);
  return chain;
}

vi.mock("../../../db", () => {
  return {
    db: {
      insert: vi.fn(),
      select: vi.fn(),
      update: vi.fn(),
      query: {
        repositoryProposals: { findFirst: vi.fn() },
        repositoryDocumentPageRules: { findFirst: vi.fn() }
      }
    }
  };
});

describe("Strict 5-Page ACL & Public Safety Test", () => {
  let tenPageBuffer: Buffer;
  const proposalId = "prop-10-pages-acl-test";
  const tempDir = path.join(process.cwd(), "storage", "proposals");
  const tempFilePath = path.join(tempDir, `${proposalId}.pdf`);

  beforeAll(async () => {
    // Generate real 10-page PDF
    const doc = await PDFDocument.create();
    for (let i = 1; i <= 10; i++) {
      const page = doc.addPage([595, 842]);
      page.drawText(`Naskah UMC - Halaman ${i}`, { x: 50, y: 800, size: 14 });
    }
    const pdfBytes = await doc.save();
    tenPageBuffer = Buffer.from(pdfBytes);

    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    fs.writeFileSync(tempFilePath, tenPageBuffer);
  });

  afterAll(() => {
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  });

  it("strictly trims 10-page PDF to exactly 5 pages when public rule is set to endPage: 5", async () => {
    const { db } = await import("../../../db");

    let callCount = 0;
    (db.select as any).mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // getProposalById
        return createSelectChain([
          {
            id: proposalId,
            title: "Pengujian Batasan Halaman Repositori",
            storagePath: tempFilePath,
            pageCount: 10,
            status: "APPROVED",
            authorUserId: "author-user-999"
          }
        ]);
      } else if (callCount === 2) {
        // rules for getProposalById
        return createSelectChain([
          {
            id: "rule-pub-5",
            proposalId,
            roleScope: "PUBLIC",
            allowedStartPage: 1,
            allowedEndPage: 5,
            allowDownloadFull: false
          }
        ]);
      } else if (callCount === 3) {
        // reviewLogs for getProposalById
        return createSelectChain([]);
      } else if (callCount === 4) {
        // rules lookup in getDocumentPdf
        return createSelectChain([
          {
            id: "rule-pub-5",
            proposalId,
            roleScope: "PUBLIC",
            allowedStartPage: 1,
            allowedEndPage: 5,
            allowDownloadFull: false
          }
        ]);
      }
      return createSelectChain([]);
    });

    const result = await proposalService.getDocumentPdf(proposalId, { role: "public" });
    expect(result.startPage).toBe(1);
    expect(result.endPage).toBe(5);
    expect(result.isRestricted).toBe(true);

    const doc = await PDFDocument.load(result.buffer);
    expect(doc.getPageCount()).toBe(5);
  });

  it("forces strict public slicing when admin uses ?preview=public query parameter", async () => {
    const { db } = await import("../../../db");

    let callCount = 0;
    (db.select as any).mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return createSelectChain([
          {
            id: proposalId,
            title: "Pengujian Batasan Halaman Repositori",
            storagePath: tempFilePath,
            pageCount: 10,
            status: "APPROVED",
            authorUserId: "author-user-999"
          }
        ]);
      } else if (callCount === 2) {
        return createSelectChain([
          {
            id: "rule-pub-5",
            proposalId,
            roleScope: "PUBLIC",
            allowedStartPage: 1,
            allowedEndPage: 5,
            allowDownloadFull: false
          }
        ]);
      } else if (callCount === 3) {
        return createSelectChain([]);
      } else if (callCount === 4) {
        return createSelectChain([
          {
            id: "rule-pub-5",
            proposalId,
            roleScope: "PUBLIC",
            allowedStartPage: 1,
            allowedEndPage: 5,
            allowDownloadFull: false
          }
        ]);
      }
      return createSelectChain([]);
    });

    let sentBuffer: Buffer | null = null;
    const req = {
      params: { id: proposalId },
      query: { preview: "public" },
      headers: {},
      user: { id: "admin-1", role: "super_admin" } // Even though user is super_admin
    } as unknown as Request;

    const res = {
      setHeader: vi.fn(),
      status: vi.fn().mockReturnThis(),
      send: vi.fn((buf: Buffer) => {
        sentBuffer = buf;
      })
    } as unknown as Response;

    const next = vi.fn();
    await proposalController.viewPdf(req, res, next);

    expect(sentBuffer).not.toBeNull();
    const doc = await PDFDocument.load(sentBuffer!);
    expect(doc.getPageCount()).toBe(5);
  });

  it("blocks unauthenticated public access if proposal status is NOT APPROVED", async () => {
    const { db } = await import("../../../db");

    let callCount = 0;
    (db.select as any).mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return createSelectChain([
          {
            id: proposalId,
            title: "Proposal Belum Disetujui",
            storagePath: tempFilePath,
            pageCount: 10,
            status: "SUBMITTED", // NOT APPROVED
            authorUserId: "author-user-999"
          }
        ]);
      }
      return createSelectChain([]);
    });

    await expect(
      proposalService.getDocumentPdf(proposalId, { role: "public" })
    ).rejects.toThrow("Dokumen proposal ini belum disetujui untuk publik");
  });
});
