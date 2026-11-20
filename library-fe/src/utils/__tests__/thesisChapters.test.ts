import { describe, it, expect } from "vitest";
import {
  detectMajorChapterType,
  getProgramChapterConfig,
  getChapterOptionsForProgram,
  getChapterBadge,
  getChapterInfo,
  CHAPTER_CONFIGS,
} from "../thesisChapters";

describe("thesisChapters Utility", () => {
  describe("detectMajorChapterType", () => {
    it("identifies Teknik Informatika (TI) from code and name", () => {
      expect(detectMajorChapterType({ name: "S1 Teknik Informatika", code: "TI-S1" })).toBe("TI");
      expect(detectMajorChapterType({ name: "D3 Teknik Informatika", code: "TI-D3" })).toBe("TI");
      expect(detectMajorChapterType({ name: "Teknik Informatika", code: "TIF" })).toBe("TI");
      expect(detectMajorChapterType({ name: "Ilmu Komputer", code: "IK" })).toBe("TI");
      expect(detectMajorChapterType({ name: "Sistem Informasi", code: "SI-S1" })).toBe("TI");
      expect(detectMajorChapterType({ name: "Rekayasa Perangkat Lunak", code: "RPL" })).toBe("TI");
    });

    it("identifies Teknik Industri (TIND) correctly", () => {
      expect(detectMajorChapterType({ name: "S1 Teknik Industri", code: "TIND-S1" })).toBe("TIND");
      expect(detectMajorChapterType({ name: "Teknik Industri" })).toBe("TIND");
    });

    it("identifies Ilmu Kesehatan (FIKES) correctly", () => {
      expect(detectMajorChapterType({ name: "S1 Ilmu Keperawatan", code: "KEP-S1" })).toBe("KESEHATAN");
      expect(detectMajorChapterType({ name: "S1 Gizi", code: "GIZI-S1" })).toBe("KESEHATAN");
      expect(detectMajorChapterType({ name: "Profesi Ners", code: "NERS-A" })).toBe("KESEHATAN");
    });

    it("defaults to STANDARD 5-BAB for other departments (FEB, FKIP, FH, FISIP, FAI)", () => {
      expect(detectMajorChapterType({ name: "S1 Akuntansi", code: "AKT-S1" })).toBe("STANDARD");
      expect(detectMajorChapterType({ name: "S1 Manajemen", code: "MNJ-S1" })).toBe("STANDARD");
      expect(detectMajorChapterType({ name: "S1 Ilmu Hukum", code: "IH-S1" })).toBe("STANDARD");
      expect(detectMajorChapterType({ name: "S1 PGSD", code: "PGSD-S1" })).toBe("STANDARD");
      expect(detectMajorChapterType({ name: "S1 Pendidikan Matematika", code: "PMAT-S1" })).toBe("STANDARD");
      expect(detectMajorChapterType({ name: "S1 Peternakan", code: "PTR-S1" })).toBe("STANDARD");
      expect(detectMajorChapterType(null)).toBe("STANDARD");
      expect(detectMajorChapterType(undefined)).toBe("STANDARD");
    });
  });

  describe("getProgramChapterConfig", () => {
    it("provides 6 main BAB for Teknik Informatika (TI)", () => {
      const config = getProgramChapterConfig({ name: "S1 Teknik Informatika", code: "TI-S1" });
      expect(config.type).toBe("TI");
      expect(config.totalChapters).toBe(6);

      const chapterValues = config.chapters.map((c) => c.value);
      expect(chapterValues).toContain("BAB_1");
      expect(chapterValues).toContain("BAB_2");
      expect(chapterValues).toContain("BAB_3");
      expect(chapterValues).toContain("BAB_4");
      expect(chapterValues).toContain("BAB_5");
      expect(chapterValues).toContain("BAB_6");
      expect(chapterValues).toContain("FULL_TEXT");
      expect(chapterValues).toContain("FRONT_MATTER");
      expect(chapterValues).toContain("BACK_MATTER");
      expect(chapterValues).toContain("OTHER");

      // Verify TI specific chapter titles
      const bab3 = config.chapters.find((c) => c.value === "BAB_3");
      expect(bab3?.label).toContain("Analisis Sistem");

      const bab4 = config.chapters.find((c) => c.value === "BAB_4");
      expect(bab4?.label).toContain("Perancangan Sistem");

      const bab5 = config.chapters.find((c) => c.value === "BAB_5");
      expect(bab5?.label).toContain("Implementasi dan Pengujian Sistem");

      const bab6 = config.chapters.find((c) => c.value === "BAB_6");
      expect(bab6?.label).toContain("Penutup / Kesimpulan & Saran");
    });

    it("provides 5 main BAB for STANDARD majors", () => {
      const config = getProgramChapterConfig({ name: "S1 Manajemen", code: "MNJ-S1" });
      expect(config.type).toBe("STANDARD");
      expect(config.totalChapters).toBe(5);

      const chapterValues = config.chapters.map((c) => c.value);
      expect(chapterValues).toContain("BAB_1");
      expect(chapterValues).toContain("BAB_2");
      expect(chapterValues).toContain("BAB_3");
      expect(chapterValues).toContain("BAB_4");
      expect(chapterValues).toContain("BAB_5");
      expect(chapterValues).not.toContain("BAB_6");

      const bab3 = config.chapters.find((c) => c.value === "BAB_3");
      expect(bab3?.label).toContain("Metodologi Penelitian");

      const bab4 = config.chapters.find((c) => c.value === "BAB_4");
      expect(bab4?.label).toContain("Hasil dan Pembahasan");

      const bab5 = config.chapters.find((c) => c.value === "BAB_5");
      expect(bab5?.label).toContain("Penutup / Kesimpulan & Saran");
    });

    it("provides 6 main BAB for Teknik Industri and FIKES", () => {
      const configTind = getProgramChapterConfig({ name: "S1 Teknik Industri", code: "TIND-S1" });
      expect(configTind.totalChapters).toBe(6);
      expect(configTind.chapters.map((c) => c.value)).toContain("BAB_6");

      const configHealth = getProgramChapterConfig({ name: "S1 Keperawatan", code: "KEP-S1" });
      expect(configHealth.totalChapters).toBe(6);
      expect(configHealth.chapters.map((c) => c.value)).toContain("BAB_6");
    });

    it("prioritizes custom admin settings map when available", () => {
      const customMap = {
        10: {
          studyProgramId: 10,
          totalChapters: 4,
          categoryLabel: "Kustom Hukum 4 Bab",
          badgeLabel: "Format 4 BAB (Kustom)",
          description: "Format 4 Bab Kustom",
          chapters: [
            { value: "FULL_TEXT", label: "Naskah Lengkap", defaultTitle: "Full Text", isMainChapter: false },
            { value: "BAB_1", label: "BAB 1: Pendahuluan", defaultTitle: "Pendahuluan", isMainChapter: true },
            { value: "BAB_2", label: "BAB 2: Teori", defaultTitle: "Teori", isMainChapter: true },
            { value: "BAB_3", label: "BAB 3: Analisis", defaultTitle: "Analisis", isMainChapter: true },
            { value: "BAB_4", label: "BAB 4: Penutup", defaultTitle: "Penutup", isMainChapter: true },
            { value: "BACK_MATTER", label: "Daftar Pustaka", defaultTitle: "Lampiran", isMainChapter: false },
          ],
        },
      };

      const config = getProgramChapterConfig({ id: 10, name: "S1 Ilmu Hukum", code: "IH-S1" }, customMap as any);
      expect(config.totalChapters).toBe(4);
      expect(config.categoryLabel).toBe("Kustom Hukum 4 Bab");
      expect(config.chapters.map((c) => c.value)).toEqual([
        "FULL_TEXT",
        "BAB_1",
        "BAB_2",
        "BAB_3",
        "BAB_4",
        "BACK_MATTER",
      ]);
    });
  });

  describe("getChapterBadge", () => {
    it("returns formatted badges for chapters and sections", () => {
      expect(getChapterBadge("BAB_1")).toBe("BAB 1");
      expect(getChapterBadge("BAB_4")).toBe("BAB 4");
      expect(getChapterBadge("BAB_6")).toBe("BAB 6");
      expect(getChapterBadge("FULL_TEXT")).toBe("Full Text");
      expect(getChapterBadge("FRONT_MATTER")).toBe("Bagian Awal");
      expect(getChapterBadge("BACK_MATTER")).toBe("Bagian Akhir");
      expect(getChapterBadge("OTHER")).toBe("Bab Khusus");
      expect(getChapterBadge(null)).toBe("Full Text");
      expect(getChapterBadge(undefined)).toBe("Full Text");
    });
  });

  describe("getChapterInfo", () => {
    it("retrieves chapter info in the context of the study program", () => {
      const tiInfo = getChapterInfo("BAB_4", { name: "Teknik Informatika", code: "TI-S1" });
      expect(tiInfo?.defaultTitle).toBe("Perancangan Sistem");

      const stdInfo = getChapterInfo("BAB_4", { name: "Akuntansi", code: "AKT-S1" });
      expect(stdInfo?.defaultTitle).toBe("Hasil Penelitian dan Pembahasan");
    });
  });

  describe("getChapterOptionsForProgram", () => {
    it("returns list of chapter options including common parts", () => {
      const options = getChapterOptionsForProgram({ name: "Teknik Informatika", code: "TI-S1" });
      expect(options.length).toBeGreaterThan(6);
      expect(options.some((o) => o.value === "BAB_6")).toBe(true);
    });
  });

  describe("CHAPTER_CONFIGS", () => {
    it("has preset configuration for all major chapter types", () => {
      expect(CHAPTER_CONFIGS.TI.totalChapters).toBe(6);
      expect(CHAPTER_CONFIGS.STANDARD.totalChapters).toBe(5);
      expect(CHAPTER_CONFIGS.TIND.totalChapters).toBe(6);
      expect(CHAPTER_CONFIGS.KESEHATAN.totalChapters).toBe(6);
    });
  });
});
