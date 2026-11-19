import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ReturnConfirmationPage from "../ReturnConfirmationPage";
import { MemoryRouter } from "react-router";
import loanService from "@/services/loanService";
import { authClient } from "@/utils/auth-client";
import * as printReceiptModule from "@/utils/printReceipt";

vi.mock("@/utils/printReceipt", async () => {
  const actual = await vi.importActual<typeof printReceiptModule>("@/utils/printReceipt");
  return {
    ...actual,
    printThermalReceipt: vi.fn(),
  };
});

const mockNavigate = vi.fn();
vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ loanId: "loan-123" }),
    useSearchParams: () => [new URLSearchParams(""), vi.fn()],
  };
});

vi.mock("@/services/loanService", () => ({
  default: {
    getLoanById: vi.fn(),
    returnLoan: vi.fn(),
    approveReturnRequest: vi.fn(),
    confirmReturnWithReceipt: vi.fn(),
    downloadReturnReceiptPdf: vi.fn(),
  },
}));

vi.mock("@/utils/auth-client", () => ({
  authClient: {
    useSession: vi.fn(),
  },
}));

vi.mock("@/components/common/SignaturePad", () => ({
  SignaturePad: ({ onSignatureChange }: { onSignatureChange: (val: string) => void }) => (
    <button
      type="button"
      data-testid="mock-sign-btn"
      onClick={() => onSignatureChange("data:image/png;base64,mocksignature")}
    >
      Sign Canvas
    </button>
  ),
}));

vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  }),
}));

describe("ReturnConfirmationPage (TDD)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (authClient.useSession as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        user: {
          id: "admin-1",
          name: "Super Admin",
          role: "super_admin",
        },
      },
    });

    (loanService.getLoanById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "loan-123",
      status: "approved",
      loanDate: "2026-11-01",
      dueDate: "2026-11-15",
      item: {
        itemCode: "ITEM-001",
        bibliography: {
          title: "Buku UMC",
          author: "Penulis UMC",
        },
      },
      member: {
        user: { name: "Mahasiswa 1" },
        nimNidn: "2301001",
        faculty: "Teknik",
      },
    });
  });

  it("allows librarian to change staffName to another name without reverting to Super Admin", async () => {
    render(
      <MemoryRouter>
        <ReturnConfirmationPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue("Super Admin")).toBeInTheDocument();
    });

    const staffInput = screen.getByLabelText(/Nama Petugas Penerima/i);
    // User clears the field to type another staff's name
    fireEvent.change(staffInput, { target: { value: "" } });

    // It should remain empty and NOT snap back to "Super Admin"
    expect(staffInput).toHaveValue("");

    // User types another staff name
    fireEvent.change(staffInput, { target: { value: "Siti Pustakawati" } });
    expect(staffInput).toHaveValue("Siti Pustakawati");
  });

  it("navigates to /dashboard/super-admin?tab=loans, not broken /dashboard, on success modal click", async () => {
    (loanService.returnLoan as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        returnReceiptNo: "BA-RET-20261110-001",
      },
    });

    render(
      <MemoryRouter>
        <ReturnConfirmationPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue("Super Admin")).toBeInTheDocument();
    });

    // Provide signature
    fireEvent.click(screen.getByTestId("mock-sign-btn"));

    // Submit form
    const submitBtn = screen.getByRole("button", { name: /Konfirmasi & Terbitkan Berita Acara/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Pengembalian Berhasil Dikonfirmasi!/i)).toBeInTheDocument();
    });

    const dashboardBtn = screen.getByRole("button", { name: /Ke Dashboard/i });
    fireEvent.click(dashboardBtn);

    expect(mockNavigate).toHaveBeenCalledWith("/dashboard/super-admin?tab=loans");
  });

  it("triggers direct thermal printing when 'Cetak Resi Langsung' is clicked in success modal", async () => {
    (loanService.returnLoan as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        returnReceiptNo: "BA-RET-20261110-001",
      },
    });

    render(
      <MemoryRouter>
        <ReturnConfirmationPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue("Super Admin")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("mock-sign-btn"));
    const submitBtn = screen.getByRole("button", { name: /Konfirmasi & Terbitkan Berita Acara/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Pengembalian Berhasil Dikonfirmasi!/i)).toBeInTheDocument();
    });

    const printBtn = screen.getByRole("button", { name: /Cetak Resi Langsung/i });
    fireEvent.click(printBtn);

    expect(printReceiptModule.printThermalReceipt).toHaveBeenCalledTimes(1);
    const calledData = (printReceiptModule.printThermalReceipt as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(calledData.receiptNo).toBe("BA-RET-20261110-001");
    expect(calledData.staffName).toBe("Super Admin");
  });

  it("renders receipt preview and handles direct print and PDF download when loan is already returned", async () => {
    (loanService.getLoanById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "loan-123",
      status: "returned",
      loanDate: "2026-11-01",
      dueDate: "2026-11-15",
      returnDate: "2026-11-15T09:00:00.000Z",
      returnReceiptNo: "BA-RET-ALREADY-DONE",
      returnStaffName: "Pustakawan Senior",
      item: {
        itemCode: "ITEM-001",
        bibliography: {
          title: "Buku UMC",
          author: "Penulis UMC",
        },
      },
      member: {
        user: { name: "Mahasiswa 1" },
        nimNidn: "2301001",
        faculty: "Teknik",
      },
    });

    render(
      <MemoryRouter>
        <ReturnConfirmationPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Buku Telah Selesai Dikembalikan/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Bentuk Fisik Resi Pengembalian/i)).toBeInTheDocument();
    expect(screen.getAllByText("BA-RET-ALREADY-DONE").length).toBeGreaterThanOrEqual(1);

    const printBtn = screen.getByRole("button", { name: /Cetak Resi Pengembalian/i });
    fireEvent.click(printBtn);

    expect(printReceiptModule.printThermalReceipt).toHaveBeenCalledTimes(1);
    const calledData = (printReceiptModule.printThermalReceipt as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(calledData.receiptNo).toBe("BA-RET-ALREADY-DONE");
    expect(calledData.borrowerName).toBe("Mahasiswa 1");

    const downloadPdfBtns = screen.getAllByRole("button", { name: /Unduh PDF/i });
    fireEvent.click(downloadPdfBtns[0]);

    expect(loanService.downloadReturnReceiptPdf).toHaveBeenCalledWith("loan-123");

    const openModalBtn = screen.getByRole("button", { name: /Buka Dialog Resi/i });
    fireEvent.click(openModalBtn);
    expect(screen.getByText(/Resi Bukti Pengembalian Buku/i)).toBeInTheDocument();
  });
});
