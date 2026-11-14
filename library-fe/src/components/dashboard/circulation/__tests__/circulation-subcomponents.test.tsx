import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { CirculationScanForm } from "../CirculationScanForm";
import { CirculationLoanSuccess } from "../CirculationLoanSuccess";
import { CirculationReturnSuccess } from "../CirculationReturnSuccess";
import { CirculationItemResult } from "../CirculationItemResult";
import type { ItemResult } from "../types";

const mockItemResult: ItemResult = {
  item: {
    id: "item-101",
    itemCode: "UMC-B001",
    title: "Algoritma dan Struktur Data",
    status: "loaned",
    location: "Lantai 1, Rak A-1",
  },
  activeLoan: {
    id: "loan-555",
    loanCode: "LN-2026-001",
    memberId: "usr-12",
    memberName: "Budi Santoso",
    dueDate: "2026-12-01T00:00:00.000Z",
    status: "approved",
    extensionStatus: "none",
  },
  allowedActions: ["return"],
};

describe("Circulation Modular Subcomponents", () => {
  describe("CirculationScanForm", () => {
    it("merender form scan input dan mentrigger aksi pencarian dan kamera", () => {
      const onScanInputChange = vi.fn();
      const onExecuteLookup = vi.fn();
      const onOpenCamera = vi.fn();

      render(
        <CirculationScanForm
          scanInput="UMC-B001"
          onScanInputChange={onScanInputChange}
          scanType="code"
          onScanTypeChange={vi.fn()}
          intent="loan"
          onIntentChange={vi.fn()}
          onExecuteLookup={onExecuteLookup}
          onOpenCamera={onOpenCamera}
          loading={false}
        />
      );

      const input = screen.getByPlaceholderText("Masukkan / scan kode item...");
      expect(input).toHaveValue("UMC-B001");

      const cameraBtn = screen.getByText("Scan Kamera");
      fireEvent.click(cameraBtn);
      expect(onOpenCamera).toHaveBeenCalled();

      const searchBtn = screen.getByLabelText("Lookup");
      fireEvent.click(searchBtn);
      expect(onExecuteLookup).toHaveBeenCalled();
    });
  });

  describe("CirculationLoanSuccess", () => {
    it("merender kartu sukses peminjaman dengan tanggal jatuh tempo", () => {
      const onReset = vi.fn();
      const mockLoanResult = {
        loan: {
          id: "loan-1",
          loanCode: "LN-001",
          memberId: "user-1",
          itemId: "item-1",
          status: "approved",
          loanDate: "2026-11-14",
          dueDate: "2026-11-21",
        },
        message: "Buku berhasil dipinjamkan",
      };

      render(
        <CirculationLoanSuccess
          loanResult={mockLoanResult}
          onReset={onReset}
        />
      );

      expect(screen.getByText("Peminjaman Berhasil")).toBeInTheDocument();
      expect(screen.getByText("Buku berhasil dipinjamkan")).toBeInTheDocument();
      expect(screen.getByText("2026-11-21")).toBeInTheDocument();

      const backBtn = screen.getByRole("button", { name: /Kembali ke scan/i });
      fireEvent.click(backBtn);
      expect(onReset).toHaveBeenCalled();
    });
  });

  describe("CirculationReturnSuccess", () => {
    it("merender kartu sukses pengembalian beserta rincian denda keterlambatan", () => {
      const onReset = vi.fn();
      const mockReturnResult = {
        success: true,
        message: "Buku berhasil dikembalikan",
        fine: {
          id: "fine-10",
          overdueDays: 3,
          assessedAmount: "15.000",
          status: "unpaid",
        },
      };

      render(
        <CirculationReturnSuccess
          returnResult={mockReturnResult}
          onReset={onReset}
        />
      );

      expect(screen.getByText("Pengembalian Berhasil")).toBeInTheDocument();
      expect(screen.getByText("Buku berhasil dikembalikan")).toBeInTheDocument();
      expect(screen.getByText("3 hari")).toBeInTheDocument();
      expect(screen.getByText("Rp 15.000")).toBeInTheDocument();

      const backBtn = screen.getByRole("button", { name: /Kembali ke scan/i });
      fireEvent.click(backBtn);
      expect(onReset).toHaveBeenCalled();
    });
  });

  describe("CirculationItemResult", () => {
    it("merender rincian buku yang ditemukan dan trigger aksi kembali", () => {
      const onReset = vi.fn();
      const onReturn = vi.fn();

      render(
        <CirculationItemResult
          itemResult={mockItemResult}
          intent="return"
          onIntentChange={vi.fn()}
          returnCondition="good"
          onReturnConditionChange={vi.fn()}
          loading={false}
          onLoan={vi.fn()}
          onReturn={onReturn}
          onApproveExtension={vi.fn()}
          onRejectExtension={vi.fn()}
          onReset={onReset}
          formatDateStr={(d) => d || "-"}
        />
      );

      expect(screen.getByText("UMC-B001")).toBeInTheDocument();
      expect(screen.getByText("Algoritma dan Struktur Data")).toBeInTheDocument();
      expect(screen.getByText("Budi Santoso")).toBeInTheDocument();

      const returnBtn = screen.getByRole("button", { name: /Kembalikan \(Kondisi Baik\)/i });
      fireEvent.click(returnBtn);
      expect(onReturn).toHaveBeenCalledWith("good");

      const backBtn = screen.getByRole("button", { name: /^Kembali$/i });
      fireEvent.click(backBtn);
      expect(onReset).toHaveBeenCalled();
    });
  });
});
