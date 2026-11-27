import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DeleteUserModal } from "../DeleteUserModal";
import { BanUserModal, BAN_PRESET_REASONS } from "../BanUserModal";
import { UserFilterBar } from "../UserFilterBar";
import { IssueCardModal } from "../IssueCardModal";
import {
  UserTable,
  canEditMemberCardExpiry,
  getFallbackInitials,
  roleBadgeClass,
  roleBadgeLabel,
} from "../UserTable";
import {
  usersManagementService,
  type DashboardUser,
} from "@/services/dashboard/usersManagementService";
import type { Role } from "@/api/client";

vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  }),
}));

vi.mock("@/services/dashboard/usersManagementService", () => ({
  usersManagementService: {
    issueMemberCard: vi.fn().mockResolvedValue({ success: true }),
    updateCardExpiry: vi.fn().mockResolvedValue({ success: true }),
  },
}));

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

    it("canEditMemberCardExpiry hanya mengizinkan ubah masa aktif jika kartu sudah diterbitkan (active/expired)", () => {
      expect(
        canEditMemberCardExpiry({
          hasSyncedMember: true,
          cardStatus: "not_requested",
          cardNumber: null,
        })
      ).toBe(false);
      expect(
        canEditMemberCardExpiry({
          hasSyncedMember: true,
          cardStatus: "pending",
          cardNumber: null,
        })
      ).toBe(false);
      expect(
        canEditMemberCardExpiry({
          hasSyncedMember: false,
          cardStatus: "active",
          cardNumber: "CARD-001",
        })
      ).toBe(false);
      expect(
        canEditMemberCardExpiry({
          hasSyncedMember: true,
          cardStatus: "active",
          cardNumber: "CARD-001",
        })
      ).toBe(true);
      expect(
        canEditMemberCardExpiry({
          hasSyncedMember: true,
          cardStatus: "expired",
          cardNumber: "CARD-001",
        })
      ).toBe(true);
    });

    it("menyembunyikan opsi Ubah Masa Aktif Kartu sebelum kartu diterbitkan pada dropdown UserTable", async () => {
      const user = userEvent.setup();
      const unissuedUser: DashboardUser = {
        ...mockUser,
        id: "user-unissued",
        cardStatus: "not_requested",
        cardNumber: null,
      };

      const { rerender } = render(
        <UserTable
          users={[unissuedUser]}
          loading={false}
          error={null}
          visibleColumns={new Set(["user", "kartu", "aksi"])}
          currentUserId="admin-1"
          availableRoles={mockAvailableRoles}
          savingId={null}
          recordSavingId={null}
          syncSavingId={null}
          issueSavingId={null}
          banSavingId={null}
          deletingId={null}
          canEditUsers={true}
          canDeleteUsers={false}
          currentPage={1}
          totalPages={1}
          totalItems={1}
          itemsPerPage={10}
          onPageChange={vi.fn()}
          onRoleChange={vi.fn()}
          onRecordVisit={vi.fn()}
          onSyncMember={vi.fn()}
          onIssueCard={vi.fn()}
          onToggleBan={vi.fn()}
          onDeleteUser={vi.fn()}
          onEditCardExpiry={vi.fn()}
        />
      );

      await user.click(screen.getByRole("button", { name: /Menu aksi user/i }));
      expect(screen.getByText("Terbitkan Kartu")).toBeInTheDocument();
      expect(screen.queryByText("Ubah Masa Aktif Kartu")).not.toBeInTheDocument();

      rerender(
        <UserTable
          users={[mockUser]}
          loading={false}
          error={null}
          visibleColumns={new Set(["user", "kartu", "aksi"])}
          currentUserId="admin-1"
          availableRoles={mockAvailableRoles}
          savingId={null}
          recordSavingId={null}
          syncSavingId={null}
          issueSavingId={null}
          banSavingId={null}
          deletingId={null}
          canEditUsers={true}
          canDeleteUsers={false}
          currentPage={1}
          totalPages={1}
          totalItems={1}
          itemsPerPage={10}
          onPageChange={vi.fn()}
          onRoleChange={vi.fn()}
          onRecordVisit={vi.fn()}
          onSyncMember={vi.fn()}
          onIssueCard={vi.fn()}
          onToggleBan={vi.fn()}
          onDeleteUser={vi.fn()}
          onEditCardExpiry={vi.fn()}
        />
      );

      await user.click(screen.getByRole("button", { name: /Menu aksi user/i }));
      expect(screen.getByText("Ubah Masa Aktif Kartu")).toBeInTheDocument();
    });
  });

  describe("IssueCardModal", () => {
    it("menampilkan pilihan durasi masa aktif dan mengirim durasi terpilih saat menerbitkan kartu", async () => {
      const onClose = vi.fn();
      const onSuccess = vi.fn();
      const unissuedUser: DashboardUser = {
        ...mockUser,
        cardNumber: null,
        cardStatus: "not_requested",
      };

      render(
        <IssueCardModal
          user={unissuedUser}
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      expect(screen.getByText("Terbitkan Kartu Anggota")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "6 Bulan" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "1 Tahun" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "2 Tahun" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "4 Tahun" })).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "2 Tahun" }));
      fireEvent.click(screen.getByRole("button", { name: /Terbitkan Kartu/i }));

      await waitFor(() => {
        expect(usersManagementService.issueMemberCard).toHaveBeenCalledWith(
          unissuedUser.id,
          undefined,
          expect.objectContaining({
            durationDays: 730,
            cardExpiresAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
          })
        );
        expect(onSuccess).toHaveBeenCalled();
        expect(onClose).toHaveBeenCalled();
      });
    });
  });
});
