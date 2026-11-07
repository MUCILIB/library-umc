import { db } from "../../../db";
import {
  bibliographies, items, bibliographyAuthors, bibliographySubjects,
  bibliographyFaculties, bibliographyStudyPrograms,
  authors, subjects, publishers, publicationPlaces, gmds,
  languages, locations, vendors, collectionTypes, faculties, studyPrograms,
  guestLogs, loans, Users, members
} from "../../../db/schema";
import { eq, and, isNull, asc, desc, inArray, ilike, gte, lte, or } from "drizzle-orm";
import PDFDocument from "pdfkit";
import { Response } from "express";

const BIBLIO_HEADERS = [
  "title", "gmd_name", "edition", "isbn", "issn", "isbn_issn", "publisher_name",
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

const GUEST_HEADERS = ["name", "identifier", "email", "faculty", "major", "visit_date"];

const LOAN_HEADERS = [
  "loan_id", "borrower_name", "borrower_email", "identifier", "faculty",
  "item_code", "title", "loan_date", "due_date", "return_date", "status", "extend_count"
];

const USER_HEADERS = [
  "id", "name", "email", "role", "identifier", "faculty", "phone", "card_status", "banned", "created_at"
];

export interface ExportFilter {
  facultyId?: number;
  studyProgramId?: number;
  categoryId?: number;
  subject?: string;
  status?: string;
  delimiter?: ";" | ",";
}

export interface GuestExportFilter {
  startDate?: string;
  endDate?: string;
  faculty?: string;
  major?: string;
  search?: string;
  delimiter?: ";" | ",";
}

export interface LoanExportFilter {
  status?: string;
  startDate?: string;
  endDate?: string;
  faculty?: string;
  search?: string;
  delimiter?: ";" | ",";
}

export interface UserExportFilter {
  role?: string;
  faculty?: string;
  banned?: boolean;
  search?: string;
  delimiter?: ";" | ",";
}

function escapeCsvField(value: string | null | undefined, delimiter: string = ";"): string {
  if (value === null || value === undefined) return "";
  let str = String(value);
  // Neutralize CSV/Spreadsheet formula injection (OWASP CWE-1236)
  if (/^[-=+@]/.test(str) || str.charCodeAt(0) === 9 || str.charCodeAt(0) === 13) {
    str = "'" + str;
  }
  if (str.includes(delimiter) || str.includes('"') || str.includes("\n") || str.includes(String.fromCharCode(13)) || (delimiter !== "," && str.includes(","))) {
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

function formatDateTime(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  return date.toISOString().replace("T", " ").substring(0, 19);
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
    const delimiter = filter?.delimiter || ";";
    const matchingIds = filter ? await getFilteredBibliographyIds(filter) : null;
    if (matchingIds !== null && matchingIds.length === 0) {
      return "\uFEFF" + BIBLIO_HEADERS.join(delimiter) + "\n";
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

    const lines: string[] = [BIBLIO_HEADERS.join(delimiter)];

    for (const bib of rows) {
      const authorNames = bib.bibliographyAuthors.map(ca => `<${ca.author.name}>`).join("");
      const topicNames = bib.bibliographySubjects.map(cs => `<${cs.subject.name}>`).join("");
      const itemCodes = bib.items.map(i => `<${i.itemCode}>`).join("");
      const facultyNames = [...new Set(bib.bibliographyFaculties.map(bf => bf.faculty.name))].join(", ");
      const studyProgramNames = [...new Set(bib.bibliographyStudyPrograms.map(bsp => bsp.studyProgram.name))].join(", ");

      const row = [
        escapeCsvField(bib.title, delimiter),
        escapeCsvField(bib.gmd?.name || "", delimiter),
        escapeCsvField(bib.edition || "", delimiter),
        escapeCsvField(bib.isbn || "", delimiter),
        escapeCsvField(bib.issn || "", delimiter),
        escapeCsvField(bib.isbnIssn || "", delimiter),
        escapeCsvField(bib.publisher?.name || "", delimiter),
        escapeCsvField(bib.publishYear?.toString() || "", delimiter),
        escapeCsvField(bib.collation || "", delimiter),
        escapeCsvField(bib.seriesTitle || "", delimiter),
        escapeCsvField(bib.callNumber || "", delimiter),
        escapeCsvField(bib.language?.name || "", delimiter),
        escapeCsvField(bib.publicationPlace?.name || "", delimiter),
        escapeCsvField(bib.classification || "", delimiter),
        escapeCsvField(bib.notes || "", delimiter),
        escapeCsvField(bib.image || "", delimiter),
        escapeCsvField(bib.sor || "", delimiter),
        escapeCsvField(authorNames, delimiter),
        escapeCsvField(topicNames, delimiter),
        escapeCsvField(itemCodes, delimiter),
        escapeCsvField(facultyNames, delimiter),
        escapeCsvField(studyProgramNames, delimiter),
      ];
      lines.push(row.join(delimiter));
    }

    return "\uFEFF" + lines.join("\n");
  }

  async exportItems(filter?: ExportFilter): Promise<string> {
    const delimiter = filter?.delimiter || ";";
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
        return "\uFEFF" + ITEM_HEADERS.join(delimiter) + "\n";
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

    const lines: string[] = [ITEM_HEADERS.join(delimiter)];

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
        escapeCsvField(item.itemCode, delimiter),
        escapeCsvField(item.callNumber || "", delimiter),
        escapeCsvField((item as any).collectionType?.name || "", delimiter),
        escapeCsvField(item.inventoryCode || "", delimiter),
        escapeCsvField(formatDate(item.receivedDate), delimiter),
        escapeCsvField((item as any).vendor?.name || "", delimiter),
        escapeCsvField(item.orderNo || "", delimiter),
        escapeCsvField(locationName, delimiter),
        escapeCsvField(formatDate(item.orderDate), delimiter),
        escapeCsvField(statusMap[item.status] || item.status, delimiter),
        escapeCsvField(item.site || "", delimiter),
        escapeCsvField(item.source || "", delimiter),
        escapeCsvField(item.invoice || "", delimiter),
        escapeCsvField(item.price || "", delimiter),
        escapeCsvField(item.priceCurrency || "", delimiter),
        escapeCsvField(formatDate(item.invoiceDate), delimiter),
        escapeCsvField(formatDate(item.createdAt), delimiter),
        escapeCsvField(formatDate(item.updatedAt), delimiter),
        escapeCsvField((item as any).bibliography?.title || "", delimiter),
      ];
      lines.push(row.join(delimiter));
    }

    return "\uFEFF" + lines.join("\n");
  }

  async exportGuests(filter?: GuestExportFilter): Promise<string> {
    const conditions: any[] = [isNull(guestLogs.deletedAt)];

    if (filter?.startDate) {
      const s = new Date(filter.startDate);
      if (!isNaN(s.getTime())) conditions.push(gte(guestLogs.visitDate, s));
    }
    if (filter?.endDate) {
      const e = new Date(filter.endDate);
      if (!isNaN(e.getTime())) {
        if (filter.endDate.length <= 10) {
          e.setHours(23, 59, 59, 999);
        }
        conditions.push(lte(guestLogs.visitDate, e));
      }
    }
    if (filter?.faculty) {
      conditions.push(ilike(guestLogs.faculty, `%${filter.faculty}%`));
    }
    if (filter?.major) {
      conditions.push(ilike(guestLogs.major, `%${filter.major}%`));
    }
    if (filter?.search) {
      conditions.push(
        or(
          ilike(guestLogs.name, `%${filter.search}%`),
          ilike(guestLogs.identifier, `%${filter.search}%`),
          ilike(guestLogs.email, `%${filter.search}%`)
        )
      );
    }

    const rows = await db
      .select()
      .from(guestLogs)
      .where(and(...conditions))
      .orderBy(desc(guestLogs.visitDate));

    const lines: string[] = [GUEST_HEADERS.join(";")];
    for (const g of rows) {
      const row = [
        escapeCsvField(g.name),
        escapeCsvField(g.identifier),
        escapeCsvField(g.email || ""),
        escapeCsvField(g.faculty || ""),
        escapeCsvField(g.major || ""),
        escapeCsvField(formatDateTime(g.visitDate)),
      ];
      lines.push(row.join(";"));
    }

    return "\uFEFF" + lines.join("\n");
  }

  async exportLoans(filter?: LoanExportFilter): Promise<string> {
    const conditions: any[] = [isNull(loans.deletedAt)];

    if (filter?.status && filter.status !== "all") {
      conditions.push(eq(loans.status, filter.status as any));
    }
    if (filter?.startDate) {
      conditions.push(gte(loans.loanDate, filter.startDate));
    }
    if (filter?.endDate) {
      conditions.push(lte(loans.loanDate, filter.endDate));
    }

    const rows = await db.query.loans.findMany({
      where: and(...conditions),
      with: {
        member: {
          with: {
            user: true,
          },
        },
        item: {
          with: {
            bibliography: true,
          },
        },
      },
      orderBy: [desc(loans.createdAt)],
    });

    let filtered = rows;
    if (filter?.faculty) {
      const f = filter.faculty.toLowerCase();
      filtered = filtered.filter(l => (l.member?.faculty || "").toLowerCase().includes(f));
    }
    if (filter?.search) {
      const s = filter.search.toLowerCase();
      filtered = filtered.filter(l =>
        (l.member?.user?.name || "").toLowerCase().includes(s) ||
        (l.member?.nimNidn || "").toLowerCase().includes(s) ||
        (l.item?.itemCode || "").toLowerCase().includes(s) ||
        (l.item?.bibliography?.title || "").toLowerCase().includes(s)
      );
    }

    const lines: string[] = [LOAN_HEADERS.join(";")];
    for (const l of filtered) {
      const row = [
        escapeCsvField(l.id),
        escapeCsvField(l.member?.user?.name || ""),
        escapeCsvField(l.member?.user?.email || ""),
        escapeCsvField(l.member?.nimNidn || ""),
        escapeCsvField(l.member?.faculty || ""),
        escapeCsvField(l.item?.itemCode || ""),
        escapeCsvField(l.item?.bibliography?.title || ""),
        escapeCsvField(formatDate(l.loanDate)),
        escapeCsvField(formatDate(l.dueDate)),
        escapeCsvField(formatDate(l.returnDate)),
        escapeCsvField(l.status),
        escapeCsvField(String(l.extendCount ?? 0)),
      ];
      lines.push(row.join(";"));
    }

    return "\uFEFF" + lines.join("\n");
  }

  async exportUsers(filter?: UserExportFilter): Promise<string> {
    const conditions: any[] = [isNull(Users.deletedAt)];

    if (filter?.role && filter.role !== "all") {
      conditions.push(eq(Users.role, filter.role));
    }
    if (filter?.banned !== undefined) {
      conditions.push(eq(Users.banned, filter.banned));
    }

    const rows = await db.query.Users.findMany({
      where: and(...conditions),
      with: {
        member: true,
      },
      orderBy: [asc(Users.name)],
    });

    let filtered = rows;
    if (filter?.faculty) {
      const f = filter.faculty.toLowerCase();
      filtered = filtered.filter(u => (u.member?.faculty || "").toLowerCase().includes(f));
    }
    if (filter?.search) {
      const s = filter.search.toLowerCase();
      filtered = filtered.filter(u =>
        (u.name || "").toLowerCase().includes(s) ||
        (u.email || "").toLowerCase().includes(s) ||
        (u.member?.nimNidn || "").toLowerCase().includes(s)
      );
    }

    const lines: string[] = [USER_HEADERS.join(";")];
    for (const u of filtered) {
      const row = [
        escapeCsvField(u.id),
        escapeCsvField(u.name),
        escapeCsvField(u.email),
        escapeCsvField(u.role || "student"),
        escapeCsvField(u.member?.nimNidn || ""),
        escapeCsvField(u.member?.faculty || ""),
        escapeCsvField(u.member?.phone || ""),
        escapeCsvField(u.member?.cardStatus || ""),
        escapeCsvField(u.banned ? "Ya" : "Tidak"),
        escapeCsvField(formatDateTime(u.createdAt)),
      ];
      lines.push(row.join(";"));
    }

    return "\uFEFF" + lines.join("\n");
  }

  async exportBibliographiesPdf(res: Response, filter: ExportFilter = {}): Promise<void> {
    const matchingIds = await getFilteredBibliographyIds(filter);
    if (matchingIds !== null && matchingIds.length === 0) {
      const doc = new PDFDocument({ margin: 36, size: "A4", layout: "landscape" });
      doc.pipe(res);
      doc.fontSize(16).font("Helvetica-Bold").text("MUCILIB — Perpustakaan UMC", { align: "center" });
      doc.fontSize(11).font("Helvetica").text("Tidak ada data koleksi yang sesuai dengan filter yang dipilih.", { align: "center" });
      doc.end();
      return;
    }

    const where = matchingIds !== null
      ? and(isNull(bibliographies.deletedAt), inArray(bibliographies.id, matchingIds))
      : isNull(bibliographies.deletedAt);

    const rows = await db.query.bibliographies.findMany({
      where,
      with: {
        publisher: true,
        bibliographyAuthors: { with: { author: true } },
        items: { where: isNull(items.deletedAt) },
      },
      orderBy: [asc(bibliographies.title)],
    });

    let facultyLabel = "Semua Fakultas";
    if (filter.facultyId) {
      const f = await db.query.faculties.findFirst({ where: eq(faculties.id, filter.facultyId) });
      if (f) facultyLabel = f.name;
    }
    let prodiLabel = "Semua Program Studi";
    if (filter.studyProgramId) {
      const sp = await db.query.studyPrograms.findFirst({ where: eq(studyPrograms.id, filter.studyProgramId) });
      if (sp) prodiLabel = sp.name;
    }

    const doc = new PDFDocument({ margin: 36, size: "A4", layout: "landscape" });
    doc.pipe(res);

    // Header Kop
    doc.fontSize(15).font("Helvetica-Bold").text("MUCILIB — PERPUSTAKAAN UNIVERSITAS MUHAMMADIYAH CIREBON", { align: "center" });
    doc.fontSize(10).font("Helvetica").text("Katalog Koleksi Bahan Pustaka & Eksemplar", { align: "center" });
    doc.fontSize(8).fillColor("#64748B").text(
      `Fakultas: ${facultyLabel} | Program Studi: ${prodiLabel} | Dicetak: ${new Date().toLocaleDateString("id-ID", { dateStyle: "long" })}`,
      { align: "center" }
    );
    doc.fillColor("#000000");
    doc.moveDown(0.8);

    const startX = 36;
    const colWidths = [25, 270, 160, 110, 70, 50, 75];
    const headers = ["No", "Judul Buku", "Pengarang", "ISBN / ISSN", "DDC", "Tahun", "Eksemplar"];
    let y = doc.y;

    doc.rect(startX, y, 760, 18).fill("#0F172A");
    doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(8);
    let curX = startX + 4;
    headers.forEach((h, i) => {
      doc.text(h, curX, y + 5, { width: colWidths[i] - 4, lineBreak: false });
      curX += colWidths[i];
    });
    doc.fillColor("#000000");
    y += 18;

    let totalCopies = 0;
    doc.font("Helvetica").fontSize(7.5);

    rows.forEach((bib, idx) => {
      if (y > 520) {
        doc.addPage();
        y = 36;
        doc.rect(startX, y, 760, 18).fill("#0F172A");
        doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(8);
        let hX = startX + 4;
        headers.forEach((h, i) => {
          doc.text(h, hX, y + 5, { width: colWidths[i] - 4, lineBreak: false });
          hX += colWidths[i];
        });
        doc.fillColor("#000000").font("Helvetica").fontSize(7.5);
        y += 18;
      }

      const copyCount = bib.items?.length || 0;
      totalCopies += copyCount;
      const authorStr = bib.bibliographyAuthors.map(ba => ba.author.name).join(", ") || "-";
      const isbnStr = bib.isbn || bib.isbnIssn || bib.issn || "-";

      const bg = idx % 2 === 0 ? "#F8FAFC" : "#FFFFFF";
      doc.rect(startX, y, 760, 16).fill(bg);
      doc.fillColor("#000000");

      curX = startX + 4;
      const values = [
        String(idx + 1),
        bib.title,
        authorStr,
        isbnStr,
        bib.classification || bib.callNumber || "-",
        bib.publishYear ? String(bib.publishYear) : "-",
        `${copyCount} eks`
      ];

      values.forEach((val, i) => {
        doc.text(val, curX, y + 4, { width: colWidths[i] - 4, lineBreak: false });
        curX += colWidths[i];
      });

      y += 16;
    });

    doc.rect(startX, y + 6, 760, 20).fill("#F1F5F9");
    doc.fillColor("#0F172A").font("Helvetica-Bold").fontSize(8);
    doc.text(
      `Total Judul Koleksi: ${rows.length} judul  |  Total Eksemplar Fisik: ${totalCopies} eksemplar`,
      startX + 8,
      y + 12
    );

    doc.end();
  }
}

export const exportService = new ExportService();
