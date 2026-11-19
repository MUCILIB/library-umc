import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  ReturnReceiptModal,
  ReturnReceiptCard,
  extractReceiptDataFromLoan,
} from "../ReturnReceiptModal";
import * as printReceiptUtil from "@/utils/printReceipt";
import type { Loan } from "@/services/loanService";

vi.mock("@/utils/printReceipt", async () => {
  const actual = await vi.importActual<typeof printReceiptUtil>("@/utils/printReceipt");
  return {
    ...actual,
    printThermalReceipt: vi.fn(),
  };
});

describe("ReturnReceiptModal & ReturnReceiptCard Component", () => {
  const mockLoan: Loan = {
    id: "loan-uuid-12345678",
    memberId: "mem-1",
    itemId: "item-1",
    extendCount: 0,
    loanDate: "2026-11-01T00:00:00.000Z",
    dueDate: "2026-11-15T00:00:00.000Z",
    returnDate: "2026-11-16T10:00:00.000Z",
    status: "returned",
    fine: 2000,
    notes: "Kembali telat 1 hari, buku mulus.",
    returnReceiptNo: "BA-RET-20261116-001",
    returnStaffName: "Budi Pustakawan",
    returnCondition: "good",
    returnStaffSignature: "data:image/png;base64,mocksignature",
    item: {
      id: "item-1",
      bibliographyId: "bib-1",
      itemCode: "ITEM-INV-99",
      status: "available",
      condition: "good",
      bibliography: {
        id: "bib-1",
        title: "Pemrograman Web Modern",
        author: "John Doe",
        callNumber: "005.7 JOH p",
      },
    },
    member: {
      id: "mem-1",
      user: {
        id: "u-1",
        name: "Siti Rahma",
        email: "siti@umc.ac.id",
      },
      cardNumber: "UMC-2023-088",
      nimNidn: "230511088",
      type: "Mahasiswa",
      faculty: "Teknik Informatika",
    } as any,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("extractReceiptDataFromLoan", () => {
    it("extracts all receipt properties correctly from populated loan object", () => {
      const data = extractReceiptDataFromLoan(mockLoan);

      expect(data.receiptNo).toBe("BA-RET-20261116-001");
      expect(data.borrowerName).toBe("Siti Rahma");
      expect(data.borrowerCode).toBe("UMC-2023-088");
      expect(data.borrowerType).toBe("Mahasiswa");
      expect(data.borrowerFaculty).toBe("Teknik Informatika");
      expect(data.bookTitle).toBe("Pemrograman Web Modern");
      expect(data.inventoryCode).toBe("ITEM-INV-99");
      expect(data.callNumber).toBe("005.7 JOH p");
      expect(data.loanDate).toBe("2026-11-01T00:00:00.000Z");
      expect(data.dueDate).toBe("2026-11-15T00:00:00.000Z");
      expect(data.returnDate).toBe("2026-11-16T10:00:00.000Z");
      expect(data.condition).toBe("good");
      expect(data.fineAmount).toBe(2000);
      expect(data.fineStatus).toBe("LUNAS");
      expect(data.staffName).toBe("Budi Pustakawan");
      expect(data.signature).toBe("data:image/png;base64,mocksignature");
      expect(data.notes).toBe("Kembali telat 1 hari, buku mulus.");
    });

    it("applies overrides properly", () => {
      const data = extractReceiptDataFromLoan(mockLoan, {
        staffName: "Staff Pengganti",
        fineStatus: "LUNAS",
      });

      expect(data.staffName).toBe("Staff Pengganti");
      expect(data.fineStatus).toBe("LUNAS");
    });

    it("handles minimal/sparse loan objects gracefully with fallbacks", () => {
      const minimalLoan: Loan = {
        id: "short-id-1234",
        itemId: "item-min",
        memberId: "mem-min",
        extendCount: 0,
        loanDate: "2026-11-01",
        dueDate: "2026-11-10",
        status: "returned",
      };

      const data = extractReceiptDataFromLoan(minimalLoan);
      expect(data.receiptNo).toBe("BA-RET-SHORT-ID");
      expect(data.borrowerName).toBe("Anggota Perpustakaan");
      expect(data.borrowerCode).toBe("-");
      expect(data.bookTitle).toBe("Buku Koleksi Perpustakaan");
      expect(data.inventoryCode).toBe("-");
      expect(data.callNumber).toBe("-");
      expect(data.fineAmount).toBe(0);
      expect(data.fineStatus).toBe("BEBAS DENDA");
    });
  });

  describe("ReturnReceiptCard", () => {
    it("renders receipt preview card with thermal styling and all loan details", () => {
      const data = extractReceiptDataFromLoan(mockLoan);
      render(<ReturnReceiptCard data={data} />);

      expect(screen.getByText(/UNIVERSITAS MUHAMMADIYAH CIREBON/i)).toBeInTheDocument();
      expect(screen.getByText(/UPT PERPUSTAKAAN/i)).toBeInTheDocument();
      expect(screen.getByText("BA-RET-20261116-001")).toBeInTheDocument();
      expect(screen.getByText("Siti Rahma")).toBeInTheDocument();
      expect(screen.getByText("Pemrograman Web Modern")).toBeInTheDocument();
      expect(screen.getByText("ITEM-INV-99")).toBeInTheDocument();
      expect(screen.getByText("005.7 JOH p")).toBeInTheDocument();
      expect(screen.getByText(/Fakultas:/i)).toBeInTheDocument();
      expect(screen.getByText("Teknik Informatika")).toBeInTheDocument();
      expect(screen.getByText(/TERVERIFIKASI SAH/i)).toBeInTheDocument();
      expect(screen.getByText("Budi Pustakawan")).toBeInTheDocument();
    });
  });

  describe("ReturnReceiptModal", () => {
    it("does not render when isOpen is false", () => {
      render(
        <ReturnReceiptModal
          isOpen={false}
          onClose={vi.fn()}
          loan={mockLoan}
        />
      );

      expect(screen.queryByText(/Resi Bukti Pengembalian Buku/i)).not.toBeInTheDocument();
    });

    it("renders preview dialog and calls printThermalReceipt on print button click", () => {
      const onClose = vi.fn();
      render(
        <ReturnReceiptModal
          isOpen={true}
          onClose={onClose}
          loan={mockLoan}
        />
      );

      expect(screen.getByText(/Resi Bukti Pengembalian Buku/i)).toBeInTheDocument();
      expect(screen.getByText("Siti Rahma")).toBeInTheDocument();
      expect(screen.getByText("Teknik Informatika")).toBeInTheDocument();

      const printBtn = screen.getByRole("button", { name: /Cetak Resi/i });
      fireEvent.click(printBtn);

      expect(printReceiptUtil.printThermalReceipt).toHaveBeenCalledTimes(1);
      const calledWith = (printReceiptUtil.printThermalReceipt as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(calledWith.receiptNo).toBe("BA-RET-20261116-001");
      expect(calledWith.borrowerName).toBe("Siti Rahma");
      expect(calledWith.borrowerFaculty).toBe("Teknik Informatika");
    });

    it("calls onDownloadPdf when download button is clicked", () => {
      const onDownloadPdf = vi.fn();
      render(
        <ReturnReceiptModal
          isOpen={true}
          onClose={vi.fn()}
          loan={mockLoan}
          onDownloadPdf={onDownloadPdf}
        />
      );

      const downloadBtn = screen.getByRole("button", { name: /Unduh PDF/i });
      fireEvent.click(downloadBtn);

      expect(onDownloadPdf).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when close icon or button is clicked", () => {
      const onClose = vi.fn();
      render(
        <ReturnReceiptModal
          isOpen={true}
          onClose={onClose}
          loan={mockLoan}
        />
      );

      const closeBtn = screen.getByRole("button", { name: "Tutup" });
      fireEvent.click(closeBtn);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("closes dialog when Escape key is pressed", () => {
      const onClose = vi.fn();
      render(
        <ReturnReceiptModal
          isOpen={true}
          onClose={onClose}
          loan={mockLoan}
        />
      );

      fireEvent.keyDown(document, { key: "Escape" });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("closes dialog when backdrop is clicked", () => {
      const onClose = vi.fn();
      render(
        <ReturnReceiptModal
          isOpen={true}
          onClose={onClose}
          loan={mockLoan}
        />
      );

      const backdrop = document.querySelector(".backdrop-blur-sm");
      expect(backdrop).not.toBeNull();
      if (backdrop) {
        fireEvent.click(backdrop);
        expect(onClose).toHaveBeenCalledTimes(1);
      }
    });
  });
});
