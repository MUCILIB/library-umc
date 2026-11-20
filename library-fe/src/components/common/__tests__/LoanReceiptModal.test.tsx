import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  LoanReceiptModal,
  LoanReceiptCard,
  extractLoanReceiptData,
} from "../LoanReceiptModal";
import * as printReceiptUtil from "@/utils/printReceipt";
import type { Loan } from "@/services/loanService";

vi.mock("@/utils/printReceipt", async () => {
  const actual = await vi.importActual<typeof printReceiptUtil>("@/utils/printReceipt");
  return {
    ...actual,
    printLoanThermalReceipt: vi.fn(),
  };
});

describe("LoanReceiptModal & LoanReceiptCard Component", () => {
  const mockActiveLoan: Loan = {
    id: "loan-direct-abcdef12",
    memberId: "mem-2",
    itemId: "item-2",
    extendCount: 0,
    loanDate: "2026-11-20T09:00:00.000Z",
    dueDate: "2026-11-27T00:00:00.000Z",
    status: "approved",
    notes: "Peminjaman di tempat oleh petugas",
    item: {
      id: "item-2",
      bibliographyId: "bib-2",
      itemCode: "INV-TI-2026-001",
      status: "loaned",
      condition: "good",
      bibliography: {
        id: "bib-2",
        title: "Kecerdasan Buatan dan Robotika",
        author: "Prof. Irfan",
        callNumber: "006.3 IRF k",
      },
    },
    member: {
      id: "mem-2",
      user: {
        id: "u-2",
        name: "Muhammad Fajar",
        email: "fajar@umc.ac.id",
      },
      cardNumber: "UMC-TI-2024-012",
      nimNidn: "240511012",
      type: "student",
      faculty: "Fakultas Teknik",
      studyProgram: "S1 Teknik Informatika",
    } as any,
  };

  describe("extractLoanReceiptData", () => {
    it("extracts borrower, book, dates and defaults properly", () => {
      const data = extractLoanReceiptData(mockActiveLoan);

      expect(data.borrowerName).toBe("Muhammad Fajar");
      expect(data.borrowerCode).toBe("UMC-TI-2024-012");
      expect(data.borrowerType).toBe("Mahasiswa");
      expect(data.borrowerFaculty).toBe("Fakultas Teknik");
      expect(data.borrowerStudyProgram).toBe("S1 Teknik Informatika");
      expect(data.bookTitle).toBe("Kecerdasan Buatan dan Robotika");
      expect(data.inventoryCode).toBe("INV-TI-2026-001");
      expect(data.callNumber).toBe("006.3 IRF k");
      expect(data.receiptNo).toBe("BA-PINJ-LOAN-DIR");
      expect(data.status).toBe("SEDANG DIPINJAM (AKTIF)");
    });

    it("respects overrides if supplied", () => {
      const data = extractLoanReceiptData(mockActiveLoan, {
        staffName: "Pustakawan Piket",
        receiptNo: "CUSTOM-PINJ-999",
      });

      expect(data.staffName).toBe("Pustakawan Piket");
      expect(data.receiptNo).toBe("CUSTOM-PINJ-999");
    });
  });

  describe("LoanReceiptCard Rendering", () => {
    it("renders official header, book details, member details, and return due date", () => {
      const data = extractLoanReceiptData(mockActiveLoan);
      render(<LoanReceiptCard data={data} />);

      expect(screen.getByText("UNIVERSITAS MUHAMMADIYAH CIREBON")).toBeInTheDocument();
      expect(screen.getByText("UPT PERPUSTAKAAN")).toBeInTheDocument();
      expect(screen.getByText("BUKTI PEMINJAMAN BUKU")).toBeInTheDocument();
      expect(screen.getByText("Muhammad Fajar")).toBeInTheDocument();
      expect(screen.getByText("UMC-TI-2024-012")).toBeInTheDocument();
      expect(screen.getByText("Fakultas Teknik")).toBeInTheDocument();
      expect(screen.getByText("S1 Teknik Informatika")).toBeInTheDocument();
      expect(screen.getByText("Kecerdasan Buatan dan Robotika")).toBeInTheDocument();
      expect(screen.getByText("INV-TI-2026-001")).toBeInTheDocument();
      expect(screen.getByText("SEDANG DIPINJAM")).toBeInTheDocument();
      expect(screen.getByText(/Batas Waktu Pengembalian/i)).toBeInTheDocument();
    });
  });

  describe("LoanReceiptModal Interactions", () => {
    it("renders modal when open and invokes printLoanThermalReceipt when Cetak button clicked", () => {
      const handleClose = vi.fn();
      render(
        <LoanReceiptModal
          isOpen={true}
          onClose={handleClose}
          loan={mockActiveLoan}
        />
      );

      expect(screen.getByText("Struk Bukti Peminjaman Buku")).toBeInTheDocument();
      const printBtn = screen.getByRole("button", { name: /Cetak Struk Pinjam/i });
      fireEvent.click(printBtn);

      expect(printReceiptUtil.printLoanThermalReceipt).toHaveBeenCalledTimes(1);
    });

    it("does not render when isOpen is false", () => {
      const { container } = render(
        <LoanReceiptModal
          isOpen={false}
          onClose={vi.fn()}
          loan={mockActiveLoan}
        />
      );

      expect(container).toBeEmptyDOMElement();
    });
  });
});
