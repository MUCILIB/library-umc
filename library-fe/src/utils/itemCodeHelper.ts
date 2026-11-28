/**
 * Utilitas untuk menganalisis dan menjaga konsistensi kode eksemplar buku di Perpustakaan UMC.
 * 
 * Aturan Utama:
 * 1. Setiap judul buku/katalog hanya memiliki SATU struktur aturan kode induk/awalan (base prefix),
 *    misal: S-24-2342 atau R-26-10001 (tahun menggunakan 2 digit terakhir).
 * 2. Seluruh eksemplar dari buku tersebut harus seragam:
 *    [BasePrefix]-c1, [BasePrefix]-c2, [BasePrefix]-c3, ...
 * 3. Ketika buku sudah memiliki struktur kode eksemplar, penambahan eksemplar berikutnya
 *    WAJIB melanjutkan urutan tag c{n} dari nomor tertinggi yang sudah ada, dan awalannya
 *    dikunci agar tidak berubah-ubah.
 * 4. Kode lama yang tidak seragam (misal diawali ITEM- atau format berbeda) dideteksi
 *    sebagai inkonsisten sehingga dapat diseragamkan dengan 1 klik.
 */

export function formatItemCodeYear(year: number | string = new Date().getFullYear()): string {
  const raw = String(year ?? "").trim();
  if (/^\d{2}$/.test(raw)) return raw;
  if (/^\d{4,}$/.test(raw)) return raw.slice(-2);
  const parsed = Number(raw);
  const resolved = Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : new Date().getFullYear();
  return String(resolved).padStart(2, "0").slice(-2);
}

/**
 * Membatasi input awalan kode item agar bagian nomor urut (segmen ke-3) maksimal 4 digit angka
 * (contoh: S-26-23232323 -> S-26-2323).
 */
export function sanitizeItemCodePrefixInput(raw: string): string {
  const cleaned = String(raw || "").replace(/\s+/g, "").toUpperCase();
  if (!cleaned) return "";

  const parts = cleaned.split("-");
  if (parts.length === 1) {
    return parts[0].replace(/[^A-Z0-9]/g, "").slice(0, 6);
  }
  if (parts.length === 2) {
    const p0 = parts[0].replace(/[^A-Z0-9]/g, "").slice(0, 6);
    const p1 = parts[1].replace(/[^A-Z0-9]/g, "").slice(0, 4);
    return `${p0}-${p1}`;
  }

  const p0 = parts[0].replace(/[^A-Z0-9]/g, "").slice(0, 6);
  const p1 = parts[1].replace(/[^0-9]/g, "").slice(0, 4);
  const p2 = parts[2].replace(/[^0-9]/g, "").slice(0, 4);
  return `${p0}-${p1}-${p2}`;
}

export function validateItemCodePrefix(prefix: string): string | null {
  const trimmed = prefix.trim();
  if (!trimmed) return null;
  const parts = trimmed.split("-");
  if (parts.length >= 3) {
    if (!/^\d{1,4}$/.test(parts[2])) {
      return "Nomor urut pada awalan kode maksimal 4 digit angka (contoh: S-26-1001).";
    }
  }
  return null;
}

export interface CodeStructureAnalysis {
  basePrefix: string;
  nextSeq: number;
  isLocked: boolean;
  hasInconsistentCodes: boolean;
  inconsistentCount: number;
  totalItems: number;
}

export function analyzeItemCodeStructure(
  existingItems: Array<{ itemCode?: string }> = [],
  fallbackPrefix: "S" | "R" = "S",
  fallbackYear: number | string = new Date().getFullYear(),
  fallbackSeq: string = "1001"
): CodeStructureAnalysis {
  const shortYear = formatItemCodeYear(fallbackYear);
  const defaultFallback = `${fallbackPrefix}-${shortYear}-${fallbackSeq}`;

  if (!existingItems || existingItems.length === 0) {
    return {
      basePrefix: defaultFallback,
      nextSeq: 1,
      isLocked: false,
      hasInconsistentCodes: false,
      inconsistentCount: 0,
      totalItems: 0,
    };
  }

  // 1. Kumpulkan semua awalan standar [SR]-YY-XXXX (serta format lama [SR]-YYYY-XXXX) dan catat nomor urut eksemplar tertinggi
  const prefixCounts = new Map<string, number>();
  let maxSeq = 0;
  let latestStandardPrefix = "";

  for (const it of existingItems) {
    const code = (it.itemCode || "").trim();
    if (!code) continue;

    // Pola format resmi UMC: [SR]-YY-XXXX-c{n} (mendukung juga tahun 4 digit lama)
    const matchC = code.match(/^([SR]-(?:\d{2}|\d{4})-[A-Z0-9]+)-c(\d+)$/i);
    if (matchC) {
      const p = matchC[1].toUpperCase();
      const s = parseInt(matchC[2], 10);
      if (!isNaN(s) && s > maxSeq) maxSeq = s;
      prefixCounts.set(p, (prefixCounts.get(p) || 0) + 1);
      latestStandardPrefix = p;
      continue;
    }

    // Pola alternatif: [SR]-YY-XXXX-{n}
    const matchNum = code.match(/^([SR]-(?:\d{2}|\d{4})-[A-Z0-9]+)-(\d+)$/i);
    if (matchNum) {
      const p = matchNum[1].toUpperCase();
      const s = parseInt(matchNum[2], 10);
      if (!isNaN(s) && s > maxSeq) maxSeq = s;
      prefixCounts.set(p, (prefixCounts.get(p) || 0) + 1);
      latestStandardPrefix = p;
      continue;
    }

    // Pola awalan saja: [SR]-YY-XXXX
    const matchBase = code.match(/^([SR]-(?:\d{2}|\d{4})-[A-Z0-9]+)/i);
    if (matchBase) {
      const p = matchBase[1].toUpperCase();
      prefixCounts.set(p, (prefixCounts.get(p) || 0) + 1);
      latestStandardPrefix = p;
    }
  }

  // 2. Tentukan awalan (basePrefix) yang berlaku untuk buku ini
  let establishedPrefix = "";
  if (prefixCounts.size > 0) {
    let maxFreq = 0;
    for (const [p, count] of prefixCounts.entries()) {
      if (count > maxFreq) {
        maxFreq = count;
        establishedPrefix = p;
      }
    }
    if (!establishedPrefix) establishedPrefix = latestStandardPrefix;
  } else {
    // Tidak ada yang berformat standar (misal semua ITEM-...)
    establishedPrefix = defaultFallback;
  }

  // 3. Hitung jumlah item yang tidak konsisten dengan [establishedPrefix]-c{n}
  let inconsistentCount = 0;
  for (const it of existingItems) {
    const code = (it.itemCode || "").trim().toUpperCase();
    if (!code) continue;

    const isMatchExact = code.startsWith(`${establishedPrefix}-C`) || code.startsWith(`${establishedPrefix}-`);
    const isLegacyItem = code.startsWith("ITEM-") || !code.startsWith(establishedPrefix);

    if (isLegacyItem || !isMatchExact) {
      inconsistentCount++;
    }
  }

  // Urutan salinan berikutnya adalah maxSeq + 1 jika terdeteksi, atau totalItems + 1
  const nextSeq = Math.max(maxSeq + 1, existingItems.length + 1);

  return {
    basePrefix: establishedPrefix,
    nextSeq,
    isLocked: prefixCounts.size > 0,
    hasInconsistentCodes: inconsistentCount > 0,
    inconsistentCount,
    totalItems: existingItems.length,
  };
}
