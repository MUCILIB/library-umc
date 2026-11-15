import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  formatDate,
  getLoanTitle,
  getLoanAuthor,
} from "../helpers";
import { ReturnModalContent } from "../ReturnModalContent";
import { ExtendModalContent } from "../ExtendModalContent";
import { ActiveLoanCard } from "../ActiveLoanCard";
import { LoanFilterToolbar } from "../LoanFilterToolbar";
import type { Loan as LoanData } from "@/services/loanService";

const mockActiveLoan: LoanData = {
  id: "loan-001",
  memberId: "user-1",
  itemId: "item-1",
  status: "approved",
  extendCount: 0,
  loanDate: "2026-11-01T08:00:00.000Z",
  dueDate: "2026-11-20T08:00:00.000Z",
  notes: "Catatan pinjam",
  item: {
    id: "item-1",
    itemCode: "ITEM-B001",
    barcode: "BAR-001",
    uniqueCode: "UQ-001",
    status: "borrowed",
    bibliographyId: "bib-1",
    location: {
      id: 1,
      room: "Lantai 1",
      rack: "Rak Komputer",
    },
    bibliography: {
      id: "bib-1",
      title: "Algoritma Pemrograman Modern",
      author: "Ir. John Doe, M.Kom",
      image: "https://example.com/cover.jpg",
    },
  },
};

describe("Riwayat Peminjaman Modular Subcomponents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("helpers", () => {
    it("formatDate memformat tanggal dengan benar dan menangani null/invalid", () => {
      expect(formatDate(null)).toBe("-");
      expect(formatDate(undefined)).toBe("-");
      expect(formatDate("invalid-date")).toBe("-");
      expect(formatDate("2026-11-01T00:00:00.000Z")).toContain("2026");
    });

    it("getLoanTitle mengembalikan judul buku dengan fallback", () => {
      expect(getLoanTitle(mockActiveLoan)).toBe("Algoritma Pemrograman Modern");
      expect(getLoanTitle({ id: "1" } as LoanData)).toBe("Judul tidak tersedia");
    });

    it("getLoanAuthor mengembalikan nama pengarang dengan fallback", () => {
      expect(getLoanAuthor(mockActiveLoan)).toBe("Ir. John Doe, M.Kom");
      expect(getLoanAuthor({ id: "1" } as LoanData)).toBe("Penulis tidak tersedia");
    });
  });

  describe("ReturnModalContent", () => {
    it("merender informasi peminjaman dan trigger tombol konfirmasi", () => {
      const onConfirm = vi.fn();
      const onClose = vi.fn();

      render(
        <ReturnModalContent
          loan={mockActiveLoan}
          loading={false}
          onClose={onClose}
          onConfirm={onConfirm}
        />
      );

      expect(screen.getByText("Algoritma Pemrograman Modern")).toBeInTheDocument();
      expect(screen.getByText("Ir. John Doe, M.Kom")).toBeInTheDocument();
      expect(screen.getByText("ITEM-B001")).toBeInTheDocument();

      const confirmBtn = screen.getByRole("button", { name: /Ajukan Pengembalian/i });
      fireEvent.click(confirmBtn);
      expect(onConfirm).toHaveBeenCalled();

      const cancelBtn = screen.getByRole("button", { name: /Batal/i });
      fireEvent.click(cancelBtn);
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe("ExtendModalContent", () => {
    it("merender info perpanjangan dan trigger tombol konfirmasi", () => {
      const onConfirm = vi.fn();
      const onClose = vi.fn();

      render(
        <ExtendModalContent
          loan={mockActiveLoan}
          loading={false}
          onClose={onClose}
          onConfirm={onConfirm}
        />
      );

      expect(screen.getByText("Algoritma Pemrograman Modern")).toBeInTheDocument();
      expect(screen.getByText("Ketentuan Perpanjangan")).toBeInTheDocument();

      const confirmBtn = screen.getByRole("button", { name: /Perpanjang Sekarang/i });
      fireEvent.click(confirmBtn);
      expect(onConfirm).toHaveBeenCalled();
    });
  });

  describe("ActiveLoanCard", () => {
    it("merender badge status, detail buku, dan aksi kembalikan/perpanjang", () => {
      const onReturnClick = vi.fn();
      const onExtendClick = vi.fn();

      render(
        <ActiveLoanCard
          loan={mockActiveLoan}
          onReturnClick={onReturnClick}
          onExtendClick={onExtendClick}
        />
      );

      expect(screen.getByText("Algoritma Pemrograman Modern")).toBeInTheDocument();
      expect(screen.getByText("ITEM-B001")).toBeInTheDocument();

      const returnBtn = screen.getByRole("button", { name: /Kembalikan/i });
      fireEvent.click(returnBtn);
      expect(onReturnClick).toHaveBeenCalledWith(mockActiveLoan);

      const extendBtn = screen.getByRole("button", { name: /Perpanjang/i });
      fireEvent.click(extendBtn);
      expect(onExtendClick).toHaveBeenCalledWith(mockActiveLoan);
    });
  });

  describe("LoanFilterToolbar", () => {
    it("merender pencarian dan filter chip status", () => {
      const onSearchChange = vi.fn();
      const onClearSearch = vi.fn();
      const onStatusFilterChange = vi.fn();
      const onDisplayModeChange = vi.fn();

      render(
        <LoanFilterToolbar
          searchQuery="Algoritma"
          onSearchChange={onSearchChange}
          onClearSearch={onClearSearch}
          statusFilter="all"
          onStatusFilterChange={onStatusFilterChange}
          statusCounts={{ all: 10, returned: 8, rejected: 2 }}
          displayMode="table"
          onDisplayModeChange={onDisplayModeChange}
        />
      );

      const searchInput = screen.getByPlaceholderText(/Cari judul, pengarang, nomor item.../i);
      expect(searchInput).toHaveValue("Algoritma");

      const clearBtn = screen.getByTitle("Hapus pencarian");
      fireEvent.click(clearBtn);
      expect(onClearSearch).toHaveBeenCalled();

      // Klik filter chip "Dikembalikan (8)"
      const returnedChip = screen.getByRole("button", { name: /Dikembalikan \(8\)/i });
      fireEvent.click(returnedChip);
      expect(onStatusFilterChange).toHaveBeenCalledWith("returned");
    });
  });
});
