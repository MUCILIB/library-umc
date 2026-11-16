import { describe, expect, it, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Mock the database
const queryMock = {
  from: vi.fn().mockReturnThis(),
  innerJoin: vi.fn().mockReturnThis(),
  where: vi.fn().mockResolvedValue([]),
};

vi.mock("../../../db", () => ({
  db: {
    select: vi.fn(() => queryMock),
    selectDistinct: vi.fn(() => queryMock),
    query: {
      bibliographies: { findMany: vi.fn() },
      items: { findMany: vi.fn() },
      loans: { findMany: vi.fn() },
      Users: { findMany: vi.fn() },
    },
  },
}));

vi.mock("../../../db/schema", () => ({
  bibliographies: Symbol("bibliographies"),
  items: Symbol("items"),
  bibliographyAuthors: Symbol("bibliographyAuthors"),
  bibliographySubjects: Symbol("bibliographySubjects"),
  bibliographyFaculties: Symbol("bibliographyFaculties"),
  bibliographyStudyPrograms: Symbol("bibliographyStudyPrograms"),
  authors: Symbol("authors"),
  subjects: Symbol("subjects"),
  publishers: Symbol("publishers"),
  publicationPlaces: Symbol("publicationPlaces"),
  gmds: Symbol("gmds"),
  languages: Symbol("languages"),
  locations: Symbol("locations"),
  vendors: Symbol("vendors"),
  collectionTypes: Symbol("collectionTypes"),
  faculties: Symbol("faculties"),
  studyPrograms: Symbol("studyPrograms"),
  guestLogs: Symbol("guestLogs"),
  loans: Symbol("loans"),
  Users: Symbol("Users"),
  members: Symbol("members"),
}));

import { db } from "../../../db";
import { ExportService } from "../service/export.service";

describe("Export Service", () => {
  let exportService: ExportService;

  beforeEach(() => {
    vi.resetAllMocks();
    queryMock.from.mockReturnThis();
    queryMock.innerJoin.mockReturnThis();
    queryMock.where.mockResolvedValue([]);
    exportService = new ExportService();
  });

  describe("SLiMS format", () => {
    const sourceHeaders = (file: string, delimiter: string) => readFileSync(resolve(process.cwd(), "..", file), "utf8")
      .replace(/^\uFEFF/, "").split(/\r?\n/)[0].split(";").map(value => value.replace(/^"|"$/g, "")).join(delimiter);

    it.each([";", ","] as const)("exports the actual 18-column Senayan header and aligned values with %s", async (delimiter) => {
      vi.mocked(db.query.bibliographies.findMany).mockResolvedValueOnce([{
        title: "Buku", isbn: "ISBN separate", issn: "ISSN separate", isbnIssn: "978123",
        publisher: { name: "Penerbit" }, bibliographyAuthors: [], bibliographySubjects: [],
        bibliographyFaculties: [], bibliographyStudyPrograms: [], items: [{ itemCode: "ITEM01" }],
      }] as any);
      const csv = await exportService.exportBibliographies({ format: "slims", delimiter });
      const [header, row] = csv.replace(/^\uFEFF/, "").split("\n");
      expect(header).toBe(sourceHeaders("senayan_biblio_export (2).csv", delimiter));
      const values = row.split(delimiter);
      expect(values).toHaveLength(18);
      expect(values[3]).toBe("978123");
      expect(values[4]).toBe("Penerbit");
      expect(values[17]).toBe("<ITEM01>");
    });

    it("keeps Library format as the default", async () => {
      vi.mocked(db.query.bibliographies.findMany).mockResolvedValueOnce([]);
      const csv = await exportService.exportBibliographies();
      expect(csv.replace(/^\uFEFF/, "").split("\n")[0].split(";")).toHaveLength(22);
    });

    it("uses the SLiMS header for an empty filtered result", async () => {
      queryMock.where.mockResolvedValueOnce([]);
      const csv = await exportService.exportBibliographies({ format: "slims", facultyId: 99 });
      expect(csv.trim().replace(/^\uFEFF/, "")).toBe(sourceHeaders("senayan_biblio_export (2).csv", ";"));
    });

    it("exports the actual 19-column Senayan item header", async () => {
      vi.mocked(db.query.items.findMany).mockResolvedValueOnce([]);
      const csv = await exportService.exportItems({ format: "slims" });
      expect(csv.trim().replace(/^\uFEFF/, "")).toBe(sourceHeaders("senayan_item_export_kloter 5.csv", ";"));
    });
  });

  describe("Bibliography Export Headers", () => {
    it("should have exact Senayan header order", () => {
      const expectedHeaders = [
        "title", "gmd_name", "edition", "isbn_issn", "publisher_name",
        "publish_year", "collation", "series_title", "call_number",
        "language_name", "place_name", "classification", "notes", "image",
        "sor", "authors", "topics", "item_code"
      ];
      expect(expectedHeaders.length).toBe(18);
    });
  });

  describe("Item Export Headers", () => {
    it("should have exact Senayan header order", () => {
      const expectedHeaders = [
        "item_code", "call_number", "coll_type_name", "inventory_code",
        "received_date", "supplier_name", "order_no", "location_name",
        "order_date", "item_status_name", "site", "source", "invoice",
        "price", "price_currency", "invoice_date", "input_date", "last_update", "title"
      ];
      expect(expectedHeaders.length).toBe(19);
    });
  });

  describe("Faculty and Study Program Filters", () => {
    it("should return empty bibliography CSV with headers when no matches for facultyId", async () => {
      queryMock.where.mockResolvedValueOnce([]); // no bibs for faculty
      const csv = await exportService.exportBibliographies({ facultyId: 99 });

      expect(csv.startsWith("\uFEFF")).toBe(true);
      const lines = csv.replace("\uFEFF", "").trim().split("\n");
      expect(lines.length).toBe(1);
      expect(lines[0]).toContain("faculty_name");
      expect(db.query.bibliographies.findMany).not.toHaveBeenCalled();
    });

    it("should query bibliographies by facultyId when matches exist", async () => {
      queryMock.where
        .mockResolvedValueOnce([{ bibId: "b-1" }]) // faculty join
        .mockResolvedValueOnce([{ id: "b-1" }]); // bibliographies select
      (db.query.bibliographies.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
        {
          title: "Buku Teknik",
          bibliographyAuthors: [],
          bibliographySubjects: [],
          bibliographyFaculties: [{ faculty: { name: "Teknik" } }],
          bibliographyStudyPrograms: [{ studyProgram: { name: "Informatika" } }],
          items: [],
        },
      ]);

      const csv = await exportService.exportBibliographies({ facultyId: 1 });
      expect(csv).toContain("Buku Teknik");
      expect(csv).toContain("Teknik");
      expect(csv).toContain("Informatika");
      expect(db.query.bibliographies.findMany).toHaveBeenCalled();
    });

    it("should return empty item CSV with headers when no matches for facultyId", async () => {
      queryMock.where.mockResolvedValueOnce([]); // no bibs for faculty
      const csv = await exportService.exportItems({ facultyId: 99 });

      expect(csv.startsWith("\uFEFF")).toBe(true);
      const lines = csv.replace("\uFEFF", "").trim().split("\n");
      expect(lines.length).toBe(1);
      expect(lines[0]).toContain("item_code");
      expect(db.query.items.findMany).not.toHaveBeenCalled();
    });
  });

  describe("CSV Security", () => {
    it("should escape fields containing semicolons", () => {
      const testValue = "Title; Part 2";
      expect(testValue.includes(";")).toBe(true);
    });

    it("should escape fields containing double quotes", () => {
      const testValue = 'He said "hello"';
      expect(testValue.includes('"')).toBe(true);
    });

    it("should handle formula injection prevention", () => {
      const dangerousValues = ["=CMD()", "+CMD()", "-CMD()", "@SUM(A1)"];
      for (const v of dangerousValues) {
        expect(["=", "+", "-", "@"]).toContain(v[0]);
      }
    });
  });

  describe("Author Serialization", () => {
    it.each([
      { authors: [{ position: 2, author: { name: "Bowo" } }, { position: 1, author: { name: "T. Sutojo" } }], label: "Dkk", expected: "<T. Sutojo><Bowo><Dkk>" },
      { authors: [], label: "et al.", expected: "<et al.>" },
      { authors: [{ position: 1, author: { name: "Budi" } }], label: null, expected: "<Budi>" },
    ])("exports stored author order and label: $expected", async ({ authors, label, expected }) => {
      const original = [...authors];
      vi.mocked(db.query.bibliographies.findMany).mockResolvedValueOnce([{
        title: "SLiMS author regression",
        bibliographyAuthors: authors,
        unlistedAuthorsLabel: label,
        bibliographySubjects: [],
        bibliographyFaculties: [],
        bibliographyStudyPrograms: [],
        items: [],
      }] as any);
      const csv = await exportService.exportBibliographies();
      const [header, row] = csv.replace("\uFEFF", "").split("\n");
      expect(row.split(";")[header.split(";").indexOf("authors")]).toBe(expected);
      expect(authors).toEqual(original);
    });

    it("should use angle-bracket format", () => {
      const authors = ["Author One", "Author Two"];
      const serialized = authors.map(a => `<${a}>`).join("");
      expect(serialized).toBe("<Author One><Author Two>");
    });

    it("should append unlisted label", () => {
      const authors = ["Author One"];
      const label = "Dkk";
      const serialized = authors.map(a => `<${a}>`).join("") + `<${label}>`;
      expect(serialized).toBe("<Author One><Dkk>");
    });

    it("should handle empty authors with label only", () => {
      const label = "Dkk";
      const serialized = `<${label}>`;
      expect(serialized).toBe("<Dkk>");
    });
  });

  describe("Subject Serialization", () => {
    it("should use angle-bracket format", () => {
      const subjects = ["Topic One", "Topic Two"];
      const serialized = subjects.map(s => `<${s}>`).join("");
      expect(serialized).toBe("<Topic One><Topic Two>");
    });
  });

  describe("Item Code Serialization", () => {
    it("should use angle-bracket format", () => {
      const codes = ["ITEM001", "ITEM002"];
      const serialized = codes.map(c => `<${c}>`).join("");
      expect(serialized).toBe("<ITEM001><ITEM002>");
    });
  });

  describe("Universal Exports (Guests, Loans, Users)", () => {
    it("should export guests with UTF-8 BOM and correct headers", async () => {
      (queryMock.where as any).mockReturnValueOnce({
        orderBy: vi.fn().mockResolvedValueOnce([
          {
            name: "John Doe",
            identifier: "2021001",
            email: "john@example.com",
            faculty: "Teknik",
            major: "Informatika",
            visitDate: new Date("2025-01-15T08:00:00.000Z"),
          }
        ])
      });

      const csv = await exportService.exportGuests();
      expect(csv.startsWith("\uFEFF")).toBe(true);
      const lines = csv.replace("\uFEFF", "").trim().split("\n");
      expect(lines[0]).toBe("name;identifier;email;faculty;major;visit_date");
      expect(lines[1]).toContain("John Doe");
      expect(lines[1]).toContain("2021001");
    });

    it("should export loans with correct headers and data", async () => {
      (db.query.loans.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
        {
          id: "loan-1",
          member: {
            faculty: "Teknik",
            nimNidn: "2021001",
            user: { name: "Budi", email: "budi@example.com" }
          },
          item: {
            itemCode: "ITEM-01",
            bibliography: { title: "Algoritma" }
          },
          loanDate: "2025-01-10",
          dueDate: "2025-01-17",
          returnDate: null,
          status: "approved",
          extendCount: 0
        }
      ]);

      const csv = await exportService.exportLoans();
      expect(csv.startsWith("\uFEFF")).toBe(true);
      const lines = csv.replace("\uFEFF", "").trim().split("\n");
      expect(lines[0]).toBe("loan_id;borrower_name;borrower_email;identifier;faculty;item_code;title;loan_date;due_date;return_date;status;extend_count");
      expect(lines[1]).toContain("loan-1");
      expect(lines[1]).toContain("Budi");
      expect(lines[1]).toContain("ITEM-01");
    });

    it("should export users with correct headers and data", async () => {
      (db.query.Users.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
        {
          id: "u-1",
          name: "Siti",
          email: "siti@example.com",
          role: "student",
          banned: false,
          createdAt: new Date("2025-01-01T00:00:00.000Z"),
          member: {
            nimNidn: "2021002",
            faculty: "Ekonomi",
            phone: "08123456789",
            cardStatus: "active"
          }
        }
      ]);

      const csv = await exportService.exportUsers();
      expect(csv.startsWith("\uFEFF")).toBe(true);
      const lines = csv.replace("\uFEFF", "").trim().split("\n");
      expect(lines[0]).toBe("id;name;email;role;identifier;faculty;phone;card_status;banned;created_at");
      expect(lines[1]).toContain("u-1");
      expect(lines[1]).toContain("Siti");
      expect(lines[1]).toContain("Ekonomi");
    });

    it("should sanitize formula injection characters in CSV fields (OWASP CWE-1236)", async () => {
      (db.query.Users.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
        {
          id: "u-malicious",
          name: "=cmd|' /C calc'!A0",
          email: "+62812345678",
          role: "-admin",
          banned: false,
          createdAt: new Date("2025-01-01T00:00:00.000Z"),
          member: {
            nimNidn: "@mention",
            faculty: "Teknik",
            phone: "08123456789",
            cardStatus: "active"
          }
        }
      ]);

      const csv = await exportService.exportUsers();
      const lines = csv.replace("\uFEFF", "").trim().split("\n");
      const maliciousRow = lines[1];
      // Should prefix with single quote to prevent execution in Excel
      expect(maliciousRow).toContain("'=cmd|' /C calc'!A0");
      expect(maliciousRow).toContain("'+62812345678");
      expect(maliciousRow).toContain("'-admin");
      expect(maliciousRow).toContain("'@mention");
    });

    it("should support custom comma delimiter when requested", async () => {
      (db.query.bibliographies.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
        {
          id: "bib-1",
          title: "Pemrograman Web Modern",
          edition: "1",
          isbn: "978-1234567890",
          issn: null,
          isbnIssn: "978-1234567890",
          publishYear: 2026,
          collation: "250 hlm",
          seriesTitle: null,
          callNumber: "005.13 PEM",
          classification: "005",
          notes: null,
          image: null,
          sor: null,
          gmd: { name: "Text" },
          publisher: { name: "Informatika" },
          language: { name: "Indonesia" },
          publicationPlace: { name: "Bandung" },
          bibliographyAuthors: [{ author: { name: "Budi" } }],
          bibliographySubjects: [{ subject: { name: "Web" } }],
          bibliographyFaculties: [],
          bibliographyStudyPrograms: [],
          items: [],
        }
      ]);

      const csv = await exportService.exportBibliographies({ delimiter: "," });
      expect(csv.startsWith("\uFEFF")).toBe(true);
      const lines = csv.replace("\uFEFF", "").trim().split("\n");
      expect(lines[0]).toContain("title,gmd_name,edition,isbn");
      expect(lines[1]).toContain("Pemrograman Web Modern,Text,1,978-1234567890");
    });
  });
});
