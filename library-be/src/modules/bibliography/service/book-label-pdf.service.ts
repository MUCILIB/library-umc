import type { Response } from "express";
import PDFDocument from "pdfkit";
import { drawCode128OnPdf } from "../../../utils/code128";

export const ALLOWED_LABELS_PER_PAGE = [4, 6, 8, 10, 12] as const;
export type LabelsPerPage = (typeof ALLOWED_LABELS_PER_PAGE)[number];

export interface LabelGridLayout {
  cols: number;
  rows: number;
  perPage: LabelsPerPage;
}

export interface BookLabelItemInput {
  id: string;
  itemCode: string;
  inventoryCode?: string | null;
  callNumber?: string | null;
}

export interface BookLabelBibliographyInput {
  id: string;
  title: string;
  classification?: string | null;
  callNumber?: string | null;
  unlistedAuthorsLabel?: string | null;
  authors?: Array<{ name: string; role?: string }>;
  items: BookLabelItemInput[];
}

export const LABEL_CARD_WIDTH_PT = 262;
export const LABEL_CARD_HEIGHT_PT = 124;

export function getLabelGridLayout(perPage?: number): LabelGridLayout {
  switch (perPage) {
    case 4:
      return { cols: 2, rows: 2, perPage: 4 };
    case 8:
      return { cols: 2, rows: 4, perPage: 8 };
    case 10:
      return { cols: 2, rows: 5, perPage: 10 };
    case 12:
      return { cols: 2, rows: 6, perPage: 12 };
    case 6:
    default:
      return { cols: 2, rows: 3, perPage: 6 };
  }
}

export function formatAuthorsText(
  authors?: Array<{ name: string }>,
  unlistedAuthorsLabel?: string | null
): string {
  const names = (authors || []).map((a) => a.name.trim()).filter(Boolean);
  if (names.length === 0) {
    return unlistedAuthorsLabel?.trim() || "-";
  }
  const base = names.join(", ");
  return unlistedAuthorsLabel?.trim() ? `${base}, ${unlistedAuthorsLabel.trim()}` : base;
}

export function formatClassificationText(
  bibClassification?: string | null,
  bibCallNumber?: string | null,
  itemCallNumber?: string | null
): string {
  const classNo = (bibClassification || "").trim();
  const callNo = (itemCallNumber || bibCallNumber || "").trim();
  if (classNo && callNo) {
    const normalizedClass = classNo.toLowerCase();
    const normalizedCall = callNo.toLowerCase();
    if (normalizedCall === normalizedClass || normalizedCall.startsWith(`${normalizedClass} `)) {
      return callNo;
    }
    return `${classNo} / ${callNo}`;
  }
  return callNo || classNo || "-";
}

/**
 * Splits classification / call number into stacked lines for the right-side book spine panel
 * (e.g. "348.1 JOH b" -> ["348.1", "JOH", "b"]).
 */
export function getSpineClassificationLines(
  bibClassification?: string | null,
  bibCallNumber?: string | null,
  itemCallNumber?: string | null
): string[] {
  const classNo = (bibClassification || "").trim();
  const callNo = (itemCallNumber || bibCallNumber || "").trim();

  if (callNo) {
    const tokens = callNo.split(/\s+/).filter(Boolean);
    if (
      classNo &&
      !callNo.toLowerCase().startsWith(classNo.toLowerCase())
    ) {
      return [classNo, ...tokens];
    }
    return tokens.length > 0 ? tokens : [callNo];
  }

  if (classNo) {
    return classNo.split(/\s+/).filter(Boolean);
  }

  return ["-"];
}

function slugifyFilename(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * Generates an A4 portrait PDF sheet containing combined horizontal (flex) book labels:
 * - Left section: Header, Judul Buku, Penulis, and Code 128 Barcode + Kode Item
 * - Right section (book spine): No. Klasifikasi / Call Number prominently stacked & centered
 */
export function streamBookLabelsPdf(
  res: Response,
  bib: BookLabelBibliographyInput,
  itemsToPrint: BookLabelItemInput[],
  perPage = 6
): void {
  const layout = getLabelGridLayout(perPage);
  const slug = slugifyFilename(bib.title) || "koleksi";
  const filename = `label-buku_${slug}_${layout.perPage}-per-lembar.pdf`;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");

  const sortedItems = [...itemsToPrint].sort((a, b) =>
    (a.itemCode || "").localeCompare(b.itemCode || "", undefined, {
      numeric: true,
      sensitivity: "base",
    })
  );

  const doc = new PDFDocument({ margin: 24, size: "A4", layout: "portrait" });
  doc.pipe(res);

  const pageW = doc.page.width;
  const marginY = 24;
  const gapX = 12;
  const gapY = 8;

  // Fixed sticker dimensions across all layouts (2x2, 2x3, 2x4, 2x5, 2x6)
  const cardW = LABEL_CARD_WIDTH_PT;
  const cardH = LABEL_CARD_HEIGHT_PT;
  const gridTotalW = layout.cols * cardW + (layout.cols - 1) * gapX;
  const startX = Math.max(16, (pageW - gridTotalW) / 2);

  const authorsText = formatAuthorsText(bib.authors, bib.unlistedAuthorsLabel);
  const titleText = (bib.title || "-").replace(/\s+/g, " ").trim();

  sortedItems.forEach((item, index) => {
    if (index > 0 && index % layout.perPage === 0) {
      doc.addPage();
    }

    const slotIndex = index % layout.perPage;
    const col = slotIndex % layout.cols;
    const row = Math.floor(slotIndex / layout.cols);

    const cardX = startX + col * (cardW + gapX);
    const cardY = marginY + row * (cardH + gapY);

    // Outer cut border
    doc.save();
    doc
      .roundedRect(cardX, cardY, cardW, cardH, 4)
      .fillColor("#FFFFFF")
      .fill();
    doc
      .roundedRect(cardX, cardY, cardW, cardH, 4)
      .lineWidth(0.75)
      .dash(3, { space: 2 })
      .strokeColor("#94A3B8")
      .stroke();
    doc.restore();

    // Flex split: Left panel (cover/barcode) ~65%, Right panel (spine/classification) ~35%
    const rightPanelW = Math.round(cardW * 0.35);
    const leftPanelW = cardW - rightPanelW;
    const splitX = cardX + leftPanelW;

    // Header strip across full card width
    const headerH = 17;
    doc.save();
    doc.roundedRect(cardX, cardY, cardW, headerH, 4).fillColor("#0F172A").fill();
    doc.rect(cardX, cardY + headerH - 4, cardW, 4).fillColor("#0F172A").fill();
    // Right header accent (spine header)
    doc.rect(splitX, cardY, rightPanelW - 4, headerH).fillColor("#1E293B").fill();
    doc.roundedRect(splitX, cardY, rightPanelW, headerH, 4).fillColor("#1E293B").fill();
    doc.rect(splitX, cardY, 4, headerH).fillColor("#1E293B").fill();
    doc.rect(splitX, cardY + headerH - 4, rightPanelW, 4).fillColor("#1E293B").fill();

    // Left header text
    doc
      .fillColor("#FFFFFF")
      .font("Helvetica-Bold")
      .fontSize(7)
      .text("UPT PERPUSTAKAAN UMC", cardX + 7, cardY + 5, {
        width: leftPanelW - 44,
        lineBreak: false,
      });
    doc
      .fillColor("#CBD5E1")
      .font("Helvetica")
      .fontSize(6.2)
      .text(`${index + 1}/${sortedItems.length}`, cardX + 7, cardY + 5.2, {
        width: leftPanelW - 14,
        align: "right",
        lineBreak: false,
      });

    // Right header text (spine label)
    doc
      .fillColor("#F8FAFC")
      .font("Helvetica-Bold")
      .fontSize(6.5)
      .text("KLASIFIKASI", splitX + 4, cardY + 5.2, {
        width: rightPanelW - 8,
        align: "center",
        lineBreak: false,
      });
    doc.restore();

    // Right panel subtle background & vertical fold divider line
    doc.save();
    doc
      .rect(splitX, cardY + headerH, rightPanelW - 0.5, cardH - headerH - 0.5)
      .fillColor("#F8FAFC")
      .fill();
    doc
      .moveTo(splitX, cardY + headerH)
      .lineTo(splitX, cardY + cardH)
      .lineWidth(0.75)
      .dash(2.5, { space: 2 })
      .strokeColor("#94A3B8")
      .stroke();
    doc.restore();

    // --- LEFT PANEL: Judul Buku, Nama Penulis, & Barcode ---
    const padX = 8;
    const leftInnerW = leftPanelW - padX * 2;
    const leftBodyTop = cardY + headerH + 6;

    const barcodeH = 29;
    const codeTextH = 11;
    const barcodeBlockH = barcodeH + codeTextH + 10;
    const dividerY = cardY + cardH - barcodeBlockH;

    const middleBottom = dividerY - 4;
    const availableMiddleH = Math.max(24, middleBottom - leftBodyTop);

    const authorFontSize = 7.3;
    doc.font("Helvetica").fontSize(authorFontSize);
    const authorLineH = doc.currentLineHeight(true);
    const maxAuthorH = Math.min(authorLineH * 1.8, availableMiddleH * 0.38);

    const titleFontSize = 8.6;
    doc.font("Helvetica-Bold").fontSize(titleFontSize);
    const titleLineH = doc.currentLineHeight(true);
    const maxTitleH = Math.max(titleLineH * 1.1, availableMiddleH - maxAuthorH - 3);
    const actualTitleH = Math.min(
      maxTitleH,
      doc.heightOfString(titleText, { width: leftInnerW })
    );

    doc
      .fillColor("#0F172A")
      .font("Helvetica-Bold")
      .fontSize(titleFontSize)
      .text(titleText, cardX + padX, leftBodyTop, {
        width: leftInnerW,
        height: maxTitleH,
        ellipsis: true,
      });

    const authorY = leftBodyTop + actualTitleH + 3;
    const remainingAuthorH = Math.max(authorLineH, middleBottom - authorY);
    doc
      .fillColor("#475569")
      .font("Helvetica")
      .fontSize(authorFontSize)
      .text(`Penulis: ${authorsText}`, cardX + padX, authorY, {
        width: leftInnerW,
        height: remainingAuthorH,
        ellipsis: true,
      });

    // Horizontal divider above barcode
    doc.save();
    doc
      .moveTo(cardX + padX, dividerY)
      .lineTo(splitX - padX, dividerY)
      .lineWidth(0.5)
      .strokeColor("#E2E8F0")
      .stroke();
    doc.restore();

    // Code 128 Barcode + Kode Item
    const barcodeY = dividerY + 4.5;
    drawCode128OnPdf(doc, item.itemCode, cardX + padX, barcodeY, leftInnerW, barcodeH);

    doc
      .fillColor("#0F172A")
      .font("Courier-Bold")
      .fontSize(7.8)
      .text(item.itemCode, cardX + padX, barcodeY + barcodeH + 2, {
        width: leftInnerW,
        align: "center",
        lineBreak: false,
      });

    // --- RIGHT PANEL (SPINE): No. Klasifikasi ---
    const spinePadX = 6;
    const spineInnerW = rightPanelW - spinePadX * 2;
    const spineLines = getSpineClassificationLines(
      bib.classification,
      bib.callNumber,
      item.callNumber
    );
    const spineFontSize = 11.5;
    const spineLineGap = 2.5;

    doc.font("Helvetica-Bold").fontSize(spineFontSize);
    const measuredLines = spineLines.map((line) => ({
      text: line,
      height: doc.heightOfString(line, { width: spineInnerW }),
    }));
    const totalSpineH =
      measuredLines.reduce((sum, l) => sum + l.height, 0) +
      Math.max(0, measuredLines.length - 1) * spineLineGap;

    const spineBodyTop = cardY + headerH + 4;
    const spineBodyH = cardH - headerH - 8;
    let spineY = spineBodyTop + Math.max(0, (spineBodyH - totalSpineH) / 2);

    doc.fillColor("#0F172A").font("Helvetica-Bold").fontSize(spineFontSize);
    measuredLines.forEach((line) => {
      if (spineY + line.height <= cardY + cardH - 4) {
        doc.text(line.text, splitX + spinePadX, spineY, {
          width: spineInnerW,
          align: "center",
        });
      }
      spineY += line.height + spineLineGap;
    });
  });

  doc.end();
}
