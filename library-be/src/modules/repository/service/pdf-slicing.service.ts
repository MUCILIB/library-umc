import { PDFDocument } from "pdf-lib";
import { BadRequestError } from "../../../exceptions/AppError";

export class PdfSlicingService {
  /**
   * Mendapatkan total jumlah halaman dari dokumen PDF buffer
   */
  async getPageCount(inputBuffer: Buffer): Promise<number> {
    const doc = await PDFDocument.load(inputBuffer, { ignoreEncryption: true });
    return doc.getPageCount();
  }

  /**
   * Memotong dokumen PDF sesuai rentang halaman yang diizinkan (1-indexed).
   * Menghasilkan buffer PDF baru yang hanya memuat halaman tersebut.
   */
  async slicePdf(
    inputBuffer: Buffer,
    startPage: number,
    endPage: number
  ): Promise<Buffer> {
    if (startPage < 1) {
      throw new BadRequestError("Halaman awal (startPage) minimal 1");
    }
    if (startPage > endPage) {
      throw new BadRequestError("Halaman awal (startPage) tidak boleh lebih besar dari halaman akhir (endPage)");
    }

    const sourceDoc = await PDFDocument.load(inputBuffer, { ignoreEncryption: true });
    const totalPages = sourceDoc.getPageCount();

    if (totalPages === 0) {
      throw new BadRequestError("Dokumen PDF tidak memiliki halaman");
    }

    // Guard out-of-bounds: jika endPage melampaui total dokumen, batasi ke totalPages
    const effectiveEndPage = Math.min(endPage, totalPages);
    if (startPage > totalPages) {
      throw new BadRequestError("Halaman yang diminta melebihi total halaman dokumen");
    }

    // Buat dokumen PDF target baru
    const newDoc = await PDFDocument.create();

    // pdf-lib menggunakan 0-based index
    const pageIndices: number[] = [];
    for (let p = startPage; p <= effectiveEndPage; p++) {
      pageIndices.push(p - 1);
    }

    const copiedPages = await newDoc.copyPages(sourceDoc, pageIndices);
    copiedPages.forEach((page) => newDoc.addPage(page));

    const slicedPdfBytes = await newDoc.save();
    return Buffer.from(slicedPdfBytes);
  }
}

export const pdfSlicingService = new PdfSlicingService();
