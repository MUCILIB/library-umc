import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AddMemberModal from "../AddMemberModal";
import { usersManagementService } from "@/services/dashboard/usersManagementService";

vi.mock("@/services/dashboard/usersManagementService", () => ({
  usersManagementService: {
    createUser: vi.fn(),
  },
}));

const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({
    success: mockToastSuccess,
    error: mockToastError,
  }),
}));

describe("AddMemberModal", () => {
  const onClose = vi.fn();
  const onRefresh = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not render when isOpen is false", () => {
    render(<AddMemberModal isOpen={false} onClose={onClose} />);
    expect(screen.queryByText("Tambah Anggota Baru")).toBeNull();
  });

  it("renders form elements when isOpen is true", () => {
    render(<AddMemberModal isOpen={true} onClose={onClose} onRefresh={onRefresh} />);
    expect(screen.getByText("Tambah Anggota Baru")).toBeDefined();
    expect(screen.getByPlaceholderText("Contoh: Budi Santoso")).toBeDefined();
    expect(screen.getByPlaceholderText("Contoh: budi@umc.ac.id")).toBeDefined();
  });

  it("submits data to usersManagementService.createUser and calls callbacks on success", async () => {
    vi.mocked(usersManagementService.createUser).mockResolvedValueOnce({
      success: true,
      message: "User created",
    } as any);

    render(<AddMemberModal isOpen={true} onClose={onClose} onRefresh={onRefresh} />);

    fireEvent.change(screen.getByPlaceholderText("Contoh: Budi Santoso"), {
      target: { value: "Ahmad Dahlan" },
    });
    fireEvent.change(screen.getByPlaceholderText("Contoh: budi@umc.ac.id"), {
      target: { value: "ahmad@umc.ac.id" },
    });
    fireEvent.change(screen.getByPlaceholderText("Contoh: 23010001"), {
      target: { value: "23019999" },
    });
    fireEvent.change(screen.getByPlaceholderText("Contoh: Teknik Informatika"), {
      target: { value: "Sistem Informasi" },
    });
    fireEvent.change(screen.getByPlaceholderText("Contoh: 081234567890"), {
      target: { value: "081299998888" },
    });

    fireEvent.click(screen.getByRole("button", { name: /simpan anggota/i }));

    await waitFor(() => {
      expect(usersManagementService.createUser).toHaveBeenCalledWith({
        name: "Ahmad Dahlan",
        email: "ahmad@umc.ac.id",
        role: "student",
        nimNidn: "23019999",
        faculty: "Sistem Informasi",
        phone: "081299998888",
      });
      expect(mockToastSuccess).toHaveBeenCalledWith(
        "Anggota Ditambahkan",
        expect.stringContaining("Ahmad Dahlan")
      );
      expect(onRefresh).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });
});
