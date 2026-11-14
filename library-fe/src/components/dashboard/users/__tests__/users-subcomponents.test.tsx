import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DeleteUserModal } from "../DeleteUserModal";
import { BanUserModal, BAN_PRESET_REASONS } from "../BanUserModal";
import { UserFilterBar } from "../UserFilterBar";
import { getFallbackInitials, roleBadgeClass, roleBadgeLabel } from "../UserTable";
import type { DashboardUser } from "@/services/dashboard/usersManagementService";
import type { Role } from "@/api/client";

const mockUser: DashboardUser = {
  id: "user-1",
  name: "Ahmad Fauzi",
  email: "fauzi@umc.ac.id",
  image: null,
  role: "student",
  banned: false,
  cardNumber: "CARD-001",
  cardStatus: "active",
  hasSyncedMember: true,
  createdAt: "2026-01-01T00:00:00.000Z",
};

const mockAvailableRoles: Role[] = [
  { id: "student", name: "Mahasiswa", isSystem: true, createdAt: "2026-01-01", updatedAt: "2026-01-01" },
  { id: "lecturer", name: "Dosen", isSystem: true, createdAt: "2026-01-01", updatedAt: "2026-01-01" },
  { id: "staff", name: "Staf", isSystem: true, createdAt: "2026-01-01", updatedAt: "2026-01-01" },
  { id: "super_admin", name: "Super Admin", isSystem: true, createdAt: "2026-01-01", updatedAt: "2026-01-01" },
];

describe("Users Modular Subcomponents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("DeleteUserModal", () => {
    it("merender info user dan konfirmasi hapus", () => {
      const onConfirm = vi.fn();
      const onClose = vi.fn();

      render(
        <DeleteUserModal
          user={mockUser}
          isOpen={true}
          isDeleting={false}
          onClose={onClose}
          onConfirm={onConfirm}
        />
      );

      expect(screen.getByText("Konfirmasi Hapus Pengguna")).toBeInTheDocument();
      expect(screen.getByText("Ahmad Fauzi")).toBeInTheDocument();
      expect(screen.getByText("fauzi@umc.ac.id")).toBeInTheDocument();

      const deleteBtn = screen.getByText("Hapus Pengguna");
      fireEvent.click(deleteBtn);
      expect(onConfirm).toHaveBeenCalled();

      const cancelBtn = screen.getByText("Batal");
      fireEvent.click(cancelBtn);
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe("BanUserModal", () => {
    it("merender opsi ban dan preset reasons saat user aktif", () => {
      const onConfirm = vi.fn();
      const onClose = vi.fn();
      const onBanReasonChange = vi.fn();

      render(
        <BanUserModal
          user={mockUser}
          isOpen={true}
          isSaving={false}
          banReason="Pelanggaran kebijakan sistem"
          onBanReasonChange={onBanReasonChange}
          onClose={onClose}
          onConfirm={onConfirm}
        />
      );

      expect(screen.getByText("Blokir Pengguna (Ban)")).toBeInTheDocument();
      expect(screen.getByText(/Blokir akun Ahmad Fauzi?/i)).toBeInTheDocument();

      // Klik preset reason kedua
      const presetBtn = screen.getByRole("button", { name: BAN_PRESET_REASONS[1] });
      fireEvent.click(presetBtn);
      expect(onBanReasonChange).toHaveBeenCalledWith(BAN_PRESET_REASONS[1]);

      const submitBtn = screen.getByText("Blokir Pengguna");
      fireEvent.click(submitBtn);
      expect(onConfirm).toHaveBeenCalled();
    });

    it("merender modal unban dengan teks buka blokir saat user diblokir", () => {
      const bannedUser: DashboardUser = { ...mockUser, banned: true };
      const onConfirm = vi.fn();

      render(
        <BanUserModal
          user={bannedUser}
          isOpen={true}
          isSaving={false}
          banReason=""
          onBanReasonChange={vi.fn()}
          onClose={vi.fn()}
          onConfirm={onConfirm}
        />
      );

      expect(screen.getByText("Buka Blokir Pengguna (Unban)")).toBeInTheDocument();
      expect(screen.getByText(/Buka blokir akun Ahmad Fauzi?/i)).toBeInTheDocument();

      const activateBtn = screen.getByText("Aktifkan Pengguna");
      fireEvent.click(activateBtn);
      expect(onConfirm).toHaveBeenCalled();
    });
  });

  describe("UserFilterBar", () => {
    it("merender stats, trigger search dan tombol tambah pengguna", () => {
      const onSearchChange = vi.fn();
      const onOpenCreateModal = vi.fn();
      const onRefresh = vi.fn();

      render(
        <UserFilterBar
          stats={{ total: 100, admins: 2, staffs: 5, banned: 1 }}
          search=""
          onSearchChange={onSearchChange}
          showOnlyUnsynced={false}
          onShowOnlyUnsyncedChange={vi.fn()}
          visibleColumns={new Set(["user", "role"])}
          allColumns={[
            { key: "user", label: "User" },
            { key: "role", label: "Role" },
          ]}
          onToggleColumn={vi.fn()}
          onResetColumns={vi.fn()}
          canAddUsers={true}
          exportingUsers={false}
          onOpenCreateModal={onOpenCreateModal}
          onOpenImportModal={vi.fn()}
          onExportUsers={vi.fn()}
          onRefresh={onRefresh}
        />
      );

      expect(screen.getByText("Manajemen User")).toBeInTheDocument();
      expect(screen.getByText("100")).toBeInTheDocument();

      const searchInput = screen.getByPlaceholderText(/Cari nama, email, atau role.../i);
      fireEvent.change(searchInput, { target: { value: "Budi" } });
      expect(onSearchChange).toHaveBeenCalledWith("Budi");

      const createBtn = screen.getByTitle("Tambah akun pengguna baru secara manual");
      fireEvent.click(createBtn);
      expect(onOpenCreateModal).toHaveBeenCalled();

      const refreshBtn = screen.getByText("Refresh");
      fireEvent.click(refreshBtn);
      expect(onRefresh).toHaveBeenCalled();
    });
  });

  describe("UserTable helper functions", () => {
    it("getFallbackInitials menghasilkan inisial yang benar", () => {
      expect(getFallbackInitials("Ahmad Fauzi")).toBe("AF");
      expect(getFallbackInitials("Single")).toBe("SI");
      expect(getFallbackInitials("")).toBe("U");
      expect(getFallbackInitials(null)).toBe("U");
    });

    it("roleBadgeLabel memetakan label role secara akurat", () => {
      expect(roleBadgeLabel("super_admin", mockAvailableRoles)).toBe("Super Admin");
      expect(roleBadgeLabel("student", mockAvailableRoles)).toBe("Mahasiswa");
      expect(roleBadgeLabel("custom_role", mockAvailableRoles)).toBe("custom_role");
    });

    it("roleBadgeClass mengembalikan class badge yang tepat", () => {
      expect(roleBadgeClass("super_admin")).toContain("bg-warning-bg");
      expect(roleBadgeClass("staff")).toContain("bg-blue-50");
      expect(roleBadgeClass("unknown")).toContain("bg-muted");
    });
  });
});
