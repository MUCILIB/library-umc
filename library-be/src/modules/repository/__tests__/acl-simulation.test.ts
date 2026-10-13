import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { PDFDocument } from "pdf-lib";
import fs from "fs";
import path from "path";
import { pdfSlicingService } from "../service/pdf-slicing.service";
import { proposalService } from "../service/proposal.service";
import { proposalController } from "../controller/proposal.controller";
import type { Request, Response } from "express";

// Mock auth-utils
vi.mock("../../../utils/auth-utils", () => ({
  getSession: vi.fn().mockResolvedValue(null)
}));

// Mock database
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
        members: { findFirst: vi.fn() },
        Users: { findFirst: vi.fn() },
        repositoryProposals: { findFirst: vi.fn() },
        repositoryDocumentPageRules: { findFirst: vi.fn() }
      }
    }
  };
});

describe("E2E Simulation: PDF Generation, Student Upload, and Public vs Mahasiswa Access ACL", () => {
  let samplePdfBuffer: Buffer;
  const tempProposalId = "prop-simulation-uuid-123";
  const tempDir = path.join(process.cwd(), "storage", "proposals");
  const tempFilePath = path.join(tempDir, `${tempProposalId}.pdf`);

  beforeAll(async () => {
    // 1. Generate real physical PDF document with 40 pages
    const doc = await PDFDocument.create();
    for (let i = 1; i <= 40; i++) {
      const page = doc.addPage([595, 842]); // A4 Size
      // Draw minimal identifier text
      page.drawText(`Naskah Skripsi UMC - Halaman ${i}`, {
        x: 50,
        y: 800,
        size: 14
      });
    }
    const pdfBytes = await doc.save();
    samplePdfBuffer = Buffer.from(pdfBytes);

    // Save to test storage
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    fs.writeFileSync(tempFilePath, samplePdfBuffer);
  });

  afterAll(() => {
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  });

  it("verifies physical PDF creation has exactly 40 pages", async () => {
    const totalPages = await pdfSlicingService.getPageCount(samplePdfBuffer);
    expect(totalPages).toBe(40);
  });

  it("simulates student role submitting 40-page PDF proposal", async () => {
    const { db } = await import("../../../db");

    // Mock select chain for Users lookup & duplicate check
    let selectCallCount = 0;
    (db.select as any).mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        // Query user info
        return createSelectChain([
          {
            id: "user-mhs-001",
            name: "Ahmad Mahasiswa",
            role: "mahasiswa"
          }
        ]);
      }
      // Query duplicate check: return empty
      return createSelectChain([]);
    });

    // Mock member lookup for student
    (db.query.members.findFirst as any).mockResolvedValue({
      id: "member-mhs-001",
      nimNidn: "2021081001",
      userId: "user-mhs-001"
    });

    (db.query.Users.findFirst as any).mockResolvedValue({
      id: "user-mhs-001",
      name: "Ahmad Mahasiswa",
      role: "mahasiswa"
    });

    const mockInsertedProposal = {
      id: tempProposalId,
      proposalNumber: "PROP-2026-TEST",
      title: "Sistem Rekomendasi Skripsi Berbasis Graf",
      authorUserId: "user-mhs-001",
      authorNim: "2021081001",
      authorName: "Ahmad Mahasiswa",
      pageCount: 40,
      status: "SUBMITTED"
    };

    const insertChain = {
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([mockInsertedProposal])
    };
    (db.insert as any).mockReturnValue(insertChain);

    const created = await proposalService.createProposal(
      "user-mhs-001",
      {
        title: "Sistem Rekomendasi Skripsi Berbasis Graf",
        advisorName1: "Dr. Sutrisno, M.Kom",
        studyProgramId: 1,
        documentCategory: "PROPOSAL"
      },
      samplePdfBuffer,
      "skripsi_lengkap.pdf"
    );

    expect(created.pageCount).toBe(40);
    expect(created.authorNim).toBe("2021081001");
    expect(created.status).toBe("SUBMITTED");
  });

  it("simulates PUBLIC / GUEST user accessing the PDF -> gets sliced to exactly 10 pages", async () => {
    const { db } = await import("../../../db");

    let selectCallCount = 0;
    (db.select as any).mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        // proposal lookup
        return createSelectChain([
          {
            id: tempProposalId,
            title: "Sistem Rekomendasi Skripsi Berbasis Graf",
            storagePath: tempFilePath,
            pageCount: 40,
            status: "APPROVED"
          }
        ]);
      } else if (selectCallCount === 2) {
        // pageRules lookup
        return createSelectChain([
          {
            id: "rule-1",
            proposalId: tempProposalId,
            roleScope: "PUBLIC",
            allowedStartPage: 1,
            allowedEndPage: 10,
            allowDownloadFull: false
          }
        ]);
      } else {
        // reviewLogs lookup
        return createSelectChain([]);
      }
    });

    let sentBuffer: Buffer | null = null;
    let contentTypeHeader = "";

    const req = {
      params: { id: tempProposalId },
      headers: {},
      user: undefined // PUBLIC / GUEST (Belum Login)
    } as unknown as Request;

    const res = {
      setHeader: vi.fn((key: string, val: string) => {
        if (key.toLowerCase() === "content-type") contentTypeHeader = val;
      }),
      status: vi.fn().mockReturnThis(),
      send: vi.fn((data: Buffer) => {
        sentBuffer = data;
      })
    } as unknown as Response;

    const next = vi.fn((err) => {
      if (err) console.error("PUBLIC viewPdf error:", err);
    });

    await proposalController.viewPdf(req, res, next);

    expect(contentTypeHeader).toBe("application/pdf");
    expect(sentBuffer).not.toBeNull();

    // Verify sent PDF is trimmed by pdf-lib to 10 pages only
    const publicDoc = await PDFDocument.load(sentBuffer!);
    expect(publicDoc.getPageCount()).toBe(10);
  });

  it("simulates MAHASISWA (authenticated user) accessing the PDF -> gets full 40 pages", async () => {
    const { db } = await import("../../../db");

    let selectCallCount = 0;
    (db.select as any).mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        return createSelectChain([
          {
            id: tempProposalId,
            title: "Sistem Rekomendasi Skripsi Berbasis Graf",
            storagePath: tempFilePath,
            pageCount: 40,
            status: "APPROVED"
          }
        ]);
      } else if (selectCallCount === 2) {
        return createSelectChain([
          {
            id: "rule-1",
            proposalId: tempProposalId,
            roleScope: "PUBLIC",
            allowedStartPage: 1,
            allowedEndPage: 10,
            allowDownloadFull: false
          }
        ]);
      } else {
        return createSelectChain([]);
      }
    });

    let sentBuffer: Buffer | null = null;
    let contentTypeHeader = "";

    const req = {
      params: { id: tempProposalId },
      headers: {},
      user: {
        id: "user-mhs-001",
        name: "Ahmad Mahasiswa",
        role: "mahasiswa" // Authenticated Mahasiswa Civitas
      }
    } as unknown as Request;

    const res = {
      setHeader: vi.fn((key: string, val: string) => {
        if (key.toLowerCase() === "content-type") contentTypeHeader = val;
      }),
      status: vi.fn().mockReturnThis(),
      send: vi.fn((data: Buffer) => {
        sentBuffer = data;
      })
    } as unknown as Response;

    const next = vi.fn((err) => {
      if (err) console.error("MAHASISWA viewPdf error:", err);
    });

    await proposalController.viewPdf(req, res, next);

    expect(contentTypeHeader).toBe("application/pdf");
    expect(sentBuffer).not.toBeNull();

    // Authenticated mahasiswa gets the complete 40 pages
    const mhsDoc = await PDFDocument.load(sentBuffer!);
    expect(mhsDoc.getPageCount()).toBe(40);
  });

  it("simulates STUDENT role (role: 'student') accessing the PDF -> gets full 40 pages", async () => {
    const { db } = await import("../../../db");

    let selectCallCount = 0;
    (db.select as any).mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        return createSelectChain([
          {
            id: tempProposalId,
            title: "Sistem Rekomendasi Skripsi Berbasis Graf",
            storagePath: tempFilePath,
            pageCount: 40,
            status: "APPROVED"
          }
        ]);
      } else if (selectCallCount === 2) {
        return createSelectChain([
          {
            id: "rule-1",
            proposalId: tempProposalId,
            roleScope: "PUBLIC",
            allowedStartPage: 1,
            allowedEndPage: 10,
            allowDownloadFull: false
          }
        ]);
      } else {
        return createSelectChain([]);
      }
    });

    let sentBuffer: Buffer | null = null;
    let contentTypeHeader = "";

    const req = {
      params: { id: tempProposalId },
      headers: {},
      user: {
        id: "user-student-002",
        name: "Siti Student",
        role: "student" // Authenticated with DB default role 'student'
      }
    } as unknown as Request;

    const res = {
      setHeader: vi.fn((key: string, val: string) => {
        if (key.toLowerCase() === "content-type") contentTypeHeader = val;
      }),
      status: vi.fn().mockReturnThis(),
      send: vi.fn((data: Buffer) => {
        sentBuffer = data;
      })
    } as unknown as Response;

    const next = vi.fn((err) => {
      if (err) console.error("STUDENT viewPdf error:", err);
    });

    await proposalController.viewPdf(req, res, next);

    expect(contentTypeHeader).toBe("application/pdf");
    expect(sentBuffer).not.toBeNull();

    // Authenticated student gets the complete 40 pages
    const studentDoc = await PDFDocument.load(sentBuffer!);
    expect(studentDoc.getPageCount()).toBe(40);
  });
});
