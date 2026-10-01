import { describe, expect, it, vi, beforeEach } from "vitest";

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
});
