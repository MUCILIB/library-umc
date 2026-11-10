import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ReturnConfirmationPage from "../ReturnConfirmationPage";
import { MemoryRouter } from "react-router";
import loanService from "@/services/loanService";
import { authClient } from "@/utils/auth-client";

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
});
