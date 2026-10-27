import { db } from "../../../db";
import {
  bibliographies,
  bibliographyContents,
  bibliographyAuthors,
  authors,
  publishers,
  categories
} from "../../../db/schema";
import { eq, and, isNull, ilike, or, desc, sql } from "drizzle-orm";
import { StorageService } from "../../repository/service/storage.service";
import { pdfSlicingService } from "../../repository/service/pdf-slicing.service";
import { NotFoundError, BadRequestError } from "../../../exceptions/AppError";
import type {
  CreateEbookInput,
  UpdateEbookInput,
  QueryEbookInput
} from "../validation/ebook.validation";

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export class EbookService {
  private storageService: StorageService;

  constructor() {
    this.storageService = new StorageService("ebooks");
  }

  private async resolveOrCreateAuthor(tx: any, authorName: string): Promise<number> {
    const normalized = normalizeName(authorName);
    const existing = await tx.query.authors.findFirst({
      where: eq(authors.normalizedName, normalized)
    });
    if (existing) return existing.id;
    const [created] = await tx
      .insert(authors)
      .values({ name: authorName.trim(), normalizedName: normalized })
      .returning();
    return created.id;
  }

  private async resolveOrCreatePublisher(
    tx: any,
    publisherName: string
  ): Promise<number | null> {
    if (!publisherName.trim()) return null;
    const normalized = normalizeName(publisherName);
    const existing = await tx.query.publishers.findFirst({
      where: eq(publishers.normalizedName, normalized)
    });
    if (existing) return existing.id;
    const [created] = await tx
      .insert(publishers)
      .values({ name: publisherName.trim(), normalizedName: normalized })
      .returning();
    return created.id;
  }

  async create(data: CreateEbookInput, file?: Express.Multer.File) {
    let storageKey = "";
    let pageCount = 0;
    let fileSize = 0;

    if (file) {
      if (!file.mimetype.includes("pdf") && !file.buffer.subarray(0, 5).toString().startsWith("%PDF")) {
        throw new BadRequestError("Berkas e-book harus berformat PDF yang valid");
      }
      try {
        pageCount = await pdfSlicingService.getPageCount(file.buffer);
      } catch (err: any) {
        throw new BadRequestError(`Gagal membaca berkas PDF: ${err?.message || "File corrupt"}`);
      }

      fileSize = file.size || file.buffer.length;
      const cleanFilename = `ebook-${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      storageKey = await this.storageService.save(cleanFilename, file.buffer);
    }

    return await db.transaction(async (tx) => {
      let publisherId = data.publisherId || null;
      if (!publisherId && data.publisherName) {
        publisherId = await this.resolveOrCreatePublisher(tx, data.publisherName);
      }

      const [newBib] = await tx
        .insert(bibliographies)
        .values({
          title: data.title.trim(),
          isbn: data.isbn || null,
          publishYear: data.publishYear || null,
          edition: data.edition || null,
          categoryId: data.categoryId || null,
          publisherId: publisherId,
          description: data.description || null,
          image: data.image || null,
          type: "ebook",
          stock: 1
        })
        .returning();

      if (data.authorName) {
        const authorId = await this.resolveOrCreateAuthor(tx, data.authorName);
        await tx.insert(bibliographyAuthors).values({
          bibliographyId: newBib.id,
          authorId,
          position: 1,
          role: "author"
        });
      } else if (data.authorId) {
        await tx.insert(bibliographyAuthors).values({
          bibliographyId: newBib.id,
          authorId: data.authorId,
          position: 1,
          role: "author"
        });
      }

      const [newContent] = await tx
        .insert(bibliographyContents)
        .values({
          bibliographyId: newBib.id,
          contentType: "pdf",
          contentUrl: storageKey,
          fileSize: fileSize,
          pageCount: pageCount,
          isFullAccess: data.isFullAccess ?? true,
          previewStartPage: data.previewStartPage ?? 1,
          previewEndPage: data.previewEndPage ?? 10,
          allowDownload: data.allowDownload ?? false
        })
        .returning();

      return {
        ...newBib,
        content: newContent
      };
    });
  }

  async getAll(query: QueryEbookInput) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const offset = (page - 1) * limit;

    const conditions = [
      eq(bibliographies.type, "ebook"),
      isNull(bibliographies.deletedAt)
    ];

    if (query.categoryId) {
      conditions.push(eq(bibliographies.categoryId, query.categoryId));
    }

    if (query.search?.trim()) {
      const searchTerm = `%${query.search.trim()}%`;
      conditions.push(
        or(
          ilike(bibliographies.title, searchTerm),
          ilike(bibliographies.isbn, searchTerm),
          ilike(bibliographies.description, searchTerm)
        )!
      );
    }

    const whereClause = and(...conditions);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(bibliographies)
      .where(whereClause);

    const total = Number(countResult?.count || 0);

    const rows = await db.query.bibliographies.findMany({
      where: whereClause,
      limit,
      offset,
      orderBy: [desc(bibliographies.createdAt)],
      with: {
        category: true,
        publisher: true,
        bibliographyAuthors: {
          with: {
            author: true
          }
        },
        contents: true
      }
    });

    const data = rows.map((b) => {
      const primaryContent = b.contents?.[0] || null;
      return {
        id: b.id,
        title: b.title,
        isbn: b.isbn,
        publishYear: b.publishYear,
        edition: b.edition,
        image: b.image,
        description: b.description,
        type: b.type,
        category: b.category,
        publisher: b.publisher,
        authors: b.bibliographyAuthors.map((ba) => ({
          id: ba.author?.id,
          name: ba.author?.name,
          role: ba.role
        })),
        content: primaryContent
          ? {
              id: primaryContent.id,
              contentType: primaryContent.contentType,
              fileSize: primaryContent.fileSize,
              pageCount: primaryContent.pageCount,
              isFullAccess: primaryContent.isFullAccess,
              previewStartPage: primaryContent.previewStartPage,
              previewEndPage: primaryContent.previewEndPage,
              allowDownload: primaryContent.allowDownload,
              hasFile: Boolean(primaryContent.contentUrl)
            }
          : null,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt
      };
    });

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getById(id: string) {
    const bib = await db.query.bibliographies.findFirst({
      where: and(
        eq(bibliographies.id, id),
        eq(bibliographies.type, "ebook"),
        isNull(bibliographies.deletedAt)
      ),
      with: {
        category: true,
        publisher: true,
        bibliographyAuthors: {
          with: {
            author: true
          }
        },
        contents: true
      }
    });

    if (!bib) {
      throw new NotFoundError("E-Book tidak ditemukan");
    }

    const primaryContent = bib.contents?.[0] || null;

    return {
      id: bib.id,
      title: bib.title,
      isbn: bib.isbn,
      publishYear: bib.publishYear,
      edition: bib.edition,
      image: bib.image,
      description: bib.description,
      type: bib.type,
      category: bib.category,
      publisher: bib.publisher,
      authors: bib.bibliographyAuthors.map((ba) => ({
        id: ba.author?.id,
        name: ba.author?.name,
        role: ba.role
      })),
      content: primaryContent
        ? {
            id: primaryContent.id,
            contentType: primaryContent.contentType,
            fileSize: primaryContent.fileSize,
            pageCount: primaryContent.pageCount,
            isFullAccess: primaryContent.isFullAccess,
            previewStartPage: primaryContent.previewStartPage,
            previewEndPage: primaryContent.previewEndPage,
            allowDownload: primaryContent.allowDownload,
            hasFile: Boolean(primaryContent.contentUrl)
          }
        : null,
      createdAt: bib.createdAt,
      updatedAt: bib.updatedAt
    };
  }

  async update(id: string, data: UpdateEbookInput, file?: Express.Multer.File) {
    const existing = await this.getById(id);

    return await db.transaction(async (tx) => {
      let publisherId: number | null | undefined = data.publisherId;
      if (publisherId === undefined && data.publisherName) {
        publisherId = await this.resolveOrCreatePublisher(tx, data.publisherName);
      }

      const updateValues: Record<string, any> = {
        updatedAt: new Date()
      };
      if (data.title !== undefined) updateValues.title = data.title.trim();
      if (data.isbn !== undefined) updateValues.isbn = data.isbn || null;
      if (data.publishYear !== undefined) updateValues.publishYear = data.publishYear || null;
      if (data.edition !== undefined) updateValues.edition = data.edition || null;
      if (data.categoryId !== undefined) updateValues.categoryId = data.categoryId || null;
      if (publisherId !== undefined) updateValues.publisherId = publisherId;
      if (data.description !== undefined) updateValues.description = data.description || null;
      if (data.image !== undefined) updateValues.image = data.image || null;

      await tx
        .update(bibliographies)
        .set(updateValues)
        .where(eq(bibliographies.id, id));

      if (data.authorName) {
        const authorId = await this.resolveOrCreateAuthor(tx, data.authorName);
        await tx
          .delete(bibliographyAuthors)
          .where(eq(bibliographyAuthors.bibliographyId, id));
        await tx.insert(bibliographyAuthors).values({
          bibliographyId: id,
          authorId,
          position: 1,
          role: "author"
        });
      }

      // Handle Content Update
      const existingContent = await tx.query.bibliographyContents.findFirst({
        where: and(
          eq(bibliographyContents.bibliographyId, id),
          isNull(bibliographyContents.deletedAt)
        )
      });

      let storageKey = existingContent?.contentUrl || "";
      let pageCount = existingContent?.pageCount || 0;
      let fileSize = existingContent?.fileSize || 0;

      if (file) {
        if (!file.mimetype.includes("pdf") && !file.buffer.subarray(0, 5).toString().startsWith("%PDF")) {
          throw new BadRequestError("Berkas e-book harus berformat PDF yang valid");
        }
        pageCount = await pdfSlicingService.getPageCount(file.buffer);
        fileSize = file.size || file.buffer.length;
        const cleanFilename = `ebook-${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        storageKey = await this.storageService.save(cleanFilename, file.buffer);
      }

      if (existingContent) {
        const contentUpdates: Record<string, any> = {
          updatedAt: new Date()
        };
        if (file) {
          contentUpdates.contentUrl = storageKey;
          contentUpdates.pageCount = pageCount;
          contentUpdates.fileSize = fileSize;
        }
        if (data.isFullAccess !== undefined) contentUpdates.isFullAccess = data.isFullAccess;
        if (data.previewStartPage !== undefined) contentUpdates.previewStartPage = data.previewStartPage;
        if (data.previewEndPage !== undefined) contentUpdates.previewEndPage = data.previewEndPage;
        if (data.allowDownload !== undefined) contentUpdates.allowDownload = data.allowDownload;

        await tx
          .update(bibliographyContents)
          .set(contentUpdates)
          .where(eq(bibliographyContents.id, existingContent.id));
      } else if (file) {
        await tx.insert(bibliographyContents).values({
          bibliographyId: id,
          contentType: "pdf",
          contentUrl: storageKey,
          fileSize: fileSize,
          pageCount: pageCount,
          isFullAccess: data.isFullAccess ?? true,
          previewStartPage: data.previewStartPage ?? 1,
          previewEndPage: data.previewEndPage ?? 10,
          allowDownload: data.allowDownload ?? false
        });
      }

      return await this.getById(id);
    });
  }

  async delete(id: string) {
    const bib = await this.getById(id);
    const now = new Date();

    await db.transaction(async (tx) => {
      await tx
        .update(bibliographies)
        .set({ deletedAt: now })
        .where(eq(bibliographies.id, id));

      await tx
        .update(bibliographyContents)
        .set({ deletedAt: now })
        .where(eq(bibliographyContents.bibliographyId, id));
    });

    return { message: "E-Book berhasil dihapus", id };
  }

  async getStreamPdf(
    id: string,
    requester: { userId?: string; role?: string; email?: string },
    options?: { forcePublicPreview?: boolean }
  ) {
    const bib = await db.query.bibliographies.findFirst({
      where: and(
        eq(bibliographies.id, id),
        eq(bibliographies.type, "ebook"),
        isNull(bibliographies.deletedAt)
      ),
      with: {
        contents: true
      }
    });

    if (!bib) {
      throw new NotFoundError("E-Book tidak ditemukan");
    }

    const content = bib.contents?.[0];
    if (!content || !content.contentUrl) {
      throw new NotFoundError("Berkas PDF e-book belum diunggah");
    }

    const fullPdfBuffer = await this.storageService.read(content.contentUrl);
    const totalPages = content.pageCount || (await pdfSlicingService.getPageCount(fullPdfBuffer));

    // Role check: Admin, staff, student, lecturer, member get full access
    const isPrivileged =
      Boolean(requester.userId) &&
      ["super_admin", "admin", "staff", "student", "lecturer", "member"].includes(
        requester.role || ""
      );

    const allowFull =
      (!options?.forcePublicPreview && content.isFullAccess) || isPrivileged;

    if (allowFull) {
      return {
        buffer: fullPdfBuffer,
        totalDocumentPages: totalPages,
        startPage: 1,
        endPage: totalPages,
        isRestricted: false,
        allowDownload: content.allowDownload ?? false,
        title: bib.title
      };
    }

    // Slicing for guest preview
    const startPage = Math.max(1, content.previewStartPage || 1);
    const endPage = Math.min(totalPages, Math.max(startPage, content.previewEndPage || 10));

    const slicedBuffer = await pdfSlicingService.slicePdf(
      fullPdfBuffer,
      startPage,
      endPage
    );

    return {
      buffer: slicedBuffer,
      totalDocumentPages: totalPages,
      startPage,
      endPage,
      isRestricted: true,
      allowDownload: false,
      title: bib.title
    };
  }
}

export const ebookService = new EbookService();
