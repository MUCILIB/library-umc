import type { PdfDoc } from "./pdf-table";

/**
 * Standard ISO/IEC 15417 Code 128 bar/space width patterns (indices 0..106).
 * Each entry lists alternating bar, space, bar, space, bar, space widths (Stop has 7 elements).
 */
export const CODE128_PATTERNS: readonly string[] = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112",
];

const START_CODE_B = 104;
const STOP_CODE = 106;

export interface Code128Bar {
  xModule: number;
  widthModules: number;
}

export interface Code128Encoded {
  value: string;
  totalModules: number;
  quietModules: number;
  bars: Code128Bar[];
}

/**
 * Sanitizes text to printable ASCII characters supported by Code 128B (32..126).
 */
export function sanitizeCode128Value(raw: string): string {
  const cleaned = String(raw || "")
    .replace(/[^\x20-\x7E]/g, "-")
    .trim();
  return cleaned.length > 0 ? cleaned : "-";
}

/**
 * Encodes a string into Code 128B bar positions (in module units, including quiet zones).
 */
export function encodeCode128B(rawValue: string, quietModules = 10): Code128Encoded {
  const value = sanitizeCode128Value(rawValue);
  const symbolIndices: number[] = [START_CODE_B];
  let checksum = START_CODE_B;

  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i) - 32;
    const safeCode = code >= 0 && code <= 94 ? code : 13; // fallback '-'
    symbolIndices.push(safeCode);
    checksum += (i + 1) * safeCode;
  }

  symbolIndices.push(checksum % 103);
  symbolIndices.push(STOP_CODE);

  const bars: Code128Bar[] = [];
  let cursor = quietModules;

  for (const symIdx of symbolIndices) {
    const pattern = CODE128_PATTERNS[symIdx];
    for (let j = 0; j < pattern.length; j++) {
      const width = Number(pattern[j]);
      if (j % 2 === 0) {
        bars.push({ xModule: cursor, widthModules: width });
      }
      cursor += width;
    }
  }

  return {
    value,
    totalModules: cursor + quietModules,
    quietModules,
    bars,
  };
}

/**
 * Draws a crisp vector Code 128B barcode centered inside `(x, y, maxWidth, height)`.
 */
export function drawCode128OnPdf(
  doc: PdfDoc,
  rawValue: string,
  x: number,
  y: number,
  maxWidth: number,
  height: number,
  color = "#000000"
): Code128Encoded {
  const encoded = encodeCode128B(rawValue, 8);
  const moduleWidth = Math.min(1.6, maxWidth / encoded.totalModules);
  const renderedWidth = encoded.totalModules * moduleWidth;
  const startX = x + Math.max(0, (maxWidth - renderedWidth) / 2);

  doc.save();
  doc.fillColor(color);
  for (const bar of encoded.bars) {
    doc
      .rect(
        startX + bar.xModule * moduleWidth,
        y,
        bar.widthModules * moduleWidth,
        height
      )
      .fill();
  }
  doc.restore();

  return encoded;
}
