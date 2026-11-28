import type PDFDocument from "pdfkit";

export type PdfDoc = InstanceType<typeof PDFDocument>;

export interface PdfTableOptions {
  startX: number;
  startY: number;
  headers: string[];
  colWidths: number[];
  rows: unknown[][];
  headerBgColor: string;
  headerTextColor?: string;
  headerFontSize?: number;
  minHeaderHeight?: number;
  rowFontSize?: number;
  minRowHeight?: number;
  cellPaddingX?: number;
  cellPaddingY?: number;
  evenRowBgColor?: string;
  oddRowBgColor?: string;
  marginTop?: number;
  marginBottom?: number;
}

export function normalizePdfCell(value: unknown): string {
  if (value === null || value === undefined) {
    return "-";
  }
  const normalized = String(value).replace(/\s+/g, " ").trim();
  return normalized.length > 0 ? normalized : "-";
}

/**
 * Ensures there is enough vertical space on the current page before drawing
 * a block of `neededHeight` points; adds a new page if needed and returns
 * the starting Y coordinate for the block.
 */
export function ensurePdfSpace(
  doc: PdfDoc,
  currentY: number,
  neededHeight: number,
  marginTop?: number,
  marginBottom?: number
): number {
  const top = marginTop ?? doc.page.margins?.top ?? 36;
  const bottom = marginBottom ?? doc.page.margins?.bottom ?? 36;
  const pageBottom = doc.page.height - bottom;

  if (currentY + neededHeight > pageBottom && currentY > top) {
    doc.addPage();
    return top;
  }
  return currentY;
}

/**
 * Renders a multi-column PDF table with automatic text wrapping, dynamic row
 * heights, and automatic page breaks that repeat the table header.
 */
export function renderPdfTable(doc: PdfDoc, options: PdfTableOptions): number {
  const {
    startX,
    startY,
    headers,
    colWidths,
    rows,
    headerBgColor,
    headerTextColor = "#FFFFFF",
    headerFontSize = 8.5,
    minHeaderHeight = 18,
    rowFontSize = 7.8,
    minRowHeight = 16,
    cellPaddingX = 4,
    cellPaddingY = 4,
    evenRowBgColor = "#F1F5F9",
    oddRowBgColor = "#FFFFFF",
    marginTop = doc.page.margins?.top ?? 36,
    marginBottom = doc.page.margins?.bottom ?? 36,
  } = options;

  const totalWidth = colWidths.reduce((sum, w) => sum + w, 0);
  const pageBottom = doc.page.height - marginBottom;

  const measureHeaderHeight = (): number => {
    doc.font("Helvetica-Bold").fontSize(headerFontSize);
    let maxTextHeight = 0;
    headers.forEach((header, idx) => {
      const cellWidth = Math.max(12, colWidths[idx] - cellPaddingX * 2);
      const textHeight = doc.heightOfString(normalizePdfCell(header), {
        width: cellWidth,
      });
      if (textHeight > maxTextHeight) {
        maxTextHeight = textHeight;
      }
    });
    return Math.max(minHeaderHeight, Math.ceil(maxTextHeight) + cellPaddingY * 2);
  };

  const drawHeader = (yPos: number): number => {
    const headerHeight = measureHeaderHeight();
    doc.rect(startX, yPos, totalWidth, headerHeight).fill(headerBgColor);
    doc.fillColor(headerTextColor).font("Helvetica-Bold").fontSize(headerFontSize);

    let curX = startX;
    headers.forEach((header, idx) => {
      const cellWidth = Math.max(12, colWidths[idx] - cellPaddingX * 2);
      doc.text(normalizePdfCell(header), curX + cellPaddingX, yPos + cellPaddingY, {
        width: cellWidth,
      });
      curX += colWidths[idx];
    });

    doc.fillColor("#000000");
    return yPos + headerHeight;
  };

  const initialHeaderHeight = measureHeaderHeight();
  let y = ensurePdfSpace(doc, startY, initialHeaderHeight + minRowHeight, marginTop, marginBottom);
  y = drawHeader(y);

  rows.forEach((rawRow, rowIdx) => {
    doc.font("Helvetica").fontSize(rowFontSize);
    const cells = headers.map((_, colIdx) => normalizePdfCell(rawRow[colIdx]));

    let maxTextHeight = 0;
    cells.forEach((cellText, colIdx) => {
      const cellWidth = Math.max(12, colWidths[colIdx] - cellPaddingX * 2);
      const textHeight = doc.heightOfString(cellText, { width: cellWidth });
      if (textHeight > maxTextHeight) {
        maxTextHeight = textHeight;
      }
    });

    const rowHeight = Math.max(minRowHeight, Math.ceil(maxTextHeight) + cellPaddingY * 2);

    if (y + rowHeight > pageBottom && y > marginTop) {
      doc.addPage();
      y = drawHeader(marginTop);
      doc.font("Helvetica").fontSize(rowFontSize);
    }

    const bg = rowIdx % 2 === 0 ? evenRowBgColor : oddRowBgColor;
    doc.rect(startX, y, totalWidth, rowHeight).fill(bg);
    doc.fillColor("#000000");

    let curX = startX;
    cells.forEach((cellText, colIdx) => {
      const cellWidth = Math.max(12, colWidths[colIdx] - cellPaddingX * 2);
      doc.text(cellText, curX + cellPaddingX, y + cellPaddingY, {
        width: cellWidth,
      });
      curX += colWidths[colIdx];
    });

    y += rowHeight;
  });

  doc.x = startX;
  doc.y = y;
  return y;
}
