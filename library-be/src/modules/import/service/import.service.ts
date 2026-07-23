import { db } from "../../../db";
import {
  importBatches, importBibliographyRows, importItemRows, importErrors,
  importBibliographyItemCodes,
  bibliographies, items, bibliographyAuthors, bibliographySubjects,
  bibliographyFaculties, bibliographyStudyPrograms,
  authors, subjects, publishers, publicationPlaces, gmds, collectionTypes,
  languages, locations, vendors, faculties, studyPrograms
} from "../../../db/schema";
import { eq, and, isNull, sql, asc, inArray } from "drizzle-orm";
import { syncCollectionAvailableStock } from "../../shared/utils/stock-sync";
import crypto from "crypto";

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
    let itemCodeMap = new Map<string, string>();
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

          // Create bibliography
          const [bib] = await tx.insert(bibliographies).values({
            title: resolved.title,
            isbnIssn: resolved.isbn_issn ? resolved.isbn_issn.replace(/^ISBN[:\s]*/i, "").trim() || null : null,
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
}

export const importService = new ImportService();
