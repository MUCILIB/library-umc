import { db } from "../../../db";
import {
  importBatches, importBibliographyRows, importItemRows, importErrors,
  importBibliographyItemCodes,
  bibliographies, items, bibliographyAuthors, bibliographySubjects,
  bibliographyFaculties, bibliographyStudyPrograms,
  authors, subjects, publishers, publicationPlaces, gmds, collectionTypes,
  languages, locations, vendors, faculties, studyPrograms,
  guestLogs, loans, Users, account, members
} from "../../../db/schema";
import { eq, and, isNull, sql, asc, inArray } from "drizzle-orm";
import { syncCollectionAvailableStock } from "../../shared/utils/stock-sync";
import crypto from "crypto";
import { z } from "zod";
import { hashPassword } from "better-auth/crypto";

// ==========================================
// CONSTANTS
// ==========================================

const UNLISTED_AUTHOR_MARKERS = ["dkk", "et al.", "et al"];

// ==========================================
// PARSING UTILITIES
// ==========================================

function stripBom(text: string): string {
  if (text.charCodeAt(0) === 0xFEFF) return text.slice(1);
  return text;
}

function detectDelimiter(raw: string): ";" | "," {
  const firstLine = raw.split("\n")[0] || "";
  const semicolons = (firstLine.match(/;/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  return semicolons >= commas ? ";" : ",";
}

function parseCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const DQ = String.fromCharCode(34);
    if (ch === DQ) {
      if (inQuotes && i + 1 < line.length && line[i + 1] === DQ) {
        current += DQ;
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

// ==========================================
// AUTHOR PARSER
// ==========================================

interface ParsedAuthor {
  displayName: string;
  normalizedName: string;
  position: number;
  role: "author";
}

interface ParsedAuthorsResult {
  authors: ParsedAuthor[];
  unlistedAuthorsLabel: string | null;
  warnings: string[];
}

function parseAuthors(raw: string): ParsedAuthorsResult {
  const result: ParsedAuthorsResult = {
    authors: [],
    unlistedAuthorsLabel: null,
    warnings: [],
  };

  if (!raw || raw.trim() === "") return result;

  // Extract all <...> values
  const matches = raw.match(/<([^>]+)>/g);
  if (!matches) {
    // No angle brackets — treat entire string as single author if non-empty
    const trimmed = raw.trim();
    if (trimmed.length > 0) {
      result.authors.push({
        displayName: trimmed,
        normalizedName: normalizeName(trimmed),
        position: 1,
        role: "author",
      });
    }
    return result;
  }

  let position = 1;
  for (const match of matches) {
    const name = match.slice(1, -1).trim(); // Remove < > and trim
    if (name.length === 0) {
      result.warnings.push("empty bracket element found");
      continue;
    }

    // Check if this is an unlisted-author marker
    if (UNLISTED_AUTHOR_MARKERS.includes(name.toLowerCase())) {
      result.unlistedAuthorsLabel = name;
      continue;
    }

    result.authors.push({
      displayName: name,
      normalizedName: normalizeName(name),
      position: position++,
      role: "author",
    });
  }

  // Check for malformed brackets (extra >)
  const openBrackets = (raw.match(/</g) || []).length;
  const closeBrackets = (raw.match(/>/g) || []).length;
  if (openBrackets !== closeBrackets) {
    result.warnings.push(`malformed brackets: ${openBrackets} open, ${closeBrackets} close`);
  }

  // If only marker was found with no real authors
  if (result.authors.length === 0 && result.unlistedAuthorsLabel) {
    result.warnings.push("only unlisted-author marker found, no structured authors");
  }

  return result;
}

function parseAngleBracket(raw: string): string[] {
  if (!raw || raw.trim() === "") return [];
  const matches = raw.match(/<([^>]+)>/g);
  if (!matches) return [raw.trim()].filter(s => s.length > 0);
  return matches.map(m => m.slice(1, -1).trim()).filter(s => s.length > 0);
}

// ==========================================
// IMPORT SERVICE
// ==========================================

export class ImportService {

  // ==========================================
  // BATCH MANAGEMENT
  // ==========================================

  async createBatch(type: "bibliography" | "item", filename: string, userId: string, fileContent: string, referenceBatchId?: string) {
    const [batch] = await db.insert(importBatches).values({
      type,
      filename,
      status: "uploading",
      createdBy: userId,
      referenceBatchId: referenceBatchId || null,
      metadata: { fileContent, fileSize: fileContent.length },
    }).returning();
    return batch;
  }

  async getBatch(batchId: string) {
    return db.query.importBatches.findFirst({
      where: eq(importBatches.id, batchId),
    });
  }

  async listBatches() {
    return db.query.importBatches.findMany({
      orderBy: (b, { desc }) => [desc(b.createdAt)],
    });
  }

  // ==========================================
  // PARSING
  // ==========================================

  async parseBatch(batchId: string) {
    const batch = await db.query.importBatches.findFirst({
      where: eq(importBatches.id, batchId),
    });
    if (!batch) throw new Error("Batch not found");
    if (batch.status !== "uploading" && batch.status !== "parsing") {
      throw new Error(`Batch is in '${batch.status}' state, cannot parse`);
    }

    await db.update(importBatches).set({ status: "parsing" }).where(eq(importBatches.id, batchId));

    const fileContent = (batch.metadata as any)?.fileContent;
    if (!fileContent) throw new Error("No file content in batch metadata");

    const cleanContent = stripBom(fileContent);
    const delimiter = detectDelimiter(cleanContent);
    const lines = cleanContent.split("\n").filter((l: string) => l.trim().length > 0);

    if (lines.length < 2) {
      await db.update(importBatches).set({ status: "failed" }).where(eq(importBatches.id, batchId));
      return { totalRows: 0, parsedRows: 0 };
    }

    const headers = parseCsvLine(lines[0], delimiter).map(h => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_"));
    const dataLines = lines.slice(1);

    // Clear old rows
    if (batch.type === "bibliography") {
      await db.delete(importBibliographyRows).where(eq(importBibliographyRows.batchId, batchId));
      await db.delete(importBibliographyItemCodes).where(eq(importBibliographyItemCodes.batchId, batchId));
    } else {
      await db.delete(importItemRows).where(eq(importItemRows.batchId, batchId));
    }
    await db.delete(importErrors).where(eq(importErrors.batchId, batchId));

    // Parse in chunks
    const chunkSize = 500;
    let parsedCount = 0;

    for (let i = 0; i < dataLines.length; i += chunkSize) {
      const chunk = dataLines.slice(i, i + chunkSize);
      const rows: any[] = [];

      for (let j = 0; j < chunk.length; j++) {
        const line = chunk[j];
        const values = parseCsvLine(line, delimiter);
        const rawData: Record<string, string> = {};
        headers.forEach((h, hi) => { rawData[h] = (values[hi] || "").trim(); });

        rows.push({
          batchId,
          rowNumber: i + j + 1,
          rawData,
          status: "pending" as const,
        });
        parsedCount++;
      }

      if (rows.length > 0) {
        if (batch.type === "bibliography") {
          await db.insert(importBibliographyRows).values(rows);
        } else {
          await db.insert(importItemRows).values(rows);
        }
      }
    }

    await db.update(importBatches).set({
      status: "validating",
      totalRows: dataLines.length,
      processedRows: parsedCount,
    }).where(eq(importBatches.id, batchId));

    // Auto-validate
    await this.validateBatch(batchId);

    return { totalRows: dataLines.length, parsedRows: parsedCount };
  }

  // ==========================================
  // VALIDATION
  // ==========================================

  async validateBatch(batchId: string) {
    const batch = await db.query.importBatches.findFirst({
      where: eq(importBatches.id, batchId),
    });
    if (!batch) throw new Error("Batch not found");

    if (batch.type === "bibliography") {
      return this.validateBibliographyBatch(batchId);
    } else {
      return this.validateItemBatch(batchId);
    }
  }

  private async validateBibliographyBatch(batchId: string) {
    const rows = await db.query.importBibliographyRows.findMany({
      where: eq(importBibliographyRows.batchId, batchId),
    });

    let validCount = 0;
    let invalidCount = 0;

    // Clear old item-code mappings
    await db.delete(importBibliographyItemCodes).where(eq(importBibliographyItemCodes.batchId, batchId));

    for (const row of rows) {
      const raw = row.rawData as Record<string, string>;
      const errors: string[] = [];
      const warnings: string[] = [];

      // Required: title
      if (!raw.title || raw.title.trim().length === 0) {
        errors.push("title is required");
      }

      // Parse authors
      const parsed = parseAuthors(raw.authors || "");
      if (parsed.warnings.length > 0) warnings.push(...parsed.warnings);

      // Parse topics
      const topics = parseAngleBracket(raw.topics || "");
      if (raw.topics && topics.length === 0) {
        warnings.push("topics field present but no valid topics parsed");
      }

      // Parse item codes
      const itemCodes = parseAngleBracket(raw.item_code || "");

      // Publish year validation
      if (raw.publish_year && raw.publish_year.trim() !== "" && raw.publish_year !== "-") {
        const year = parseInt(raw.publish_year);
        if (isNaN(year) || year < 1000 || year > 9999) {
          warnings.push(`invalid publish_year: ${raw.publish_year}`);
        }
      }

      // Store normalized data (separate from raw)
      const normalizedData = {
        ...raw,
        _parsedAuthors: parsed.authors,
        _unlistedAuthorsLabel: parsed.unlistedAuthorsLabel,
        _parsedTopics: topics,
        _parsedItemCodes: itemCodes,
        _warnings: warnings.length > 0 ? warnings : undefined,
      };

      let status: "valid" | "invalid" = "valid";
      if (errors.length > 0) {
        status = "invalid";
        invalidCount++;
      } else {
        validCount++;
      }

      await db.update(importBibliographyRows).set({
        status,
        resolvedData: normalizedData,
      }).where(eq(importBibliographyRows.id, row.id));

      // Insert item-code mapping evidence
      if (itemCodes.length > 0) {
        for (let i = 0; i < itemCodes.length; i++) {
          await db.insert(importBibliographyItemCodes).values({
            batchId,
            bibliographyRowId: row.id,
            itemCode: itemCodes[i],
            sourcePosition: i + 1,
            validationStatus: "pending",
          });
        }
      }
    }

    await db.update(importBatches).set({
      status: "preview",
      validRows: validCount,
      invalidRows: invalidCount,
    }).where(eq(importBatches.id, batchId));

    return { totalRows: rows.length, validRows: validCount, invalidRows: invalidCount };
  }

  private async validateItemBatch(batchId: string) {
    const rows = await db.query.importItemRows.findMany({
      where: eq(importItemRows.batchId, batchId),
    });

    let validCount = 0;
    let invalidCount = 0;

    // Build bibliography map from reference batch
    const batch = await db.query.importBatches.findFirst({ where: eq(importBatches.id, batchId) });
    const referenceBatchId = batch?.referenceBatchId;

    // Build item-code → bibliography mapping
    const itemCodeMap = new Map<string, string>();
    if (referenceBatchId) {
      const mappings = await db.query.importBibliographyItemCodes.findMany({
        where: eq(importBibliographyItemCodes.batchId, referenceBatchId),
      });
      for (const m of mappings) {
        if (m.committedBibliographyId) {
          itemCodeMap.set(m.itemCode, m.committedBibliographyId);
        }
      }
    }

    for (const row of rows) {
      const raw = row.rawData as Record<string, string>;
      const errors: string[] = [];
      const warnings: string[] = [];

      // Required: item_code
      if (!raw.item_code || raw.item_code.trim().length === 0) {
        errors.push("item_code is required");
      }

      // Price handling — preserve raw, flag suspicious
      if (raw.price && (raw.price === "0" || raw.price === "1")) {
        warnings.push("SUSPICIOUS_SOURCE_PRICE");
      }

      // Resolve bibliography
      let resolvedBibliographyId: string | null = null;
      let resolutionMethod: string | null = null;

      // Method 1: Item-code mapping
      if (raw.item_code && itemCodeMap.has(raw.item_code)) {
        resolvedBibliographyId = itemCodeMap.get(raw.item_code)!;
        resolutionMethod = "ITEM_CODE";
      }

      // Method 2: Title fallback (exact match)
      if (!resolvedBibliographyId && raw.title) {
        const matchingBibs = await db.query.bibliographies.findMany({
          where: and(
            eq(bibliographies.title, raw.title.trim()),
            isNull(bibliographies.deletedAt)
          ),
        });
        if (matchingBibs.length === 1) {
          resolvedBibliographyId = matchingBibs[0].id;
          resolutionMethod = "UNIQUE_TITLE_FALLBACK";
        } else if (matchingBibs.length > 1) {
          errors.push(`ambiguous title: ${matchingBibs.length} matches`);
        }
      }

      if (!resolvedBibliographyId) {
        errors.push("bibliography not resolved");
      }

      const normalizedData = {
        ...raw,
        _resolvedBibliographyId: resolvedBibliographyId,
        _resolutionMethod: resolutionMethod,
        _warnings: warnings.length > 0 ? warnings : undefined,
      };

      let status: "valid" | "invalid" = "valid";
      if (errors.length > 0) {
        status = "invalid";
        invalidCount++;
      } else {
        validCount++;
      }

      await db.update(importItemRows).set({
        status,
        resolvedData: normalizedData,
        resolvedId: resolvedBibliographyId,
        resolutionMethod,
      }).where(eq(importItemRows.id, row.id));
    }

    await db.update(importBatches).set({
      status: "preview",
      validRows: validCount,
      invalidRows: invalidCount,
    }).where(eq(importBatches.id, batchId));

    return { totalRows: rows.length, validRows: validCount, invalidRows: invalidCount };
  }

  // ==========================================
  // PREVIEW
  // ==========================================

  async previewBatch(batchId: string, limit = 20) {
    const batch = await db.query.importBatches.findFirst({ where: eq(importBatches.id, batchId) });
    if (!batch) throw new Error("Batch not found");

    let rows: any[] = [];
    let totalCount = 0;

    if (batch.type === "bibliography") {
      rows = await db.query.importBibliographyRows.findMany({
        where: eq(importBibliographyRows.batchId, batchId),
        limit,
      });
      const countResult = await db.select({ count: sql<number>`count(*)` })
        .from(importBibliographyRows)
        .where(eq(importBibliographyRows.batchId, batchId));
      totalCount = Number(countResult[0]?.count || 0);
    } else {
      rows = await db.query.importItemRows.findMany({
        where: eq(importItemRows.batchId, batchId),
        limit,
      });
      const countResult = await db.select({ count: sql<number>`count(*)` })
        .from(importItemRows)
        .where(eq(importItemRows.batchId, batchId));
      totalCount = Number(countResult[0]?.count || 0);
    }

    const errorRows = await db.query.importErrors.findMany({
      where: eq(importErrors.batchId, batchId),
    });

    return {
      batch: {
        id: batch.id,
        type: batch.type,
        status: batch.status,
        totalRows: batch.totalRows,
        validRows: batch.validRows,
        invalidRows: batch.invalidRows,
        committedRows: batch.committedRows,
      },
      rows,
      errors: errorRows,
      pagination: { total: totalCount, limit },
    };
  }

  async getErrors(batchId: string) {
    return db.query.importErrors.findMany({
      where: eq(importErrors.batchId, batchId),
      orderBy: (r, { asc }) => [asc(r.rowNumber)],
    });
  }

  // ==========================================
  // CHUNKED APPROVAL
  // ==========================================

  async approveBatch(batchId: string, userId: string, chunkSize = 25) {
    const batch = await db.query.importBatches.findFirst({ where: eq(importBatches.id, batchId) });
    if (!batch) throw new Error("Batch not found");
    if (batch.status !== "preview" && batch.status !== "approving") {
      throw new Error(`Batch is in '${batch.status}' state, cannot approve`);
    }

    await db.update(importBatches).set({
      status: "approving",
      approvedBy: userId,
    }).where(eq(importBatches.id, batchId));

    if (batch.type === "bibliography") {
      return this.approveBibliographyChunk(batchId, chunkSize);
    } else {
      return this.approveItemChunk(batchId, chunkSize);
    }
  }

  private async approveBibliographyChunk(batchId: string, chunkSize: number) {
    const pendingRows = await db.query.importBibliographyRows.findMany({
      where: and(
        eq(importBibliographyRows.batchId, batchId),
        eq(importBibliographyRows.status, "valid"),
      ),
      limit: chunkSize,
    });

    let committed = 0;
    let failed = 0;

    for (const row of pendingRows) {
      const resolved = row.resolvedData as any;
      let committedBibId: string | null = null;
      try {
        committedBibId = await db.transaction(async (tx) => {
          // Resolve or create publisher
          let publisherId: number | null = null;
          if (resolved.publisher_name?.trim()) {
            const norm = normalizeName(resolved.publisher_name);
            let pub = await tx.query.publishers.findFirst({ where: eq(publishers.normalizedName, norm) });
            if (!pub) {
              [pub] = await tx.insert(publishers).values({
                name: resolved.publisher_name.trim(),
                normalizedName: norm,
              }).returning();
            }
            publisherId = pub.id;
          }

          // Resolve place
          let placeId: number | null = null;
          if (resolved.place_name?.trim()) {
            const norm = normalizeName(resolved.place_name);
            let place = await tx.query.publicationPlaces.findFirst({ where: eq(publicationPlaces.normalizedName, norm) });
            if (!place) {
              [place] = await tx.insert(publicationPlaces).values({
                name: resolved.place_name.trim(),
                normalizedName: norm,
              }).returning();
            }
            placeId = place.id;
          }

          // Resolve GMD
          let gmdId: number | null = null;
          if (resolved.gmd_name?.trim()) {
            const gmd = await tx.query.gmds.findFirst({ where: eq(gmds.name, resolved.gmd_name.trim()) });
            gmdId = gmd?.id || null;
          }

          // Resolve language
          let languageId: number | null = null;
          if (resolved.language_name?.trim()) {
            const lang = await tx.query.languages.findFirst({ where: eq(languages.name, resolved.language_name.trim()) });
            languageId = lang?.id || null;
          }

          // Parse & resolve ISBN / ISSN
          let parsedIsbn: string | null = resolved.isbn ? resolved.isbn.replace(/^ISBN[:\s]*/i, "").trim() || null : null;
          let parsedIssn: string | null = resolved.issn ? resolved.issn.replace(/^ISSN[:\s]*/i, "").trim() || null : null;
          let parsedLegacy = resolved.isbn_issn ? resolved.isbn_issn.replace(/^ISBN[:\s]*/i, "").trim() || null : null;

          if (!parsedIsbn && !parsedIssn && parsedLegacy) {
            if (/^ISSN/i.test(parsedLegacy) || /^\d{4}-\d{3}[\dX]$/i.test(parsedLegacy)) {
              parsedIssn = parsedLegacy.replace(/^ISSN[:\s]*/i, "").trim();
            } else {
              parsedIsbn = parsedLegacy;
            }
          }
          if (!parsedLegacy) {
            parsedLegacy = parsedIsbn || (parsedIssn ? `ISSN ${parsedIssn}` : null);
          }

          // Create bibliography
          const [bib] = await tx.insert(bibliographies).values({
            title: resolved.title,
            isbn: parsedIsbn,
            issn: parsedIssn,
            isbnIssn: parsedLegacy,
            edition: resolved.edition || null,
            publishYear: resolved.publish_year ? parseInt(resolved.publish_year) : null,
            collation: resolved.collation || null,
            seriesTitle: resolved.series_title || null,
            callNumber: resolved.call_number || null,
            classification: resolved.classification || null,
            notes: resolved.notes || null,
            sor: resolved.sor || null,
            image: resolved.image || null,
            unlistedAuthorsLabel: resolved._unlistedAuthorsLabel || null,
            gmdId,
            languageId,
            publisherId,
            publicationPlaceId: placeId,
            stock: 0,
          }).returning();

          // Create ordered author relations
          if (resolved._parsedAuthors?.length > 0) {
            for (const authorData of resolved._parsedAuthors) {
              const norm = normalizeName(authorData.displayName);
              let author = await tx.query.authors.findFirst({ where: eq(authors.normalizedName, norm) });
              if (!author) {
                [author] = await tx.insert(authors).values({
                  name: authorData.displayName,
                  normalizedName: norm,
                }).returning();
              }
              await tx.insert(bibliographyAuthors).values({
                bibliographyId: bib.id,
                authorId: author.id,
                position: authorData.position,
                role: "author",
              });
            }
          }

          // Create subject relations
          if (resolved._parsedTopics?.length > 0) {
            for (const topicName of resolved._parsedTopics) {
              const norm = normalizeName(topicName);
              let subject = await tx.query.subjects.findFirst({ where: eq(subjects.normalizedName, norm) });
              if (!subject) {
                [subject] = await tx.insert(subjects).values({
                  name: topicName.trim(),
                  normalizedName: norm,
                }).returning();
              }
              await tx.insert(bibliographySubjects).values({
                bibliographyId: bib.id,
                subjectId: subject.id,
              });
            }
          }

          // Resolve faculty
          if (resolved.faculty_name?.trim()) {
            const names = resolved.faculty_name.split(",").map((n: string) => n.trim()).filter(Boolean);
            for (const name of names) {
              const norm = normalizeName(name);
              let fac = await tx.query.faculties.findFirst({ where: sql`LOWER(${faculties.name}) = ${norm}` });
              if (!fac) {
                [fac] = await tx.insert(faculties).values({ name, code: null }).returning();
              }
              await tx.insert(bibliographyFaculties).values({
                bibliographyId: bib.id,
                facultyId: fac.id,
              }).onConflictDoNothing();
            }
          }

          // Resolve study programs
          if (resolved.study_program_name?.trim()) {
            const names = resolved.study_program_name.split(",").map((n: string) => n.trim()).filter(Boolean);
            for (const name of names) {
              const norm = normalizeName(name);
              let sp = await tx.query.studyPrograms.findFirst({ where: sql`LOWER(${studyPrograms.name}) = ${norm}` });
              if (!sp) {
                [sp] = await tx.insert(studyPrograms).values({
                  name,
                  facultyId: 1,
                }).returning();
              }
              await tx.insert(bibliographyStudyPrograms).values({
                bibliographyId: bib.id,
                studyProgramId: sp.id,
              }).onConflictDoNothing();
            }
          }

          // Mark row committed
          await db.update(importBibliographyRows).set({
            status: "committed",
            resolvedId: bib.id,
          }).where(eq(importBibliographyRows.id, row.id));

          return bib.id;
        });

        // Update item-code mapping evidence (outside transaction for FK safety)
        await db.update(importBibliographyItemCodes)
          .set({ committedBibliographyId: committedBibId, validationStatus: "committed" })
          .where(eq(importBibliographyItemCodes.bibliographyRowId, row.id));

        committed++;
      } catch (err: any) {
        failed++;
        await db.insert(importErrors).values({
          batchId,
          rowNumber: row.rowNumber,
          rawData: row.rawData,
          errors: [err.message?.substring(0, 500) || "Unknown error"],
        });
        await db.update(importBibliographyRows).set({
          status: "invalid",
        }).where(eq(importBibliographyRows.id, row.id));
      }
    }

    // Update batch counters
    const remaining = await db.select({ count: sql<number>`count(*)` })
      .from(importBibliographyRows)
      .where(and(
        eq(importBibliographyRows.batchId, batchId),
        eq(importBibliographyRows.status, "valid"),
      ));
    const remainingCount = Number(remaining[0]?.count || 0);

    await db.update(importBatches).set({
      status: remainingCount > 0 ? "approving" : "committed",
      committedRows: sql`committed_rows + ${committed}`,
      failedRows: sql`failed_rows + ${failed}`,
      lastProcessedAt: new Date(),
      committedAt: remainingCount === 0 ? new Date() : undefined,
    }).where(eq(importBatches.id, batchId));

    return {
      processed: committed + failed,
      committed,
      failed,
      remaining: remainingCount,
      hasMore: remainingCount > 0,
    };
  }

  private async approveItemChunk(batchId: string, chunkSize: number) {
    const pendingRows = await db.query.importItemRows.findMany({
      where: and(
        eq(importItemRows.batchId, batchId),
        eq(importItemRows.status, "valid"),
      ),
      limit: chunkSize,
    });

    let committed = 0;
    let failed = 0;
    let duplicate = 0;

    for (const row of pendingRows) {
      const resolved = row.resolvedData as any;
      try {
        const bibId = resolved._resolvedBibliographyId;
        if (!bibId) throw new Error("Bibliography not resolved");

        // Check duplicate item_code
        const existing = await db.query.items.findFirst({
          where: eq(items.itemCode, resolved.item_code),
        });
        if (existing) {
          duplicate++;
          await db.update(importItemRows).set({ status: "duplicate" as any })
            .where(eq(importItemRows.id, row.id));
          continue;
        }

        // Generate QR token
        const qrToken = crypto.randomBytes(20).toString("hex");

        // Resolve location
        let locationId = 1; // default
        if (resolved.location_name?.trim()) {
          const loc = await db.query.locations.findFirst({
            where: eq(locations.room, resolved.location_name.trim()),
          });
          if (loc) locationId = loc.id;
        }

        // Resolve collection type
        let collectionTypeId: number | null = null;
        if (resolved.coll_type_name?.trim()) {
          const ct = await db.query.collectionTypes.findFirst({
            where: eq(collectionTypes.name, resolved.coll_type_name.trim()),
          });
          if (ct) collectionTypeId = ct.id;
        }

        // Status mapping
        const statusMap: Record<string, string> = {
          "available": "available", "tersedia": "available",
          "loaned": "loaned", "dipinjam": "loaned",
          "damaged": "damaged", "rusak": "damaged",
          "lost": "lost", "hilang": "lost",
        };
        const mappedStatus = statusMap[(resolved.item_status_name || "").toLowerCase().trim()] || "available";

        // Price: preserve raw, set NULL for suspicious values
        let price: string | null = null;
        if (resolved.price && resolved.price !== "0" && resolved.price !== "1") {
          const parsed = parseFloat(resolved.price);
          if (!isNaN(parsed) && parsed > 0) price = String(parsed);
        }

        await db.transaction(async (tx) => {
          // Lock bibliography row
          await tx.execute(
            sql`SELECT id FROM bibliographies WHERE id = ${bibId} FOR UPDATE`
          );

          // Insert item
          const [item] = await tx.insert(items).values({
            bibliographyId: bibId,
            itemCode: resolved.item_code,
            inventoryCode: resolved.inventory_code || null,
            callNumber: resolved.call_number || null,
            locationId,
            collectionTypeId,
            status: mappedStatus as any,
            site: resolved.site || null,
            source: resolved.source || null,
            invoice: resolved.invoice || null,
            price,
            priceCurrency: resolved.price_currency || "IDR",
            qrToken,
            qrVersion: 1,
            qrGeneratedAt: new Date(),
          }).returning();

          // Sync stock
          await syncCollectionAvailableStock(tx, bibId);

          // Mark committed
          await db.update(importItemRows).set({
            status: "committed",
            resolvedId: item.id,
          }).where(eq(importItemRows.id, row.id));
        });

        committed++;
      } catch (err: any) {
        failed++;
        await db.insert(importErrors).values({
          batchId,
          rowNumber: row.rowNumber,
          rawData: row.rawData,
          errors: [err.message?.substring(0, 500) || "Unknown error"],
        });
      }
    }

    // Update batch counters
    const remaining = await db.select({ count: sql<number>`count(*)` })
      .from(importItemRows)
      .where(and(
        eq(importItemRows.batchId, batchId),
        eq(importItemRows.status, "valid"),
      ));
    const remainingCount = Number(remaining[0]?.count || 0);

    await db.update(importBatches).set({
      status: remainingCount > 0 ? "approving" : "committed",
      committedRows: sql`committed_rows + ${committed}`,
      duplicateRows: sql`duplicate_rows + ${duplicate}`,
      failedRows: sql`failed_rows + ${failed}`,
      lastProcessedAt: new Date(),
      committedAt: remainingCount === 0 ? new Date() : undefined,
    }).where(eq(importBatches.id, batchId));

    return {
      processed: committed + failed + duplicate,
      committed,
      failed,
      duplicate,
      remaining: remainingCount,
      hasMore: remainingCount > 0,
    };
  }

  // ==========================================
  // CANCEL
  // ==========================================

  async cancelBatch(batchId: string) {
    const batch = await db.query.importBatches.findFirst({ where: eq(importBatches.id, batchId) });
    if (!batch) throw new Error("Batch not found");
    if (batch.status === "committed") throw new Error("Cannot cancel committed batch");
    await db.update(importBatches).set({ status: "cancelled" }).where(eq(importBatches.id, batchId));
    return { success: true };
  }

  // ==========================================
  // UNIVERSAL TEMPLATES & IMPORTS (TICK-02)
  // ==========================================

  getTemplate(module: string): { filename: string; csv: string } | null {
    const mod = module.toLowerCase();
    if (mod === "guests" || mod === "visitors") {
      const header = "name;identifier;email;faculty;major;visit_date";
      const sample = [
        "Budi Santoso;2021001;budi@example.com;Fakultas Teknik;Teknik Informatika;2025-01-15 08:30:00",
        "Siti Rahma;2021002;siti@example.com;Fakultas Ekonomi;Manajemen;2025-01-15 09:00:00"
      ].join("\n");
      return {
        filename: "template_guests.csv",
        csv: "\uFEFF" + header + "\n" + sample + "\n"
      };
    }

    if (mod === "users") {
      const header = "name;email;password;role;identifier;faculty;phone";
      const sample = [
        "Ahmad Dahlan;ahmad@example.com;Password123!;student;2021003;Fakultas Agama Islam;081234567890",
        "Dewi Sartika;dewi@example.com;Password123!;lecturer;19850101;Fakultas Keguruan;081298765432"
      ].join("\n");
      return {
        filename: "template_users.csv",
        csv: "\uFEFF" + header + "\n" + sample + "\n"
      };
    }

    if (mod === "loans") {
      const header = "identifier;item_code;loan_date;due_date;status";
      const sample = [
        "2021001;ITEM-0001;2025-01-10;2025-01-17;approved",
        "2021002;ITEM-0002;2025-01-12;2025-01-19;returned"
      ].join("\n");
      return {
        filename: "template_loans.csv",
        csv: "\uFEFF" + header + "\n" + sample + "\n"
      };
    }

    if (mod === "bibliographies" || mod === "bibliography") {
      const header = "title;gmd_name;edition;isbn_issn;publisher_name;publish_year;collation;series_title;call_number;language_name;place_name;classification;notes;image;sor;authors;topics;item_code;faculty_name;study_program_name";
      const sample = "Pemrograman Web Modern;Text;1;978-602-0000-01;Informatika Press;2024;xii, 250 hlm;Seri TI;005.13;Indonesia;Bandung;005;Buku ajar;;Andi;<Budi Santoso><Siti Rahma>;<Web><React>;<WEB001><WEB002>;Teknik;Teknik Informatika";
      return {
        filename: "template_bibliographies.csv",
        csv: "\uFEFF" + header + "\n" + sample + "\n"
      };
    }

    if (mod === "items" || mod === "item") {
      const header = "item_code;call_number;coll_type_name;inventory_code;received_date;supplier_name;order_no;location_name;order_date;item_status_name;site;source;invoice;price;price_currency;invoice_date;input_date;last_update;title";
      const sample = "ITEM-0001;005.13 AND p;Buku Teks;INV-2024-001;2024-01-05;Toko Buku Gramedia;ORD-01;Perpustakaan Pusat, Lantai 1, Rak A1;2024-01-01;Available;Main;Pembelian;INV-2024-01;125000;IDR;2024-01-02;2024-01-05;2024-01-05;Pemrograman Web Modern";
      return {
        filename: "template_items.csv",
        csv: "\uFEFF" + header + "\n" + sample + "\n"
      };
    }

    return null;
  }

  private parseCsvRows(content: string): { headers: string[]; rows: { rowNumber: number; data: Record<string, string> }[] } {
    const clean = stripBom(content).trim();
    if (!clean) return { headers: [], rows: [] };
    const delimiter = detectDelimiter(clean);
    const lines = clean.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length <= 1) return { headers: [], rows: [] };

    const rawHeaders = parseCsvLine(lines[0], delimiter).map(h => h.trim().toLowerCase());
    const rows: { rowNumber: number; data: Record<string, string> }[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCsvLine(lines[i], delimiter);
      const rowObj: Record<string, string> = {};
      for (let j = 0; j < rawHeaders.length; j++) {
        rowObj[rawHeaders[j]] = values[j]?.trim() ?? "";
      }
      rows.push({ rowNumber: i + 1, data: rowObj });
    }

    return { headers: rawHeaders, rows };
  }

  async importGuests(content: string) {
    const GuestImportSchema = z.object({
      name: z.string().min(1, "Nama wajib diisi"),
      identifier: z.string().min(1, "NIM/NIDN/Identifier wajib diisi"),
      email: z.string().email("Format email tidak valid").optional().or(z.literal("")),
      faculty: z.string().optional(),
      major: z.string().optional(),
      visitDate: z.string().optional(),
    });

    const { rows } = this.parseCsvRows(content);
    const errors: Array<{ row: number; errors: string[] }> = [];
    let successCount = 0;

    for (const { rowNumber, data } of rows) {
      const rawRow = {
        name: data["name"] || data["nama"] || "",
        identifier: data["identifier"] || data["nim"] || data["nidn"] || data["nim_nidn"] || "",
        email: data["email"] || "",
        faculty: data["faculty"] || data["fakultas"] || "",
        major: data["major"] || data["prodi"] || data["jurusan"] || data["study_program"] || "",
        visitDate: data["visit_date"] || data["visitdate"] || data["tanggal"] || data["date"] || "",
      };

      const parsed = GuestImportSchema.safeParse(rawRow);
      if (!parsed.success) {
        errors.push({
          row: rowNumber,
          errors: parsed.error.issues.map(e => e.message),
        });
        continue;
      }

      try {
        let visitDate = new Date();
        if (parsed.data.visitDate) {
          const d = new Date(parsed.data.visitDate);
          if (!isNaN(d.getTime())) visitDate = d;
        }

        await db.insert(guestLogs).values({
          name: parsed.data.name,
          identifier: parsed.data.identifier,
          email: parsed.data.email || null,
          faculty: parsed.data.faculty || null,
          major: parsed.data.major || null,
          visitDate,
        });
        successCount++;
      } catch (err: any) {
        errors.push({
          row: rowNumber,
          errors: [err.message || "Gagal menyimpan data pengunjung"],
        });
      }
    }

    return {
      total: rows.length,
      successCount,
      errorCount: errors.length,
      errors,
    };
  }

  async importUsers(content: string) {
    const UserImportSchema = z.object({
      name: z.string().min(1, "Nama wajib diisi"),
      email: z.string().email("Format email tidak valid"),
      password: z.string().min(6, "Password minimal 6 karakter").optional().default("Password123!"),
      role: z.enum(["super_admin", "staff", "student", "lecturer"]).optional().default("student"),
      identifier: z.string().optional(),
      faculty: z.string().optional(),
      phone: z.string().optional(),
    });

    const { rows } = this.parseCsvRows(content);
    const errors: Array<{ row: number; errors: string[] }> = [];
    let successCount = 0;

    for (const { rowNumber, data } of rows) {
      const rawRow = {
        name: data["name"] || data["nama"] || "",
        email: data["email"] || "",
        password: data["password"] || "Password123!",
        role: (data["role"] || "student").toLowerCase(),
        identifier: data["identifier"] || data["nim"] || data["nidn"] || "",
        faculty: data["faculty"] || data["fakultas"] || "",
        phone: data["phone"] || data["no_hp"] || data["telepon"] || "",
      };

      const parsed = UserImportSchema.safeParse(rawRow);
      if (!parsed.success) {
        errors.push({
          row: rowNumber,
          errors: parsed.error.issues.map(e => e.message),
        });
        continue;
      }

      try {
        const existing = await db.query.Users.findFirst({
          where: eq(Users.email, parsed.data.email.toLowerCase()),
        });
        if (existing) {
          errors.push({
            row: rowNumber,
            errors: [`Email '${parsed.data.email}' sudah terdaftar`],
          });
          continue;
        }

        const userId = crypto.randomUUID();
        const passwordHash = await hashPassword(parsed.data.password || "Password123!");
        const now = new Date();

        await db.insert(Users).values({
          id: userId,
          name: parsed.data.name,
          email: parsed.data.email.toLowerCase(),
          emailVerified: true,
          role: parsed.data.role,
          passwordHash: passwordHash,
          createdAt: now,
          updatedAt: now,
        });

        await db.insert(account).values({
          id: `account-${userId}-credential`,
          accountId: parsed.data.email.toLowerCase(),
          providerId: "credential",
          userId: userId,
          password: passwordHash,
          createdAt: now,
          updatedAt: now,
        });

        if (parsed.data.identifier || parsed.data.faculty || parsed.data.phone) {
          const memberType = parsed.data.role === "lecturer" ? "lecturer" : parsed.data.role === "staff" ? "staff" : "student";
          await db.insert(members).values({
            userId,
            memberType,
            nimNidn: parsed.data.identifier || "-",
            faculty: parsed.data.faculty || "-",
            phone: parsed.data.phone || null,
            createdAt: now,
            updatedAt: now,
          });
        }

        successCount++;
      } catch (err: any) {
        errors.push({
          row: rowNumber,
          errors: [err.message || "Gagal menyimpan user"],
        });
      }
    }

    return {
      total: rows.length,
      successCount,
      errorCount: errors.length,
      errors,
    };
  }

  async importLoans(content: string) {
    const LoanImportSchema = z.object({
      identifier: z.string().min(1, "Identifier/NIM/Email peminjam wajib diisi"),
      itemCode: z.string().min(1, "Item code wajib diisi"),
      loanDate: z.string().min(1, "Tanggal pinjam wajib diisi"),
      dueDate: z.string().min(1, "Batas tanggal kembali wajib diisi"),
      status: z.enum(["pending", "approved", "returned", "extended"]).optional().default("approved"),
    });

    const { rows } = this.parseCsvRows(content);
    const errors: Array<{ row: number; errors: string[] }> = [];
    let successCount = 0;

    for (const { rowNumber, data } of rows) {
      const rawRow = {
        identifier: data["identifier"] || data["nim"] || data["email"] || "",
        itemCode: data["item_code"] || data["itemcode"] || data["kode_buku"] || data["barcode"] || "",
        loanDate: data["loan_date"] || data["loandate"] || data["tanggal_pinjam"] || "",
        dueDate: data["due_date"] || data["duedate"] || data["tanggal_kembali"] || "",
        status: (data["status"] || "approved").toLowerCase(),
      };

      const parsed = LoanImportSchema.safeParse(rawRow);
      if (!parsed.success) {
        errors.push({
          row: rowNumber,
          errors: parsed.error.issues.map(e => e.message),
        });
        continue;
      }

      try {
        const member = await db.query.members.findFirst({
          where: eq(members.nimNidn, parsed.data.identifier),
        });
        let resolvedMemberId = member?.id;
        if (!resolvedMemberId) {
          const user = await db.query.Users.findFirst({
            where: eq(Users.email, parsed.data.identifier.toLowerCase()),
            with: { member: true },
          });
          if (user?.member) {
            resolvedMemberId = user.member.id;
          }
        }

        if (!resolvedMemberId) {
          errors.push({
            row: rowNumber,
            errors: [`Member dengan NIM/Email '${parsed.data.identifier}' tidak ditemukan`],
          });
          continue;
        }

        const item = await db.query.items.findFirst({
          where: and(eq(items.itemCode, parsed.data.itemCode), isNull(items.deletedAt)),
        });

        if (!item) {
          errors.push({
            row: rowNumber,
            errors: [`Buku/Item dengan kode '${parsed.data.itemCode}' tidak ditemukan`],
          });
          continue;
        }

        const now = new Date();
        await db.insert(loans).values({
          memberId: resolvedMemberId,
          itemId: item.id,
          loanDate: parsed.data.loanDate,
          dueDate: parsed.data.dueDate,
          returnDate: parsed.data.status === "returned" ? parsed.data.dueDate : null,
          status: parsed.data.status,
          createdAt: now,
          updatedAt: now,
        });

        if (parsed.data.status === "approved" || parsed.data.status === "extended") {
          await db.update(items).set({ status: "loaned", updatedAt: now }).where(eq(items.id, item.id));
        } else if (parsed.data.status === "returned") {
          await db.update(items).set({ status: "available", updatedAt: now }).where(eq(items.id, item.id));
        }

        successCount++;
      } catch (err: any) {
        errors.push({
          row: rowNumber,
          errors: [err.message || "Gagal menyimpan peminjaman"],
        });
      }
    }

    return {
      total: rows.length,
      successCount,
      errorCount: errors.length,
      errors,
    };
  }
}

export const importService = new ImportService();
