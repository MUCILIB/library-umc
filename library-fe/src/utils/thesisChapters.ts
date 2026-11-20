/**
 * Modul Konfigurasi & Penentuan Struktur Bab Skripsi / Karya Ilmiah
 * Berdasarkan Program Studi (Jurusan) di Universitas Muhammadiyah Cirebon (UMC)
 * 
 * Karakteristik:
 * - Program Studi Teknik Informatika (TI) & Ilmu Komputer memiliki struktur 6 BAB:
 *   BAB 1 (Pendahuluan), BAB 2 (Landasan Teori), BAB 3 (Analisis Sistem & Metodologi),
 *   BAB 4 (Perancangan Sistem), BAB 5 (Implementasi & Pengujian), BAB 6 (Kesimpulan & Saran).
 * - Program Studi Teknik Industri (TIND) memiliki struktur 6 BAB (Pengumpulan & Pengolahan Data terpisah).
 * - Program Studi Ilmu Kesehatan (FIKES) memiliki struktur 6 BAB (Hasil & Pembahasan terpisah).
 * - Program Studi lainnya (FEB, FISIP, FKIP, FH, FAI, dll.) memiliki struktur standar 5 BAB.
 * - Setiap program tetap dilengkapi opsi Naskah Lengkap (Full Text), Bagian Awal (Front Matter),
 *   Bagian Akhir (Back Matter), dan Bab Khusus/Lainnya (Custom).
 */

export interface ChapterOption {
  value: string;
  label: string;
  defaultTitle: string;
  description?: string;
  isMainChapter?: boolean;
}

export type MajorChapterType = "TI" | "TIND" | "KESEHATAN" | "STANDARD";

export interface ProgramChapterConfig {
  type: MajorChapterType;
  categoryLabel: string;
  badgeLabel: string;
  totalChapters: number;
  description: string;
  chapters: ChapterOption[];
}

// ---------------------------------------------------------------------------
// Bagian Pelengkap / Kelengkapan Naskah yang Berlaku untuk Semua Jurusan
// ---------------------------------------------------------------------------
export const COMMON_PARTS_START: ChapterOption[] = [
  {
    value: "FULL_TEXT",
    label: "Naskah Lengkap (Full Text)",
    defaultTitle: "Naskah Lengkap Skripsi",
    description: "Seluruh berkas naskah skripsi utuh dari halaman awal hingga lampiran",
    isMainChapter: false,
  },
  {
    value: "FRONT_MATTER",
    label: "Bagian Awal (Cover, Pengesahan, Abstrak)",
    defaultTitle: "Cover, Lembar Pengesahan & Abstrak",
    description: "Halaman judul, lembar persetujuan/pengesahan, kata pengantar, abstrak, dan daftar isi",
    isMainChapter: false,
  },
];

export const COMMON_PARTS_END: ChapterOption[] = [
  {
    value: "BACK_MATTER",
    label: "Bagian Akhir (Daftar Pustaka & Lampiran)",
    defaultTitle: "Daftar Pustaka & Lampiran",
    description: "Daftar referensi pustaka, lampiran kuesioner/data, surat riset, atau manual sistem",
    isMainChapter: false,
  },
  {
    value: "OTHER",
    label: "Bab Khusus / Bagian Tambahan",
    defaultTitle: "Bagian Khusus Naskah",
    description: "Bab tambahan atau suplemen khusus di luar struktur baku",
    isMainChapter: false,
  },
];

// ---------------------------------------------------------------------------
// 1. TEKNIK INFORMATIKA (TI) - 6 BAB
// ---------------------------------------------------------------------------
const TI_MAIN_CHAPTERS: ChapterOption[] = [
  {
    value: "BAB_1",
    label: "BAB 1: Pendahuluan",
    defaultTitle: "Pendahuluan",
    description: "Latar Belakang, Rumusan Masalah, Batasan Masalah, Tujuan & Manfaat Penelitian",
    isMainChapter: true,
  },
  {
    value: "BAB_2",
    label: "BAB 2: Landasan Teori / Tinjauan Pustaka",
    defaultTitle: "Landasan Teori & Tinjauan Pustaka",
    description: "Teori pendukung, algoritma/metode, teknologi yang digunakan, serta penelitian terdahulu",
    isMainChapter: true,
  },
  {
    value: "BAB_3",
    label: "BAB 3: Analisis Sistem & Metodologi",
    defaultTitle: "Analisis Sistem & Metodologi Penelitian",
    description: "Metodologi riset/pengembangan, analisis sistem berjalan, analisis kebutuhan fungsional & non-fungsional",
    isMainChapter: true,
  },
  {
    value: "BAB_4",
    label: "BAB 4: Perancangan Sistem",
    defaultTitle: "Perancangan Sistem",
    description: "Arsitektur sistem, diagram UML (Use Case, Activity, Class), Entity Relationship Diagram (ERD), dan perancangan UI/UX",
    isMainChapter: true,
  },
  {
    value: "BAB_5",
    label: "BAB 5: Implementasi dan Pengujian Sistem",
    defaultTitle: "Implementasi dan Pengujian Sistem",
    description: "Implementasi modul program/antarmuka, lingkungan komputasi, pengujian Black-box/White-box & User Acceptance Testing (UAT)",
    isMainChapter: true,
  },
  {
    value: "BAB_6",
    label: "BAB 6: Penutup / Kesimpulan & Saran",
    defaultTitle: "Kesimpulan dan Saran",
    description: "Kesimpulan capaian sistem/aplikasi dan saran perbaikan pengembangan di masa mendatang",
    isMainChapter: true,
  },
];

// ---------------------------------------------------------------------------
// 2. TEKNIK INDUSTRI (TIND) - 6 BAB
// ---------------------------------------------------------------------------
const TIND_MAIN_CHAPTERS: ChapterOption[] = [
  {
    value: "BAB_1",
    label: "BAB 1: Pendahuluan",
    defaultTitle: "Pendahuluan",
    description: "Latar belakang permasalahan industri, perumusan masalah, batasan penelitian, dan tujuan riset",
    isMainChapter: true,
  },
  {
    value: "BAB_2",
    label: "BAB 2: Landasan Teori",
    defaultTitle: "Landasan Teori",
    description: "Kajian literatur teknik industri, metode optimasi, ergonomi, dan sistem manufaktur/layanan",
    isMainChapter: true,
  },
  {
    value: "BAB_3",
    label: "BAB 3: Metodologi Penelitian",
    defaultTitle: "Metodologi Penelitian",
    description: "Alur kerangka pemikiran, objek penelitian lapangan, dan teknik pengumpulan data",
    isMainChapter: true,
  },
  {
    value: "BAB_4",
    label: "BAB 4: Pengumpulan dan Pengolahan Data",
    defaultTitle: "Pengumpulan dan Pengolahan Data",
    description: "Data mentah observasi/pengukuran, uji kecukupan dan keseragaman data, serta pengolahan matematis",
    isMainChapter: true,
  },
  {
    value: "BAB_5",
    label: "BAB 5: Analisis dan Pembahasan",
    defaultTitle: "Analisis dan Pembahasan",
    description: "Analisis perbaikan proses industri, evaluasi kelayakan teknis & ekonomis hasil rancangan",
    isMainChapter: true,
  },
  {
    value: "BAB_6",
    label: "BAB 6: Penutup / Kesimpulan & Saran",
    defaultTitle: "Kesimpulan dan Saran",
    description: "Kesimpulan hasil penelitian serta rekomendasi implementasi di industri/perusahaan",
    isMainChapter: true,
  },
];

// ---------------------------------------------------------------------------
// 3. ILMU KESEHATAN (FIKES - Keperawatan, Gizi, Ners) - 6 BAB
// ---------------------------------------------------------------------------
const KESEHATAN_MAIN_CHAPTERS: ChapterOption[] = [
  {
    value: "BAB_1",
    label: "BAB 1: Pendahuluan",
    defaultTitle: "Pendahuluan",
    description: "Latar belakang masalah klinis/kesehatan, rumusan masalah, tujuan penelitian, dan manfaat kesehatan",
    isMainChapter: true,
  },
  {
    value: "BAB_2",
    label: "BAB 2: Tinjauan Pustaka",
    defaultTitle: "Tinjauan Pustaka",
    description: "Konsep dasar penyakit/kondisi klinis, teori asuhan keperawatan / nutrisi, dan kerangka teori",
    isMainChapter: true,
  },
  {
    value: "BAB_3",
    label: "BAB 3: Kerangka Konsep & Metode Penelitian",
    defaultTitle: "Kerangka Konsep dan Metode Penelitian",
    description: "Kerangka konsep penelitian, hipotesis penelitian, desain riset, populasi, sampel, dan etika penelitian",
    isMainChapter: true,
  },
  {
    value: "BAB_4",
    label: "BAB 4: Hasil Penelitian",
    defaultTitle: "Hasil Penelitian",
    description: "Data univariat dan bivariat, hasil analisis statistik, dan karakteristik responden",
    isMainChapter: true,
  },
  {
    value: "BAB_5",
    label: "BAB 5: Pembahasan Hasil Penelitian",
    defaultTitle: "Pembahasan Hasil Penelitian",
    description: "Komparasi hasil penelitian dengan teori dan riset terdahulu, opini peneliti, dan keterbatasan penelitian",
    isMainChapter: true,
  },
  {
    value: "BAB_6",
    label: "BAB 6: Penutup / Kesimpulan & Saran",
    defaultTitle: "Kesimpulan dan Saran",
    description: "Kesimpulan hasil analisis klinis dan saran untuk pelayanan praktis kesehatan serta peneliti selanjutnya",
    isMainChapter: true,
  },
];

// ---------------------------------------------------------------------------
// 4. STANDAR UMUM (FEB, FISIP, FKIP, FH, FAI, dll.) - 5 BAB
// ---------------------------------------------------------------------------
const STANDARD_MAIN_CHAPTERS: ChapterOption[] = [
  {
    value: "BAB_1",
    label: "BAB 1: Pendahuluan",
    defaultTitle: "Pendahuluan",
    description: "Latar belakang masalah, identifikasi/rumusan masalah, tujuan penelitian, dan manfaat penelitian",
    isMainChapter: true,
  },
  {
    value: "BAB_2",
    label: "BAB 2: Tinjauan Pustaka / Landasan Teori",
    defaultTitle: "Tinjauan Pustaka & Landasan Teori",
    description: "Kajian pustaka, teori yang mendasari, kerangka pemikiran, dan hipotesis penelitian",
    isMainChapter: true,
  },
  {
    value: "BAB_3",
    label: "BAB 3: Metodologi Penelitian",
    defaultTitle: "Metodologi Penelitian",
    description: "Jenis penelitian, tempat dan waktu riset, teknik sampling, instrumen, dan teknik analisis data",
    isMainChapter: true,
  },
  {
    value: "BAB_4",
    label: "BAB 4: Hasil dan Pembahasan",
    defaultTitle: "Hasil Penelitian dan Pembahasan",
    description: "Deskripsi data hasil penelitian, uji hipotesis, dan interpretasi/pembahasan mendalam",
    isMainChapter: true,
  },
  {
    value: "BAB_5",
    label: "BAB 5: Penutup / Kesimpulan & Saran",
    defaultTitle: "Kesimpulan dan Saran",
    description: "Kesimpulan ringkas atas rumusan masalah dan rekomendasi/saran praktis serta teoritis",
    isMainChapter: true,
  },
];

// ---------------------------------------------------------------------------
// Kamus Konfigurasi Bab per Tipe Jurusan
// ---------------------------------------------------------------------------
export const CHAPTER_CONFIGS: Record<MajorChapterType, ProgramChapterConfig> = {
  TI: {
    type: "TI",
    categoryLabel: "Teknik Informatika",
    badgeLabel: "Format 6 BAB (Informatika)",
    totalChapters: 6,
    description:
      "Struktur skripsi Teknik Informatika terdiri dari 6 BAB utama (Pendahuluan, Landasan Teori, Analisis Sistem, Perancangan Sistem, Implementasi & Pengujian, Kesimpulan) sesuai pedoman akademik Fakultas Teknik.",
    chapters: [...COMMON_PARTS_START, ...TI_MAIN_CHAPTERS, ...COMMON_PARTS_END],
  },
  TIND: {
    type: "TIND",
    categoryLabel: "Teknik Industri",
    badgeLabel: "Format 6 BAB (Teknik Industri)",
    totalChapters: 6,
    description:
      "Struktur skripsi Teknik Industri terdiri dari 6 BAB utama (Pendahuluan, Landasan Teori, Metodologi, Pengumpulan & Pengolahan Data, Analisis & Pembahasan, Kesimpulan).",
    chapters: [...COMMON_PARTS_START, ...TIND_MAIN_CHAPTERS, ...COMMON_PARTS_END],
  },
  KESEHATAN: {
    type: "KESEHATAN",
    categoryLabel: "Ilmu Kesehatan / Keperawatan",
    badgeLabel: "Format 6 BAB (Kesehatan)",
    totalChapters: 6,
    description:
      "Struktur skripsi Fakultas Ilmu Kesehatan terdiri dari 6 BAB utama (Hasil Penelitian dan Pembahasan disajikan dalam bab terpisah).",
    chapters: [...COMMON_PARTS_START, ...KESEHATAN_MAIN_CHAPTERS, ...COMMON_PARTS_END],
  },
  STANDARD: {
    type: "STANDARD",
    categoryLabel: "Standar Umum",
    badgeLabel: "Format 5 BAB Standar",
    totalChapters: 5,
    description:
      "Struktur skripsi standar perguruan tinggi terdiri dari 5 BAB utama (Pendahuluan, Tinjauan Pustaka, Metodologi Penelitian, Hasil & Pembahasan, Kesimpulan & Saran).",
    chapters: [...COMMON_PARTS_START, ...STANDARD_MAIN_CHAPTERS, ...COMMON_PARTS_END],
  },
};

/**
 * Deteksi tipe struktur bab berdasarkan data Program Studi (nama, kode, atau fakultas).
 */
export function detectMajorChapterType(program?: {
  name?: string;
  code?: string | null;
  faculty?: { name?: string; code?: string | null } | null;
} | null): MajorChapterType {
  if (!program) return "STANDARD";

  const name = (program.name || "").toLowerCase().trim();
  const code = (program.code || "").toUpperCase().trim();
  const facultyName = (program.faculty?.name || "").toLowerCase().trim();
  const facultyCode = (program.faculty?.code || "").toUpperCase().trim();

  // 1. TEKNIK INFORMATIKA (TI)
  // Cocok dengan: "TI-S1", "TI-D3", "TIF", "INF", "IF", atau nama mengandung "informatika", "komputer", "sistem informasi", "perangkat lunak"
  const isTiCode = /^TI(-|$)/i.test(code) || code === "TIF" || code === "INF" || code === "IF";
  const isTiName = /\b(informatika|komputer|perangkat lunak|rekayasa perangkat lunak|sistem informasi|teknologi informasi)\b/i.test(
    name
  );

  if (isTiCode || isTiName) {
    return "TI";
  }

  // 2. TEKNIK INDUSTRI (TIND)
  const isTindCode = /^TIND/i.test(code);
  const isTindName =
    /\bteknik industri\b/i.test(name) || (name.includes("industri") && !name.includes("peternakan"));
  if (isTindCode || isTindName) {
    return "TIND";
  }

  // 3. ILMU KESEHATAN (FIKES)
  const isHealthCode = /^KEP|^GIZI|^NERS|^IKOR/i.test(code) || facultyCode === "FIKES";
  const isHealthName =
    /\b(keperawatan|ners|gizi|kesehatan)\b/i.test(name) || facultyName.includes("kesehatan");
  if (isHealthCode || isHealthName) {
    return "KESEHATAN";
  }

  return "STANDARD";
}

export interface CustomProgramChapterSetting {
  studyProgramId: number;
  programName?: string;
  programCode?: string;
  totalChapters: number;
  categoryLabel?: string;
  badgeLabel?: string;
  description?: string;
  chapters: ChapterOption[];
  updatedAt?: string;
}

export type ProgramChapterSettingsMap = Record<string | number, CustomProgramChapterSetting>;

/**
 * Generator struktur bab custom berdasarkan jumlah bab yang dipilih admin.
 */
export function createCustomChapters(
  totalChapters: number,
  basePreset: MajorChapterType = "STANDARD"
): ChapterOption[] {
  const count = Math.max(1, Math.min(12, totalChapters));
  const presetConfig = CHAPTER_CONFIGS[basePreset] || CHAPTER_CONFIGS.STANDARD;
  const presetMainChapters = presetConfig.chapters.filter((c) => c.isMainChapter);

  const mainChapters: ChapterOption[] = [];
  for (let i = 1; i <= count; i++) {
    const babVal = `BAB_${i}`;
    const existing = presetMainChapters.find((c) => c.value === babVal);

    if (existing) {
      mainChapters.push({ ...existing });
    } else {
      mainChapters.push({
        value: babVal,
        label: `BAB ${i}: Bab Tambahan ${i}`,
        defaultTitle: `Bab ${i}`,
        description: `Bagian naskah Bab ${i}`,
        isMainChapter: true,
      });
    }
  }

  return [...COMMON_PARTS_START, ...mainChapters, ...COMMON_PARTS_END];
}

/**
 * Mengambil konfigurasi bab lengkap untuk program studi tertentu.
 * Jika terdapat custom settings dari database/admin, konfigurasi kustom tersebut yang diprioritaskan.
 */
export function getProgramChapterConfig(
  program?: {
    id?: number;
    name?: string;
    code?: string | null;
    faculty?: { name?: string; code?: string | null } | null;
  } | null,
  customSettingsMap?: ProgramChapterSettingsMap | null
): ProgramChapterConfig {
  if (program?.id && customSettingsMap) {
    const custom = customSettingsMap[program.id] || customSettingsMap[String(program.id)];
    if (custom && custom.chapters && custom.chapters.length > 0) {
      const mainCount = custom.chapters.filter((c) => c.isMainChapter).length;
      return {
        type: (detectMajorChapterType(program) || "STANDARD") as MajorChapterType,
        categoryLabel: custom.categoryLabel || program.name || "Program Studi",
        badgeLabel: custom.badgeLabel || `Format ${custom.totalChapters || mainCount || 5} BAB (Kustom Admin)`,
        totalChapters: custom.totalChapters || mainCount || 5,
        description:
          custom.description ||
          `Struktur bab dikonfigurasi secara kustom oleh pustakawan/admin untuk ${program.name}.`,
        chapters: custom.chapters,
      };
    }
  }

  const type = detectMajorChapterType(program);
  return CHAPTER_CONFIGS[type];
}

/**
 * Mengambil daftar opsi bab (array) yang disesuaikan dengan program studi dan pengaturan kustom.
 */
export function getChapterOptionsForProgram(
  program?: {
    id?: number;
    name?: string;
    code?: string | null;
    faculty?: { name?: string; code?: string | null } | null;
  } | null,
  customSettingsMap?: ProgramChapterSettingsMap | null
): ChapterOption[] {
  return getProgramChapterConfig(program, customSettingsMap).chapters;
}

/**
 * Helper untuk menampilkan badge ringkas pada tabel/daftar proposal.
 * Contoh:
 * - "BAB_1" -> "BAB 1"
 * - "BAB_6" -> "BAB 6"
 * - "FRONT_MATTER" -> "Bagian Awal"
 * - "BACK_MATTER" -> "Bagian Akhir"
 * - "FULL_TEXT" -> "Full Text"
 * - "OTHER" -> "Bab Khusus"
 */
export function getChapterBadge(chapter?: string | null): string {
  if (!chapter || chapter === "FULL_TEXT") return "Full Text";
  if (chapter === "FRONT_MATTER") return "Bagian Awal";
  if (chapter === "BACK_MATTER") return "Bagian Akhir";
  if (chapter.startsWith("BAB_")) {
    const num = chapter.split("_")[1];
    return `BAB ${num}`;
  }
  if (chapter === "OTHER") return "Bab Khusus";
  return chapter;
}

/**
 * Menemukan detail opsi bab berdasarkan value dan konteks program studi.
 */
export function getChapterInfo(
  chapterValue?: string | null,
  program?: { name?: string; code?: string | null } | null
): ChapterOption | null {
  if (!chapterValue) return null;
  const options = getChapterOptionsForProgram(program);
  return options.find((c) => c.value === chapterValue) || null;
}

// ---------------------------------------------------------------------------
// Backward-Compatibility Export:
// Ekspor default CHAPTER_OPTIONS yang mencakup opsi standar dan BAB 6
// agar kode lama yang mengimpor CHAPTER_OPTIONS tetap berfungsi normal.
// ---------------------------------------------------------------------------
export const DEFAULT_CHAPTER_OPTIONS: ChapterOption[] = CHAPTER_CONFIGS.TI.chapters;
export const CHAPTER_OPTIONS: ChapterOption[] = DEFAULT_CHAPTER_OPTIONS;
