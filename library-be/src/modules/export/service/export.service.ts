import { db } from "../../../db";
import {
  bibliographies, items, bibliographyAuthors, bibliographySubjects,
  bibliographyFaculties, bibliographyStudyPrograms,
  authors, subjects, publishers, publicationPlaces, gmds,
  languages, locations, vendors, collectionTypes, faculties, studyPrograms
} from "../../../db/schema";
import { eq, and, isNull, asc, inArray, ilike } from "drizzle-orm";

const BIBLIO_HEADERS = [
  "title", "gmd_name", "edition", "isbn_issn", "publisher_name",
  "publish_year", "collation", "series_title", "call_number",
  "language_name", "place_name", "classification", "notes", "image",
  "sor", "authors", "topics", "item_code",
  "faculty_name", "study_program_name"
];

const ITEM_HEADERS = [
  "item_code", "call_number", "coll_type_name", "inventory_code",
  "received_date", "supplier_name", "order_no", "location_name",
  "order_date", "item_status_name", "site", "source", "invoice",
  "price", "price_currency", "invoice_date", "input_date", "last_update", "title"
];

export interface ExportFilter {
  facultyId?: number;
  studyProgramId?: number;
  categoryId?: number;
  subject?: string;
  status?: string;
}

function escapeCsvField(value: string | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(";") || str.includes('"') || str.includes("\n")) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
}

async function getFilteredBibliographyIds(filter: ExportFilter): Promise<string[] | null> {
  const hasFilter = Boolean(
    filter.facultyId ||
    filter.studyProgramId ||
    filter.categoryId ||
    filter.subject ||
    filter.status
  );
  if (!hasFilter) return null;

  const conditions: any[] = [isNull(bibliographies.deletedAt)];

  if (filter.facultyId) {
    const facultyBibs = await db
      .select({ bibId: bibliographyFaculties.bibliographyId })
      .from(bibliographyFaculties)
      .innerJoin(faculties, eq(bibliographyFaculties.facultyId, faculties.id))
      .where(eq(bibliographyFaculties.facultyId, filter.facultyId));
    const ids = facultyBibs.map((r: any) => r.bibId);
    if (ids.length === 0) return [];
    conditions.push(inArray(bibliographies.id, ids));
  }

  if (filter.studyProgramId) {
    const spBibs = await db
      .select({ bibId: bibliographyStudyPrograms.bibliographyId })
      .from(bibliographyStudyPrograms)
      .innerJoin(studyPrograms, eq(bibliographyStudyPrograms.studyProgramId, studyPrograms.id))
      .where(eq(bibliographyStudyPrograms.studyProgramId, filter.studyProgramId));
    const ids = spBibs.map((r: any) => r.bibId);
    if (ids.length === 0) return [];
    conditions.push(inArray(bibliographies.id, ids));
  }

  if (filter.categoryId) {
    conditions.push(eq(bibliographies.categoryId, filter.categoryId));
  }

  if (filter.subject) {
    const subjectBibs = await db
      .select({ bibId: bibliographySubjects.bibliographyId })
      .from(bibliographySubjects)
      .innerJoin(subjects, eq(bibliographySubjects.subjectId, subjects.id))
      .where(ilike(subjects.name, `%${filter.subject}%`));
    const ids = subjectBibs.map((r: any) => r.bibId);
    if (ids.length === 0) return [];
    conditions.push(inArray(bibliographies.id, ids));
  }

  if (filter.status) {
    const itemBibs = await db
      .selectDistinct({ bibId: items.bibliographyId })
      .from(items)
      .where(and(isNull(items.deletedAt), eq(items.status, filter.status as any)));
    const ids = itemBibs.map((r: any) => r.bibId).filter(Boolean) as string[];
    if (ids.length === 0) return [];
    conditions.push(inArray(bibliographies.id, ids));
  }

  const rows = await db.select({ id: bibliographies.id }).from(bibliographies).where(and(...conditions));
  return rows.map((r: any) => r.id);
}

export class ExportService {

  async exportBibliographies(filter?: ExportFilter): Promise<string> {
    const matchingIds = filter ? await getFilteredBibliographyIds(filter) : null;
    if (matchingIds !== null && matchingIds.length === 0) {
      return "\uFEFF" + BIBLIO_HEADERS.join(";") + "\n";
    }

    const where = matchingIds !== null
      ? and(isNull(bibliographies.deletedAt), inArray(bibliographies.id, matchingIds))
      : isNull(bibliographies.deletedAt);

    const rows = await db.query.bibliographies.findMany({
      where,
      with: {
        gmd: true,
        publisher: true,
        language: true,
        publicationPlace: true,
        bibliographyAuthors: { with: { author: true } },
        bibliographySubjects: { with: { subject: true } },
        bibliographyFaculties: { with: { faculty: true } },
        bibliographyStudyPrograms: { with: { studyProgram: true } },
        items: { where: isNull(items.deletedAt) },
      },
      orderBy: [asc(bibliographies.title)],
    });

    const lines: string[] = [BIBLIO_HEADERS.join(";")];

    for (const bib of rows) {
      const authorNames = bib.bibliographyAuthors.map(ca => `<${ca.author.name}>`).join("");
      const topicNames = bib.bibliographySubjects.map(cs => `<${cs.subject.name}>`).join("");
      const itemCodes = bib.items.map(i => `<${i.itemCode}>`).join("");
      const facultyNames = [...new Set(bib.bibliographyFaculties.map(bf => bf.faculty.name))].join(", ");
      const studyProgramNames = [...new Set(bib.bibliographyStudyPrograms.map(bsp => bsp.studyProgram.name))].join(", ");

      const row = [
        escapeCsvField(bib.title),
        escapeCsvField(bib.gmd?.name || ""),
        escapeCsvField(bib.edition || ""),
        escapeCsvField(bib.isbnIssn || ""),
        escapeCsvField(bib.publisher?.name || ""),
        escapeCsvField(bib.publishYear?.toString() || ""),
        escapeCsvField(bib.collation || ""),
        escapeCsvField(bib.seriesTitle || ""),
        escapeCsvField(bib.callNumber || ""),
        escapeCsvField(bib.language?.name || ""),
        escapeCsvField(bib.publicationPlace?.name || ""),
        escapeCsvField(bib.classification || ""),
        escapeCsvField(bib.notes || ""),
        escapeCsvField(bib.image || ""),
        escapeCsvField(bib.sor || ""),
        escapeCsvField(authorNames),
        escapeCsvField(topicNames),
        escapeCsvField(itemCodes),
        escapeCsvField(facultyNames),
        escapeCsvField(studyProgramNames),
      ];
      lines.push(row.join(";"));
    }

    return "\uFEFF" + lines.join("\n");
  }

  async exportItems(filter?: ExportFilter): Promise<string> {
    const itemConditions: any[] = [isNull(items.deletedAt)];

    if (filter?.status) {
      itemConditions.push(eq(items.status, filter.status as any));
    }

    if (filter && (filter.facultyId || filter.studyProgramId || filter.categoryId || filter.subject)) {
      const bibFilter: ExportFilter = {
        facultyId: filter.facultyId,
        studyProgramId: filter.studyProgramId,
        categoryId: filter.categoryId,
        subject: filter.subject,
      };
      const matchingBibIds = await getFilteredBibliographyIds(bibFilter);
      if (matchingBibIds !== null && matchingBibIds.length === 0) {
        return "\uFEFF" + ITEM_HEADERS.join(";") + "\n";
      }
      if (matchingBibIds !== null) {
        itemConditions.push(inArray(items.bibliographyId, matchingBibIds));
      }
    }

    const where = itemConditions.length > 1 ? and(...itemConditions) : isNull(items.deletedAt);

    const allItems = await db.query.items.findMany({
      where,
      with: {
        bibliography: true,
        location: true,
        vendor: true,
        collectionType: true,
      },
      orderBy: [asc(items.itemCode)],
    });

    const lines: string[] = [ITEM_HEADERS.join(";")];

    for (const item of allItems) {
      const locationName = (item as any).location
        ? `${(item as any).location.room}, ${(item as any).location.rack}, ${(item as any).location.shelf}`
        : "";
      const statusMap: Record<string, string> = {
        available: "Available",
        loaned: "Loaned",
        damaged: "Damaged",
        lost: "Lost",
      };

      const row = [
        escapeCsvField(item.itemCode),
        escapeCsvField(item.callNumber || ""),
        escapeCsvField((item as any).collectionType?.name || ""),
        escapeCsvField(item.inventoryCode || ""),
        escapeCsvField(formatDate(item.receivedDate)),
        escapeCsvField((item as any).vendor?.name || ""),
        escapeCsvField(item.orderNo || ""),
        escapeCsvField(locationName),
        escapeCsvField(formatDate(item.orderDate)),
        escapeCsvField(statusMap[item.status] || item.status),
        escapeCsvField(item.site || ""),
        escapeCsvField(item.source || ""),
        escapeCsvField(item.invoice || ""),
        escapeCsvField(item.price || ""),
        escapeCsvField(item.priceCurrency || ""),
        escapeCsvField(formatDate(item.invoiceDate)),
        escapeCsvField(formatDate(item.createdAt)),
        escapeCsvField(formatDate(item.updatedAt)),
        escapeCsvField((item as any).bibliography?.title || ""),
      ];
      lines.push(row.join(";"));
    }

    return "\uFEFF" + lines.join("\n");
  }
}

export const exportService = new ExportService();
