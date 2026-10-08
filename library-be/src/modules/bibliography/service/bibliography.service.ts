import { db } from "../../../db";
import {
  bibliographies, bibliographyAuthors, bibliographySubjects,
  bibliographyFaculties, bibliographyStudyPrograms,
  authors, subjects, publishers, publicationPlaces, items, studyPrograms
} from "../../../db/schema";
import { eq, and, isNull, ilike, or, sql, desc, asc, inArray, notExists } from "drizzle-orm";
import type { CreateBibliographyData, UpdateBibliographyData, BibliographyQuery } from "../validation/bibliography.validation";
import { syncCollectionAvailableStock } from "../../shared/utils/stock-sync";

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function cleanIsbn(val?: string | null): string | null {
  if (!val) return null;
  const cleaned = val.trim().replace(/^ISBN[:\s]*/i, "").trim();
  return cleaned || null;
}

export class BibliographyService {

  private async resolveOrCreateAuthor(tx: any, authorName: string): Promise<number> {
    const normalized = normalizeName(authorName);
    const existing = await tx.query.authors.findFirst({ where: eq(authors.normalizedName, normalized) });
    if (existing) return existing.id;
    const [created] = await tx.insert(authors).values({ name: authorName.trim(), normalizedName: normalized }).returning();
    return created.id;
  }

  private async resolveOrCreateSubject(tx: any, subjectName: string): Promise<number> {
    const normalized = normalizeName(subjectName);
    const existing = await tx.query.subjects.findFirst({ where: eq(subjects.normalizedName, normalized) });
    if (existing) return existing.id;
    const [created] = await tx.insert(subjects).values({ name: subjectName.trim(), normalizedName: normalized }).returning();
    return created.id;
  }

  private async resolveOrCreatePublisher(tx: any, publisherName: string): Promise<number | null> {
    if (!publisherName.trim()) return null;
    const normalized = normalizeName(publisherName);
    const existing = await tx.query.publishers.findFirst({ where: eq(publishers.normalizedName, normalized) });
    if (existing) return existing.id;
    const [created] = await tx.insert(publishers).values({ name: publisherName.trim(), normalizedName: normalized }).returning();
    return created.id;
  }

  private async resolveOrCreatePublicationPlace(tx: any, placeName: string): Promise<number | null> {
    if (!placeName.trim()) return null;
    const normalized = normalizeName(placeName);
    const existing = await tx.query.publicationPlaces.findFirst({ where: eq(publicationPlaces.normalizedName, normalized) });
    if (existing) return existing.id;
    const [created] = await tx.insert(publicationPlaces).values({ name: placeName.trim(), normalizedName: normalized }).returning();
    return created.id;
  }

  private async syncAuthors(tx: any, bibliographyId: string, authorList: { name: string; role: string }[]) {
    await tx.delete(bibliographyAuthors).where(eq(bibliographyAuthors.bibliographyId, bibliographyId));
    for (let i = 0; i < authorList.length; i++) {
      const a = authorList[i];
      const authorId = await this.resolveOrCreateAuthor(tx, a.name);
      await tx.insert(bibliographyAuthors).values({
        bibliographyId,
        authorId,
        role: a.role || "primary",
        position: i + 1,
      });
    }
  }

  private async syncSubjects(tx: any, bibliographyId: string, subjectList: { name: string }[]) {
    await tx.delete(bibliographySubjects).where(eq(bibliographySubjects.bibliographyId, bibliographyId));
    for (const s of subjectList) {
      const subjectId = await this.resolveOrCreateSubject(tx, s.name);
      await tx.insert(bibliographySubjects).values({ bibliographyId, subjectId });
    }
  }

  private async syncFaculties(tx: any, bibliographyId: string, facultyIds: number[]) {
    await tx.delete(bibliographyFaculties).where(eq(bibliographyFaculties.bibliographyId, bibliographyId));
    for (const fid of facultyIds) {
      await tx.insert(bibliographyFaculties).values({ bibliographyId, facultyId: fid });
    }
  }

  private async syncStudyPrograms(tx: any, bibliographyId: string, studyProgramIds: number[]) {
    await tx.delete(bibliographyStudyPrograms).where(eq(bibliographyStudyPrograms.bibliographyId, bibliographyId));
    for (const spid of studyProgramIds) {
      await tx.insert(bibliographyStudyPrograms).values({ bibliographyId, studyProgramId: spid });
    }
  }

  async create(data: CreateBibliographyData) {
    const result = await db.transaction(async (tx) => {
      let publisherId = data.publisherId || null;
      if ((data as any).publisherName) {
        const resolvedId = await this.resolveOrCreatePublisher(tx, (data as any).publisherName);
        if (resolvedId) publisherId = resolvedId;
      }
      let publicationPlaceId = data.publicationPlaceId || null;
      if ((data as any).publishPlace) {
        const resolvedId = await this.resolveOrCreatePublicationPlace(tx, (data as any).publishPlace);
        if (resolvedId) publicationPlaceId = resolvedId;
      }
      let resolvedIsbn = data.isbn ? cleanIsbn(data.isbn) : null;
      let resolvedIssn = data.issn ? data.issn.replace(/^ISSN[:\s]*/i, "").trim() : null;
      let resolvedLegacyIsbnIssn = cleanIsbn(data.isbnIssn);

      if (!resolvedIsbn && !resolvedIssn && resolvedLegacyIsbnIssn) {
        if (/^ISSN\s/i.test(resolvedLegacyIsbnIssn) || /^\d{4}-\d{3}[\dX]$/i.test(resolvedLegacyIsbnIssn)) {
          resolvedIssn = resolvedLegacyIsbnIssn.replace(/^ISSN\s*/i, "").trim();
        } else {
          resolvedIsbn = resolvedLegacyIsbnIssn;
        }
      }
      if (!resolvedLegacyIsbnIssn) {
        resolvedLegacyIsbnIssn = resolvedIsbn || (resolvedIssn ? `ISSN ${resolvedIssn}` : null);
      }

      const insertData: any = {
        title: data.title,
        description: data.description || null,
        image: data.image || null,
        type: data.type || null,
        isbn: resolvedIsbn,
        issn: resolvedIssn,
        isbnIssn: resolvedLegacyIsbnIssn,
        edition: data.edition || null,
        publishYear: data.publishYear || null,
        collation: data.collation || null,
        seriesTitle: data.seriesTitle || null,
        callNumber: data.callNumber || null,
        classification: data.classification || null,
        notes: data.notes || null,
        sor: data.sor || null,
        gmdId: data.gmdId || null,
        collectionTypeId: data.collectionTypeId || null,
        languageId: data.languageId || null,
        publicationPlaceId: publicationPlaceId,
        publisherId: publisherId,
        stock: 0,
        isPopular: data.isPopular ?? false,
      };
      const [bib] = await tx.insert(bibliographies).values(insertData).returning();
      if (data.authors && data.authors.length > 0) await this.syncAuthors(tx, bib.id, data.authors);
      if (data.subjects && data.subjects.length > 0) await this.syncSubjects(tx, bib.id, data.subjects);

      let resolvedFacultyIds = data.facultyIds ? [...data.facultyIds] : [];
      if (data.studyProgramIds && data.studyProgramIds.length > 0) {
        const spRows = await tx.select({ facultyId: studyPrograms.facultyId })
          .from(studyPrograms)
          .where(inArray(studyPrograms.id, data.studyProgramIds));
        for (const sp of spRows) {
          if (sp.facultyId && !resolvedFacultyIds.includes(sp.facultyId)) {
            resolvedFacultyIds.push(sp.facultyId);
          }
        }
      }
      if (resolvedFacultyIds.length > 0) await this.syncFaculties(tx, bib.id, resolvedFacultyIds);
      if (data.studyProgramIds && data.studyProgramIds.length > 0) await this.syncStudyPrograms(tx, bib.id, data.studyProgramIds);
      return bib;
    });
    return this.getById(result.id);
  }

  async update(id: string, data: UpdateBibliographyData) {
    await db.transaction(async (tx) => {
      let publisherId = data.publisherId;
      if ((data as any).publisherName !== undefined) {
        const resolvedId = (data as any).publisherName
          ? await this.resolveOrCreatePublisher(tx, (data as any).publisherName)
          : null;
        publisherId = resolvedId !== null ? resolvedId : undefined;
      }
      let publicationPlaceId = data.publicationPlaceId;
      if ((data as any).publishPlace !== undefined) {
        const resolvedId = (data as any).publishPlace
          ? await this.resolveOrCreatePublicationPlace(tx, (data as any).publishPlace)
          : null;
        publicationPlaceId = resolvedId !== null ? resolvedId : undefined;
      }
      const updateData: any = {};
      for (const key of Object.keys(data)) {
        if (key === "authors" || key === "subjects" || key === "publisherName" || key === "publishPlace" || key === "facultyIds" || key === "studyProgramIds") continue;
        if (data[key as keyof UpdateBibliographyData] !== undefined) {
          updateData[key] = data[key as keyof UpdateBibliographyData];
        }
      }
      if (updateData.isbn !== undefined) {
        updateData.isbn = updateData.isbn ? cleanIsbn(updateData.isbn) : null;
      }
      if (updateData.issn !== undefined) {
        updateData.issn = updateData.issn ? updateData.issn.replace(/^ISSN[:\s]*/i, "").trim() : null;
      }
      if (updateData.isbnIssn !== undefined) {
        updateData.isbnIssn = cleanIsbn(updateData.isbnIssn);
        if (!updateData.isbn && !updateData.issn && updateData.isbnIssn) {
          if (/^ISSN\s/i.test(updateData.isbnIssn) || /^\d{4}-\d{3}[\dX]$/i.test(updateData.isbnIssn)) {
            updateData.issn = updateData.isbnIssn.replace(/^ISSN\s*/i, "").trim();
          } else {
            updateData.isbn = updateData.isbnIssn;
          }
        }
      }
      if ((updateData.isbn !== undefined || updateData.issn !== undefined) && updateData.isbnIssn === undefined) {
        updateData.isbnIssn = updateData.isbn || (updateData.issn ? `ISSN ${updateData.issn}` : null);
      }
      if (publisherId !== undefined) {
        updateData.publisherId = publisherId;
      }
      if (publicationPlaceId !== undefined) {
        updateData.publicationPlaceId = publicationPlaceId;
      }
      updateData.updatedAt = new Date();
      if (Object.keys(updateData).length > 1) {
        await tx.update(bibliographies).set(updateData).where(eq(bibliographies.id, id));
      }
      if (data.authors !== undefined) await this.syncAuthors(tx, id, data.authors);
      if (data.subjects !== undefined) await this.syncSubjects(tx, id, data.subjects);

      if (data.facultyIds !== undefined || data.studyProgramIds !== undefined) {
        let facultyIds = data.facultyIds !== undefined ? [...data.facultyIds] : undefined;
        if (data.studyProgramIds && data.studyProgramIds.length > 0) {
          const spRows = await tx.select({ facultyId: studyPrograms.facultyId })
            .from(studyPrograms)
            .where(inArray(studyPrograms.id, data.studyProgramIds));
          if (facultyIds === undefined) {
            const currentFacs = await tx.select({ facultyId: bibliographyFaculties.facultyId })
              .from(bibliographyFaculties)
              .where(eq(bibliographyFaculties.bibliographyId, id));
            facultyIds = currentFacs.map((f: any) => f.facultyId);
          }
          for (const sp of spRows) {
            if (sp.facultyId && !facultyIds.includes(sp.facultyId)) {
              facultyIds.push(sp.facultyId);
            }
          }
        }
        if (facultyIds !== undefined) await this.syncFaculties(tx, id, facultyIds);
        if (data.studyProgramIds !== undefined) await this.syncStudyPrograms(tx, id, data.studyProgramIds);
      }
    });
    return this.getById(id);
  }

  async getById(id: string) {
    const bib = await db.query.bibliographies.findFirst({
      where: and(eq(bibliographies.id, id), isNull(bibliographies.deletedAt)),
      with: {
        publisher: true,
        language: true,
        publicationPlace: true,
        gmd: true,
        collectionType: true,
        bibliographyAuthors: { with: { author: true } },
        bibliographySubjects: { with: { subject: true } },
        bibliographyFaculties: { with: { faculty: true } },
        bibliographyStudyPrograms: { with: { studyProgram: { with: { faculty: true } } } },
        items: { where: isNull(items.deletedAt), with: { location: true } },
      },
    });
    if (!bib) return null;
    const totalItems = bib.items.length;
    const availableItems = bib.items.filter((i: any) => i.status === "available").length;
    return {
      ...bib,
      authors: bib.bibliographyAuthors.map((ba: any) => ({ id: ba.author.id, name: ba.author.name, role: ba.role })),
      subjects: bib.bibliographySubjects.map((bs: any) => ({ id: bs.subject.id, name: bs.subject.name })),
      faculties: bib.bibliographyFaculties.map((bf: any) => ({ id: bf.faculty.id, name: bf.faculty.name, code: bf.faculty.code })),
      studyPrograms: bib.bibliographyStudyPrograms.map((bsp: any) => ({
        id: bsp.studyProgram.id,
        name: bsp.studyProgram.name,
        code: bsp.studyProgram.code,
        faculty: { id: bsp.studyProgram.faculty.id, name: bsp.studyProgram.faculty.name }
      })),
      totalItems,
      availableItems,
      bibliographyAuthors: undefined,
      bibliographySubjects: undefined,
      bibliographyFaculties: undefined,
      bibliographyStudyPrograms: undefined,
    };
  }

  async list(query: BibliographyQuery) {
    const conditions: any[] = [isNull(bibliographies.deletedAt)];
    if (query.isPopular !== undefined) {
      conditions.push(eq(bibliographies.isPopular, query.isPopular));
    }
    if (query.q) {
      const term = `%${query.q}%`;
      conditions.push(or(
        ilike(bibliographies.title, term),
        ilike(bibliographies.isbn, term),
        ilike(bibliographies.issn, term),
        ilike(bibliographies.isbnIssn, term),
        ilike(bibliographies.callNumber, term),
        ilike(bibliographies.sor, term),
      ));
    }
    if (query.title) conditions.push(ilike(bibliographies.title, `%${query.title}%`));
    if (query.isbn) conditions.push(ilike(bibliographies.isbn, `%${query.isbn}%`));
    if (query.issn) conditions.push(ilike(bibliographies.issn, `%${query.issn}%`));
    if (query.isbnIssn) {
      conditions.push(or(
        ilike(bibliographies.isbn, `%${query.isbnIssn}%`),
        ilike(bibliographies.issn, `%${query.isbnIssn}%`),
        ilike(bibliographies.isbnIssn, `%${query.isbnIssn}%`)
      ));
    }
    if (query.callNumber) conditions.push(ilike(bibliographies.callNumber, `%${query.callNumber}%`));
    if (query.gmdId) conditions.push(eq(bibliographies.gmdId, query.gmdId));
    if (query.languageId) conditions.push(eq(bibliographies.languageId, query.languageId));
    if (query.publisher) {
      const publisherBibs = await db.select({ bibId: bibliographies.id })
        .from(bibliographies)
        .innerJoin(publishers, eq(bibliographies.publisherId, publishers.id))
        .where(ilike(publishers.name, `%${query.publisher}%`));
      const ids = publisherBibs.map((r: any) => r.bibId);
      if (ids.length > 0) conditions.push(inArray(bibliographies.id, ids));
      else return { items: [], total: 0, page: query.page, limit: query.limit, totalPages: 0 };
    }
    if (query.publishYearFrom) conditions.push(sql`${bibliographies.publishYear} >= ${query.publishYearFrom}`);
    if (query.publishYearTo) conditions.push(sql`${bibliographies.publishYear} <= ${query.publishYearTo}`);

    if (query.author) {
      const authorBibs = await db.select({ bibId: bibliographyAuthors.bibliographyId })
        .from(bibliographyAuthors).innerJoin(authors, eq(bibliographyAuthors.authorId, authors.id))
        .where(ilike(authors.name, `%${query.author}%`));
      const ids = authorBibs.map((r: any) => r.bibId);
      if (ids.length > 0) conditions.push(inArray(bibliographies.id, ids));
      else return { items: [], total: 0, page: query.page, limit: query.limit, totalPages: 0 };
    }
    if (query.subject) {
      const subjectBibs = await db.select({ bibId: bibliographySubjects.bibliographyId })
        .from(bibliographySubjects).innerJoin(subjects, eq(bibliographySubjects.subjectId, subjects.id))
        .where(ilike(subjects.name, `%${query.subject}%`));
      const ids = subjectBibs.map((r: any) => r.bibId);
      if (ids.length > 0) conditions.push(inArray(bibliographies.id, ids));
      else return { items: [], total: 0, page: query.page, limit: query.limit, totalPages: 0 };
    }

    if (query.facultyId) {
      conditions.push(
        sql`"bibliographies"."id" IN (
          SELECT bf.bibliography_id FROM bibliography_faculties bf WHERE bf.faculty_id = ${query.facultyId}
          UNION
          SELECT bsp.bibliography_id FROM bibliography_study_programs bsp 
          INNER JOIN study_programs sp ON bsp.study_program_id = sp.id 
          WHERE sp.faculty_id = ${query.facultyId}
        )`
      );
    }

    if (query.studyProgramId) {
      conditions.push(
        sql`"bibliographies"."id" IN (
          SELECT bsp.bibliography_id FROM bibliography_study_programs bsp 
          WHERE bsp.study_program_id = ${query.studyProgramId}
        )`
      );
    }

    const where = and(...conditions);
    const sortCol = query.sort === "publishYear" ? bibliographies.publishYear
      : query.sort === "createdAt" ? bibliographies.createdAt : bibliographies.title;
    const sortDir = query.order === "desc" ? desc : asc;
    const offset = (query.page - 1) * query.limit;

    const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(bibliographies).where(where);
    const total = Number(countResult.count);

    const rows = await db.query.bibliographies.findMany({
      where,
      with: {
        publisher: true, language: true, gmd: true,
        bibliographyAuthors: { with: { author: true } },
        bibliographySubjects: { with: { subject: true } },
        bibliographyFaculties: { with: { faculty: true } },
        bibliographyStudyPrograms: { with: { studyProgram: { with: { faculty: true } } } },
        items: { where: isNull(items.deletedAt) },
      },
      orderBy: [sortDir(sortCol)],
      limit: query.limit,
      offset,
    });

    const mapped = rows.map((bib: any) => ({
      ...bib,
      authors: bib.bibliographyAuthors.map((ba: any) => ({ id: ba.author.id, name: ba.author.name, role: ba.role })),
      subjects: bib.bibliographySubjects.map((bs: any) => ({ id: bs.subject.id, name: bs.subject.name })),
      faculties: bib.bibliographyFaculties.map((bf: any) => ({ id: bf.faculty.id, name: bf.faculty.name, code: bf.faculty.code })),
      studyPrograms: bib.bibliographyStudyPrograms.map((bsp: any) => ({
        id: bsp.studyProgram.id,
        name: bsp.studyProgram.name,
        code: bsp.studyProgram.code,
        faculty: { id: bsp.studyProgram.faculty.id, name: bsp.studyProgram.faculty.name }
      })),
      totalItems: bib.items.length,
      availableItems: bib.items.filter((i: any) => i.status === "available").length,
      bibliographyAuthors: undefined,
      bibliographySubjects: undefined,
      bibliographyFaculties: undefined,
      bibliographyStudyPrograms: undefined,
    }));

    return { items: mapped, total, page: query.page, limit: query.limit, totalPages: Math.ceil(total / query.limit) };
  }

  async softDelete(id: string) {
    await db.update(bibliographies).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(bibliographies.id, id));
  }

  async checkDuplicate(params: { isbn?: string; issn?: string; title?: string; author?: string }) {
    const duplicates: any[] = [];
    const seen = new Set<string>();

    if (params.isbn) {
      const cleanTargetIsbn = cleanIsbn(params.isbn);
      if (cleanTargetIsbn) {
        const exact = await db.query.bibliographies.findMany({
          where: and(
            or(
              eq(bibliographies.isbn, cleanTargetIsbn),
              eq(bibliographies.isbnIssn, cleanTargetIsbn),
              eq(bibliographies.isbnIssn, params.isbn)
            ),
            isNull(bibliographies.deletedAt)
          ),
          with: { bibliographyAuthors: { with: { author: true } } },
        });
        for (const bib of exact) {
          if (!seen.has(bib.id)) {
            seen.add(bib.id);
            duplicates.push({
              id: bib.id, title: bib.title, isbn: bib.isbn, issn: bib.issn, isbnIssn: bib.isbnIssn,
              classification: bib.classification, callNumber: bib.callNumber,
              authors: bib.bibliographyAuthors.map((ba: any) => ({ name: ba.author.name })),
              similarity: "isbn",
            });
          }
        }
      }
    }

    if (params.issn) {
      const cleanTargetIssn = params.issn.replace(/^ISSN\s*/i, "").trim();
      if (cleanTargetIssn) {
        const exactIssn = await db.query.bibliographies.findMany({
          where: and(
            or(
              eq(bibliographies.issn, cleanTargetIssn),
              eq(bibliographies.isbnIssn, `ISSN ${cleanTargetIssn}`),
              eq(bibliographies.isbnIssn, cleanTargetIssn)
            ),
            isNull(bibliographies.deletedAt)
          ),
          with: { bibliographyAuthors: { with: { author: true } } },
        });
        for (const bib of exactIssn) {
          if (!seen.has(bib.id)) {
            seen.add(bib.id);
            duplicates.push({
              id: bib.id, title: bib.title, isbn: bib.isbn, issn: bib.issn, isbnIssn: bib.isbnIssn,
              classification: bib.classification, callNumber: bib.callNumber,
              authors: bib.bibliographyAuthors.map((ba: any) => ({ name: ba.author.name })),
              similarity: "issn",
            });
          }
        }
      }
    }

    if (params.title) {
      const titleMatch = await db.query.bibliographies.findMany({
        where: and(ilike(bibliographies.title, `%${params.title}%`), isNull(bibliographies.deletedAt)),
        with: { bibliographyAuthors: { with: { author: true } } },
      });
      for (const bib of titleMatch) {
        if (params.author) {
          const hasAuthor = bib.bibliographyAuthors.some(
            (ba: any) => ba.author.name.toLowerCase().includes(params.author!.toLowerCase())
          );
          if (!hasAuthor) continue;
        }
        if (!seen.has(bib.id)) {
          seen.add(bib.id);
          duplicates.push({
            id: bib.id, title: bib.title, isbnIssn: bib.isbnIssn,
            classification: bib.classification, callNumber: bib.callNumber,
            authors: bib.bibliographyAuthors.map((ba: any) => ({ name: ba.author.name })),
            similarity: "title_author",
          });
        }
      }
    }

    return {
      hasExactMatch: params.isbn ? duplicates.some((d) => d.similarity === "isbn") : false,
      duplicates,
    };
  }

  async getItemsForBibliography(bibliographyId: string) {
    return db.query.items.findMany({
      where: and(eq(items.bibliographyId, bibliographyId), isNull(items.deletedAt)),
      with: { location: true, vendor: true, collectionType: true },
    });
  }
}

export const bibliographyService = new BibliographyService();
