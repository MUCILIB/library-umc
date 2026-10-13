import crypto from "crypto";
import fs from "fs";
import path from "path";
import { db } from "../../../db";
import {
  repositoryProposals,
  repositoryDocumentPageRules,
  proposalReviewLogs,
  members,
  Users,
  studyPrograms,
  faculties
} from "../../../db/schema";
import { eq, desc, and } from "drizzle-orm";
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError
} from "../../../exceptions/AppError";
import { pdfSlicingService } from "./pdf-slicing.service";
import type {
  CreateProposalInput,
  ReviewProposalInput,
  ConfigurePageRuleInput
} from "../validation/proposal.validation";

export class ProposalService {
  private uploadDir = path.join(process.cwd(), "storage", "proposals");

  constructor() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Mahasiswa submit proposal / skripsi baru
   */
  async createProposal(
    userId: string,
    input: CreateProposalInput,
    fileBuffer: Buffer,
    originalFilename: string
  ) {
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new BadRequestError("File PDF wajib diunggah");
    }

    // Magic bytes sniffing: verify file starts with %PDF-
    const magic = fileBuffer.subarray(0, 5).toString("ascii");
    if (!magic.startsWith("%PDF")) {
      throw new BadRequestError("Format file tidak valid. Berkas wajib berupa PDF asli.");
    }

    // Ambil NIM dan Nama mahasiswa dari profile member / Users
    const [user] = await db.select().from(Users).where(eq(Users.id, userId)).limit(1);
    if (!user) {
      throw new NotFoundError("Data pengguna tidak ditemukan");
    }

    const [member] = await db.select().from(members).where(eq(members.userId, userId)).limit(1);
    const nim = member?.nimNidn || "NIM_PENDING";
    const name = user.name || "Mahasiswa";

    // Hitung SHA-256 hash untuk mencegah duplikasi file
    const fileHash = crypto.createHash("sha256").update(fileBuffer).digest("hex");

    const [existingProposal] = await db
      .select()
      .from(repositoryProposals)
      .where(eq(repositoryProposals.fileHashSha256, fileHash))
      .limit(1);

    if (existingProposal) {
      throw new BadRequestError(
        "Dokumen dengan isi file yang sama persis sudah pernah diajukan sebelumnya."
      );
    }

    // Ekstrak total halaman dokumen via pdf-lib
    const pageCount = await pdfSlicingService.getPageCount(fileBuffer);

    // Simpan file ke direktori privat (storage/proposals/)
    const uniqueFilename = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.pdf`;
    const storagePath = path.join(this.uploadDir, uniqueFilename);
    await fs.promises.writeFile(storagePath, fileBuffer);

    // Generate proposal number PROP-YYYYMM-XXXX
    const datePrefix = new Date().toISOString().slice(0, 7).replace("-", "");
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const proposalNumber = `PROP-${datePrefix}-${randomSuffix}`;

    const [created] = await db
      .insert(repositoryProposals)
      .values({
        proposalNumber,
        title: input.title,
        abstract: input.abstract || null,
        keywords: input.keywords || [],
        authorUserId: userId,
        authorNim: nim,
        authorName: name,
        studyProgramId: input.studyProgramId,
        advisorName1: input.advisorName1,
        advisorName2: input.advisorName2 || null,
        documentCategory: input.documentCategory,
        status: "SUBMITTED",
        storagePath,
        fileSize: fileBuffer.length,
        pageCount,
        fileHashSha256: fileHash
      })
      .returning();

    // Buat rule default untuk PUBLIC (misal: Halaman 1 s/d Math.min(10, pageCount))
    await db.insert(repositoryDocumentPageRules).values({
      proposalId: created.id,
      roleScope: "PUBLIC",
      allowedStartPage: 1,
      allowedEndPage: Math.min(10, pageCount),
      allowDownloadFull: false,
      configuredBy: userId
    });

    // Catat review log awal SUBMIT
    await db.insert(proposalReviewLogs).values({
      proposalId: created.id,
      reviewerUserId: userId,
      action: "SUBMIT",
      notes: "Proposal diajukan oleh mahasiswa"
    });

    return created;
  }

  /**
   * Ambil daftar proposal (Admin/Staff melihat semua, Mahasiswa melihat miliknya)
   */
  async getProposals(options: {
    userId?: string;
    isStaffOrAdmin: boolean;
    status?: string;
    studyProgramId?: number;
  }) {
    let query = db.select().from(repositoryProposals);

    const conditions = [];
    if (!options.isStaffOrAdmin && options.userId) {
      conditions.push(eq(repositoryProposals.authorUserId, options.userId));
    }
    if (options.status) {
      conditions.push(eq(repositoryProposals.status, options.status));
    }
    if (options.studyProgramId) {
      conditions.push(eq(repositoryProposals.studyProgramId, options.studyProgramId));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return await query.orderBy(desc(repositoryProposals.createdAt));
  }

  /**
   * Mengambil daftar karya ilmiah mahasiswa yang telah disetujui (APPROVED) untuk E-Resources publik
   */
  async getPublishedProposals(options?: {
    search?: string;
    category?: string;
    studyProgramId?: number;
    facultyId?: number;
    yearStart?: number;
    yearEnd?: number;
  }) {
    const conditions = [eq(repositoryProposals.status, "APPROVED")];

    if (options?.category && options.category !== "Semua Kategori") {
      let cat = options.category;
      if (cat === "Skripsi") cat = "THESIS";
      else if (cat === "Proposal") cat = "PROPOSAL";
      else if (cat === "Laporan" || cat === "Jurnal" || cat === "Tesis") cat = "REPORT";
      conditions.push(eq(repositoryProposals.documentCategory, cat));
    }

    if (options?.studyProgramId) {
      conditions.push(eq(repositoryProposals.studyProgramId, options.studyProgramId));
    }

    const results = await db
      .select()
      .from(repositoryProposals)
      .where(and(...conditions))
      .orderBy(desc(repositoryProposals.createdAt));

    // Ambil semua prodi dan fakultas untuk pemetaan relasi
    const [allProdis, allFaculties] = await Promise.all([
      db.select().from(studyPrograms),
      db.select().from(faculties)
    ]);

    const prodiMap = new Map(allProdis.map((p) => [p.id, p]));
    const facultyMap = new Map(allFaculties.map((f) => [f.id, f]));

    let items = results.map((item) => {
      const prodi = item.studyProgramId ? prodiMap.get(item.studyProgramId) : null;
      const faculty = prodi && prodi.facultyId ? facultyMap.get(prodi.facultyId) : null;
      return {
        ...item,
        studyProgram: prodi ? { ...prodi, faculty: faculty || null } : null
      };
    });

    if (options?.facultyId) {
      items = items.filter((item) => item.studyProgram?.faculty?.id === options.facultyId);
    }

    if (options?.search) {
      const q = options.search.toLowerCase();
      items = items.filter((item) =>
        item.title.toLowerCase().includes(q) ||
        item.authorName.toLowerCase().includes(q) ||
        (item.abstract && item.abstract.toLowerCase().includes(q)) ||
        (item.keywords && item.keywords.some((k: string) => k.toLowerCase().includes(q)))
      );
    }

    if (options?.yearStart) {
      items = items.filter((item) => {
        const year = new Date(item.createdAt).getFullYear();
        return year >= options.yearStart!;
      });
    }

    if (options?.yearEnd) {
      items = items.filter((item) => {
        const year = new Date(item.createdAt).getFullYear();
        return year <= options.yearEnd!;
      });
    }

    return items;
  }

  /**
   * Detail proposal by ID
   */
  async getProposalById(id: string) {
    const [proposal] = await db
      .select()
      .from(repositoryProposals)
      .where(eq(repositoryProposals.id, id))
      .limit(1);

    if (!proposal) {
      throw new NotFoundError("Dokumen proposal tidak ditemukan");
    }

    const [rules, logs] = await Promise.all([
      db
        .select()
        .from(repositoryDocumentPageRules)
        .where(eq(repositoryDocumentPageRules.proposalId, id)),
      db
        .select()
        .from(proposalReviewLogs)
        .where(eq(proposalReviewLogs.proposalId, id))
        .orderBy(desc(proposalReviewLogs.createdAt))
    ]);

    let studyProgram = null;
    if (proposal.studyProgramId) {
      const [sp] = await db
        .select()
        .from(studyPrograms)
        .where(eq(studyPrograms.id, proposal.studyProgramId))
        .limit(1);
      if (sp) {
        let faculty = null;
        if (sp.facultyId) {
          const [fac] = await db
            .select()
            .from(faculties)
            .where(eq(faculties.id, sp.facultyId))
            .limit(1);
          faculty = fac || null;
        }
        studyProgram = { ...sp, faculty };
      }
    }

    return { ...proposal, pageRules: rules, reviewLogs: logs, studyProgram };
  }

  /**
   * Pustakawan / Admin review proposal (APPROVE, REVISION_REQUIRED)
   */
  async reviewProposal(
    id: string,
    reviewerUserId: string,
    input: ReviewProposalInput
  ) {
    const proposal = await this.getProposalById(id);

    let nextStatus = proposal.status;
    if (input.action === "APPROVE") {
      nextStatus = "APPROVED";
    } else if (input.action === "REVISION_REQUIRED") {
      nextStatus = "REVISION_REQUIRED";
    } else if (input.action === "UNDER_REVIEW") {
      nextStatus = "UNDER_REVIEW";
    }

    const [updated] = await db
      .update(repositoryProposals)
      .set({
        status: nextStatus,
        reviewerUserId,
        reviewNotes: input.reviewNotes || null,
        reviewedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(repositoryProposals.id, id))
      .returning();

    // Catat ke log review
    await db.insert(proposalReviewLogs).values({
      proposalId: id,
      reviewerUserId,
      action: input.action,
      notes: input.reviewNotes || null
    });

    return updated;
  }

  /**
   * Konfigurasi batas halaman (Page-Level ACL) oleh Admin/Staff
   */
  async configurePageRule(
    proposalId: string,
    configuredBy: string,
    input: ConfigurePageRuleInput
  ) {
    const proposal = await this.getProposalById(proposalId);

    if (input.allowedStartPage > proposal.pageCount) {
      throw new BadRequestError("Halaman awal tidak boleh melebihi total halaman dokumen");
    }

    const effectiveEndPage = Math.min(input.allowedEndPage, proposal.pageCount);

    // Upsert rule untuk roleScope terkait
    const [existing] = await db
      .select()
      .from(repositoryDocumentPageRules)
      .where(
        and(
          eq(repositoryDocumentPageRules.proposalId, proposalId),
          eq(repositoryDocumentPageRules.roleScope, input.roleScope)
        )
      )
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(repositoryDocumentPageRules)
        .set({
          allowedStartPage: input.allowedStartPage,
          allowedEndPage: effectiveEndPage,
          allowDownloadFull: input.allowDownloadFull,
          configuredBy,
          updatedAt: new Date()
        })
        .where(eq(repositoryDocumentPageRules.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await db
      .insert(repositoryDocumentPageRules)
      .values({
        proposalId,
        roleScope: input.roleScope,
        allowedStartPage: input.allowedStartPage,
        allowedEndPage: effectiveEndPage,
        allowDownloadFull: input.allowDownloadFull,
        configuredBy
      })
      .returning();

    return created;
  }

  /**
   * Mengambil file stream/buffer PDF yang telah dipotong sesuai hak akses requester
   */
  async getDocumentPdf(
    proposalId: string,
    requester: { userId?: string; role?: string }
  ): Promise<{
    buffer: Buffer;
    totalDocumentPages: number;
    startPage: number;
    endPage: number;
    isRestricted: boolean;
  }> {
    const proposal = await this.getProposalById(proposalId);

    if (!fs.existsSync(proposal.storagePath)) {
      throw new NotFoundError("File fisik dokumen tidak ditemukan di penyimpanan server");
    }

    const masterBuffer = await fs.promises.readFile(proposal.storagePath);
    const totalPages = proposal.pageCount;

    // Hak akses penuh jika Admin, Staff, atau Mahasiswa pemilik berkas itu sendiri
    const isOwner = requester.userId && requester.userId === proposal.authorUserId;
    const isStaffOrAdmin =
      requester.role === "super_admin" ||
      requester.role === "staff" ||
      requester.role === "admin";
    const isCivitasMahasiswa =
      requester.role === "mahasiswa" || requester.role === "student";

    if (isStaffOrAdmin || isOwner || isCivitasMahasiswa) {
      // Full access
      return {
        buffer: masterBuffer,
        totalDocumentPages: totalPages,
        startPage: 1,
        endPage: totalPages,
        isRestricted: false
      };
    }

    // Role Mahasiswa/Member yang terautentikasi (bukan pemilik)
    const isStudentOrMember = requester.role === "student" || requester.role === "member";
    const targetScope = isStudentOrMember ? "STUDENT" : "PUBLIC";

    // Ambil rule konfigurasi halaman
    const [rule] = await db
      .select()
      .from(repositoryDocumentPageRules)
      .where(
        and(
          eq(repositoryDocumentPageRules.proposalId, proposalId),
          eq(repositoryDocumentPageRules.roleScope, targetScope)
        )
      )
      .limit(1);

    // Default jika tidak ada rule khusus:
    // Jika Student login: beri full atau 1-totalPages; jika Public: batasi 1-10
    const startPage = rule ? rule.allowedStartPage : 1;
    const endPage = rule
      ? Math.min(rule.allowedEndPage, totalPages)
      : isStudentOrMember
        ? totalPages
        : Math.min(10, totalPages);

    // Potong PDF menggunakan pdf-lib engine
    const slicedBuffer = await pdfSlicingService.slicePdf(
      masterBuffer,
      startPage,
      endPage
    );

    return {
      buffer: slicedBuffer,
      totalDocumentPages: totalPages,
      startPage,
      endPage,
      isRestricted: endPage < totalPages
    };
  }

  /**
   * Mahasiswa memperbarui atau merevisi proposal
   */
  async updateProposal(
    id: string,
    userId: string,
    input: Partial<CreateProposalInput>,
    fileBuffer?: Buffer,
    originalFilename?: string,
    isStaffOrAdmin: boolean = false
  ) {
    const proposal = await this.getProposalById(id);
    if (!isStaffOrAdmin && proposal.authorUserId !== userId) {
      throw new ForbiddenError("Anda tidak memiliki hak untuk mengedit proposal ini");
    }

    const updates: any = {
      updatedAt: new Date()
    };

    if (input.title) updates.title = input.title;
    if (input.abstract !== undefined) updates.abstract = input.abstract;
    if (input.advisorName1) updates.advisorName1 = input.advisorName1;
    if (input.advisorName2 !== undefined) updates.advisorName2 = input.advisorName2;
    if (input.studyProgramId) updates.studyProgramId = input.studyProgramId;
    if (input.documentCategory) updates.documentCategory = input.documentCategory;

    if (fileBuffer && fileBuffer.length > 0) {
      const magic = fileBuffer.subarray(0, 5).toString("ascii");
      if (!magic.startsWith("%PDF")) {
        throw new BadRequestError("Format file tidak valid. Berkas wajib berupa PDF asli.");
      }
      const pageCount = await pdfSlicingService.getPageCount(fileBuffer);
      const uniqueFilename = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.pdf`;
      const storagePath = path.join(this.uploadDir, uniqueFilename);
      await fs.promises.writeFile(storagePath, fileBuffer);
      const fileHash = crypto.createHash("sha256").update(fileBuffer).digest("hex");

      if (fs.existsSync(proposal.storagePath)) {
        try {
          await fs.promises.unlink(proposal.storagePath);
        } catch (e) {
          console.error("Gagal menghapus file lama:", e);
        }
      }

      updates.storagePath = storagePath;
      updates.pageCount = pageCount;
      updates.fileSize = fileBuffer.length;
      updates.fileHashSha256 = fileHash;
      updates.status = "SUBMITTED";
    } else if (proposal.status === "REVISION_REQUIRED") {
      updates.status = "SUBMITTED";
    }

    const [updated] = await db
      .update(repositoryProposals)
      .set(updates)
      .where(eq(repositoryProposals.id, id))
      .returning();

    await db.insert(proposalReviewLogs).values({
      proposalId: id,
      reviewerUserId: userId,
      action: "RESUBMIT",
      notes: "Naskah diperbarui oleh mahasiswa"
    });

    return updated;
  }

  /**
   * Menghapus proposal (hanya jika belum APPROVED, atau oleh Admin)
   */
  async deleteProposal(id: string, userId: string, isStaffOrAdmin: boolean) {
    const proposal = await this.getProposalById(id);
    if (!isStaffOrAdmin && proposal.authorUserId !== userId) {
      throw new ForbiddenError("Anda tidak memiliki hak untuk menghapus proposal ini");
    }
    if (!isStaffOrAdmin && proposal.status === "APPROVED") {
      throw new BadRequestError("Dokumen yang telah disetujui tidak dapat dihapus oleh mahasiswa");
    }

    if (fs.existsSync(proposal.storagePath)) {
      try {
        await fs.promises.unlink(proposal.storagePath);
      } catch (e) {
        console.error("Gagal menghapus file fisik:", e);
      }
    }

    await db.delete(repositoryProposals).where(eq(repositoryProposals.id, id));
    return { id };
  }
}

export const proposalService = new ProposalService();
