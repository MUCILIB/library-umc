import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  formatReceiptDate,
  formatReceiptDateTime,
  getConditionLabel,
  generateThermalReceiptHtml,
  printThermalReceipt,
  generateLoanThermalReceiptHtml,
  printLoanThermalReceipt,
  type ReturnReceiptData,
  type LoanReceiptData,
} from "../printReceipt";

describe("printReceipt Utility", () => {
  const sampleData: ReturnReceiptData = {
    receiptNo: "BA-RET-20261118-001",
    returnDate: "2026-11-18T10:30:00.000Z",
    borrowerName: "Ahmad Dahlan",
    borrowerCode: "202301001",
    borrowerType: "Mahasiswa",
    borrowerFaculty: "Teknik Informatika",
    bookTitle: "Clean Code & Architecture",
    inventoryCode: "INV-2026-0099",
    callNumber: "005.1 MAR c",
    loanDate: "2026-11-04T00:00:00.000Z",
    dueDate: "2026-11-18T00:00:00.000Z",
    condition: "good",
    fineAmount: 0,
    fineStatus: "BEBAS DENDA",
    staffName: "Siti Pustakawati",
    signature: "data:image/png;base64,mocksignaturedata",
    notes: "Koleksi diserahkan dalam keadaan prima.",
  };

  describe("formatReceiptDate", () => {
    it("returns '-' when date is not provided", () => {
      expect(formatReceiptDate(undefined)).toBe("-");
      expect(formatReceiptDate("")).toBe("-");
    });

    it("formats valid ISO date into Indonesian locale format", () => {
      const res = formatReceiptDate("2026-11-18T00:00:00.000Z");
      expect(res).toContain("2026");
      expect(res).toMatch(/Nov/i);
    });

    it("returns raw string if string cannot be parsed into a date", () => {
      expect(formatReceiptDate("invalid-date-string")).toBe("invalid-date-string");
    });
  });

  describe("formatReceiptDateTime", () => {
    it("formats given date with time and WIB suffix", () => {
      const res = formatReceiptDateTime("2026-11-18T14:30:00.000Z");
      expect(res).toContain("WIB");
      expect(res).toContain("2026");
    });

    it("returns current date with WIB when input is undefined", () => {
      const res = formatReceiptDateTime(undefined);
      expect(res).toContain("WIB");
    });

    it("returns raw string if string is invalid", () => {
      expect(formatReceiptDateTime("not-a-valid-date")).toBe("not-a-valid-date");
    });
  });

  describe("getConditionLabel", () => {
    it("returns 'Baik & Lengkap' for good condition or unknown", () => {
      expect(getConditionLabel("good")).toBe("Baik & Lengkap");
      expect(getConditionLabel(undefined)).toBe("Baik & Lengkap");
      expect(getConditionLabel("normal")).toBe("Baik & Lengkap");
    });

    it("returns 'Rusak' for damaged condition", () => {
      expect(getConditionLabel("damaged")).toBe("Rusak");
    });

    it("returns 'Hilang' for lost condition", () => {
      expect(getConditionLabel("lost")).toBe("Hilang");
    });
  });

  describe("generateThermalReceiptHtml", () => {
    it("generates 80mm thermal receipt HTML containing all key data", () => {
      const html = generateThermalReceiptHtml(sampleData);

      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("UNIVERSITAS MUHAMMADIYAH CIREBON");
      expect(html).toContain("UPT PERPUSTAKAAN");
      expect(html).toContain("RESI BUKTI PENGEMBALIAN BUKU");
      expect(html).toContain("BA-RET-20261118-001");
      expect(html).toContain("Ahmad Dahlan");
      expect(html).toContain("202301001");
      expect(html).toContain("Teknik Informatika");
      expect(html).toContain("Clean Code &amp; Architecture");
      expect(html).toContain("INV-2026-0099");
      expect(html).toContain("005.1 MAR c");
      expect(html).toContain("Baik & Lengkap");
      expect(html).toContain("BEBAS DENDA");
      expect(html).toContain("Siti Pustakawati");
      expect(html).toContain("Koleksi diserahkan dalam keadaan prima.");
      expect(html).toContain('src="data:image/png;base64,mocksignaturedata"');
    });

    it("handles fine amount correctly when fine > 0", () => {
      const dataWithFine: ReturnReceiptData = {
        ...sampleData,
        fineAmount: 5000,
        fineStatus: "LUNAS",
      };
      const html = generateThermalReceiptHtml(dataWithFine);
      expect(html).toContain("Rp 5.000");
      expect(html).toContain("LUNAS");
    });

    it("escapes unsafe HTML characters to prevent XSS", () => {
      const unsafeData: ReturnReceiptData = {
        ...sampleData,
        borrowerName: "<script>alert('xss')</script>",
        bookTitle: "Hacker's Guide & Tips <>&",
      };
      const html = generateThermalReceiptHtml(unsafeData);
      expect(html).not.toContain("<script>alert('xss')</script>");
      expect(html).toContain("&lt;script&gt;alert(&#039;xss&#039;)&lt;/script&gt;");
      expect(html).toContain("Hacker&#039;s Guide &amp; Tips &lt;&gt;&amp;");
    });

    it("displays placeholder when signature is not a base64 image", () => {
      const noSigData: ReturnReceiptData = {
        ...sampleData,
        signature: null,
      };
      const html = generateThermalReceiptHtml(noSigData);
      expect(html).toContain("[ Tanda Tangan Sah ]");
    });
  });

  describe("printThermalReceipt", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    it("creates an invisible iframe and triggers print", () => {
      const mockPrint = vi.fn();
      const mockFocus = vi.fn();
      const mockWrite = vi.fn();
      const mockOpen = vi.fn();
      const mockClose = vi.fn();

      const mockIframe = {
        style: {} as Record<string, string>,
        setAttribute: vi.fn(),
        contentWindow: {
          print: mockPrint,
          focus: mockFocus,
          document: {
            open: mockOpen,
            write: mockWrite,
            close: mockClose,
            images: [],
          },
        },
        remove: vi.fn(),
      };

      vi.spyOn(document, "createElement").mockReturnValue(mockIframe as unknown as HTMLElement);
      vi.spyOn(document.body, "appendChild").mockImplementation(() => mockIframe as unknown as Node);

      printThermalReceipt(sampleData);

      expect(document.createElement).toHaveBeenCalledWith("iframe");
      expect(mockIframe.style.visibility).toBe("hidden");
      expect(mockOpen).toHaveBeenCalled();
      expect(mockWrite).toHaveBeenCalled();
      expect(mockClose).toHaveBeenCalled();

      // Fast forward timer to trigger print
      vi.advanceTimersByTime(200);

      expect(mockFocus).toHaveBeenCalled();
      expect(mockPrint).toHaveBeenCalled();

      // Fast forward timeout to clean up iframe
      vi.advanceTimersByTime(1600);
      expect(mockIframe.remove).toHaveBeenCalled();
    });

    it("falls back to window.print if iframe print throws error", () => {
      const mockWindowPrint = vi.fn();
      vi.spyOn(window, "print").mockImplementation(mockWindowPrint);

      const mockIframe = {
        style: {} as Record<string, string>,
        setAttribute: vi.fn(),
        contentWindow: {
          focus: vi.fn(),
          print: vi.fn().mockImplementation(() => {
            throw new Error("Print denied");
          }),
          document: {
            open: vi.fn(),
            write: vi.fn(),
            close: vi.fn(),
            images: [],
          },
        },
        remove: vi.fn(),
      };

      vi.spyOn(document, "createElement").mockReturnValue(mockIframe as unknown as HTMLElement);
      vi.spyOn(document.body, "appendChild").mockImplementation(() => mockIframe as unknown as Node);

      printThermalReceipt(sampleData);
      vi.advanceTimersByTime(200);

      expect(mockWindowPrint).toHaveBeenCalled();
    });
  });

  describe("generateLoanThermalReceiptHtml & printLoanThermalReceipt", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    const loanSample: LoanReceiptData = {
      receiptNo: "BA-PINJ-20261120-001",
      loanDate: "2026-11-20T08:00:00.000Z",
      dueDate: "2026-11-27T00:00:00.000Z",
      borrowerName: "Dewi Sartika",
      borrowerCode: "202401099",
      borrowerType: "Mahasiswa",
      borrowerFaculty: "Fakultas Ekonomi dan Bisnis",
      borrowerStudyProgram: "S1 Manajemen",
      bookTitle: "Manajemen Keuangan Syariah",
      inventoryCode: "INV-FEB-002",
      callNumber: "297.273 SUT m",
      staffName: "Petugas Sirkulasi",
      notes: "Peminjaman di tempat",
    };

    it("generates 80mm loan receipt HTML containing member, book, and due date", () => {
      const html = generateLoanThermalReceiptHtml(loanSample);

      expect(html).toContain("STRUK BUKTI PEMINJAMAN BUKU");
      expect(html).toContain("BA-PINJ-20261120-001");
      expect(html).toContain("Dewi Sartika");
      expect(html).toContain("202401099");
      expect(html).toContain("Fakultas Ekonomi dan Bisnis");
      expect(html).toContain("S1 Manajemen");
      expect(html).toContain("Manajemen Keuangan Syariah");
      expect(html).toContain("INV-FEB-002");
      expect(html).toContain("Batas Waktu Pengembalian");
      expect(html).toContain("SEDANG DIPINJAM (AKTIF)");
      expect(html).toContain("TERCATAT SIRKULASI SAH");
    });

    it("invokes print via invisible iframe", () => {
      const mockPrint = vi.fn();
      const mockFocus = vi.fn();
      const mockIframe = {
        style: {} as Record<string, string>,
        setAttribute: vi.fn(),
        contentWindow: {
          focus: mockFocus,
          print: mockPrint,
          document: {
            open: vi.fn(),
            write: vi.fn(),
            close: vi.fn(),
            images: [],
          },
        },
        remove: vi.fn(),
      };

      vi.spyOn(document, "createElement").mockReturnValue(mockIframe as unknown as HTMLElement);
      vi.spyOn(document.body, "appendChild").mockImplementation(() => mockIframe as unknown as Node);

      printLoanThermalReceipt(loanSample);
      vi.advanceTimersByTime(200);

      expect(mockFocus).toHaveBeenCalled();
      expect(mockPrint).toHaveBeenCalled();

      // Fast forward timeout to clean up iframe
      vi.advanceTimersByTime(1600);
      expect(mockIframe.remove).toHaveBeenCalled();
    });
  });
});
