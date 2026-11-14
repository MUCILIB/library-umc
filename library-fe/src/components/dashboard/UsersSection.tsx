import { useEffect, useMemo, useState } from "react";
import { Shield, Users as UsersIcon } from "lucide-react";
import { authClient } from "@/utils/auth-client";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { useToast } from "@/hooks/useToast";
import { useUsersManagement } from "@/hooks/dashboard/useUsersManagement";
import {
  usersManagementService,
  type DashboardUser,
} from "@/services/dashboard/usersManagementService";
import { dashboardDataService } from "@/services/dashboard/dashboardDataService";
import { exportApi, roleApi, type Role } from "@/api/client";
import RolePermissionsManager from "./RolePermissionsManager";
import { UserFilterBar, type ColumnDef } from "./users/UserFilterBar";
import { UserTable } from "./users/UserTable";
import { CreateUserModal, type CreateUserFormData } from "./users/CreateUserModal";
import { BanUserModal } from "./users/BanUserModal";
import { DeleteUserModal } from "./users/DeleteUserModal";
import { ImportUserModal } from "./users/ImportUserModal";

const ALL_COLUMNS: ColumnDef[] = [
  { key: "user", label: "User" },
  { key: "role", label: "Role" },
  { key: "status", label: "Status" },
  { key: "kartu", label: "Kartu" },
  { key: "terdaftar", label: "Terdaftar" },
  { key: "aksi", label: "Aksi" },
];
const DEFAULT_COLUMNS = new Set(["user", "role", "status", "kartu", "terdaftar", "aksi"]);

const INITIAL_CREATE_FORM: CreateUserFormData = {
  name: "",
  email: "",
  password: "",
  role: "student",
  nimNidn: "",
  faculty: "",
  phone: "",
};

export default function UsersSection() {
  const { data: session } = authClient.useSession();
  const { success, error: showErrorToast, warning } = useToast();
  const { canAdd, canEdit, canDelete } = useRolePermissions();

  const [mainTab, setMainTab] = useState<"users" | "roles">("users");

  const {
    users,
    loading,
    error: usersError,
    stats,
    refetch,
  } = useUsersManagement(true);

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("users-visible-columns");
      if (saved) {
        const parsed = JSON.parse(saved) as string[];
        return new Set(parsed);
      }
    } catch (err) {
      console.warn("Failed to load column visibility from localStorage:", err);
    }
    return DEFAULT_COLUMNS;
  });

  useEffect(() => {
    try {
      localStorage.setItem("users-visible-columns", JSON.stringify(Array.from(visibleColumns)));
    } catch (err) {
      console.warn("Failed to save column visibility to localStorage:", err);
    }
  }, [visibleColumns]);

  const toggleColumn = (key: string) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 1) next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const [pageError, setPageError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [banSavingId, setBanSavingId] = useState<string | null>(null);
  const [syncSavingId, setSyncSavingId] = useState<string | null>(null);
  const [issueSavingId, setIssueSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<DashboardUser | null>(null);
  const [search, setSearch] = useState("");
  const [recordSavingId, setRecordSavingId] = useState<string | null>(null);
  const [banModalUser, setBanModalUser] = useState<DashboardUser | null>(null);
  const [banReasonInput, setBanReasonInput] = useState("Pelanggaran kebijakan sistem");

  const [showOnlyUnsynced, setShowOnlyUnsynced] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [exportingUsers, setExportingUsers] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [createForm, setCreateForm] = useState<CreateUserFormData>(INITIAL_CREATE_FORM);

  useEffect(() => {
    roleApi
      .getAll()
      .then((res) => {
        if (res.data && Array.isArray(res.data)) {
          setAvailableRoles(res.data);
        }
      })
      .catch((err) => {
        console.warn("[UsersSection] Failed to load dynamic roles:", err);
      });
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim() || !createForm.email.trim()) {
      showErrorToast("Validasi Gagal", "Nama lengkap dan email wajib diisi.");
      return;
    }

    try {
      setCreateLoading(true);
      await usersManagementService.createUser({
        name: createForm.name.trim(),
        email: createForm.email.trim(),
        password: createForm.password?.trim() || undefined,
        role: createForm.role,
        nimNidn: createForm.nimNidn?.trim() || undefined,
        faculty: createForm.faculty?.trim() || undefined,
        phone: createForm.phone?.trim() || undefined,
      });

      success("Berhasil", `Pengguna '${createForm.name}' berhasil ditambahkan.`);
      setIsCreateModalOpen(false);
      setCreateForm(INITIAL_CREATE_FORM);
      await refetch();
    } catch (err: unknown) {
      showErrorToast(
        "Gagal Tambah Pengguna",
        err instanceof Error ? err.message : "Terjadi kesalahan saat membuat pengguna"
      );
    } finally {
      setCreateLoading(false);
    }
  };

  const handleExportUsers = async () => {
    setExportingUsers(true);
    try {
      await exportApi.downloadUsers({ search: search || undefined });
      success("Export Berhasil", "Data user berhasil diunduh.");
    } catch (err: unknown) {
      showErrorToast("Export Gagal", err instanceof Error ? err.message : "Gagal mengunduh CSV");
    } finally {
      setExportingUsers(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase().trim();
    const list = showOnlyUnsynced
      ? users.filter((u) => !u.hasSyncedMember)
      : users;

    const baseList = !q
      ? list
      : list.filter((u) => {
          const name = (u.name || "").toLowerCase();
          const email = (u.email || "").toLowerCase();
          const role = (u.role || "").toLowerCase();
          const nim = (u.nimNidn || "").toLowerCase();
          const faculty = (u.faculty || "").toLowerCase();
          const phone = (u.phone || "").toLowerCase();
          return (
            name.includes(q) ||
            email.includes(q) ||
            role.includes(q) ||
            nim.includes(q) ||
            faculty.includes(q) ||
            phone.includes(q)
          );
        });

    return [...baseList].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [users, search, showOnlyUnsynced]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage));
  const paginatedUsers = useMemo(() => {
    return filteredUsers.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [filteredUsers, currentPage, itemsPerPage]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setCurrentPage(1);
  };

  const currentUserId = session?.user?.id;

  const handleRoleChange = async (user: DashboardUser, nextRole: string) => {
    if (!nextRole || nextRole === user.role) return;

    if (user.id === currentUserId) {
      warning("Tidak Diizinkan", "Anda tidak dapat mengubah role akun sendiri.");
      return;
    }

    setSavingId(user.id);
    setPageError(null);
    try {
      await usersManagementService.updateRole(user.id, nextRole);
      await refetch();
      success("Role Diperbarui", `Role ${user.name} berhasil diubah menjadi ${nextRole}.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal memperbarui role user";
      setPageError(message);
      showErrorToast("Update Role Gagal", message);
    } finally {
      setSavingId(null);
    }
  };

  const handleToggleBan = (user: DashboardUser) => {
    if (user.id === currentUserId) {
      warning("Tidak Diizinkan", "Anda tidak dapat memblokir akun sendiri.");
      return;
    }
    setBanModalUser(user);
    setBanReasonInput(user.banned ? "" : "Pelanggaran kebijakan sistem");
  };

  const handleConfirmBanToggle = async () => {
    if (!banModalUser) return;
    const user = banModalUser;
    const nextBanned = !user.banned;
    const banReason = nextBanned ? (banReasonInput.trim() || undefined) : undefined;

    setBanSavingId(user.id);
    setPageError(null);
    try {
      await usersManagementService.updateBanStatus(user.id, nextBanned, banReason);
      await refetch();
      if (nextBanned) {
        success("User Diblokir", `${user.name} berhasil diblokir.`);
      } else {
        success("User Diaktifkan", `${user.name} berhasil diaktifkan kembali.`);
      }
      setBanModalUser(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal memperbarui status ban user";
      setPageError(message);
      showErrorToast("Update Status User Gagal", message);
    } finally {
      setBanSavingId(null);
    }
  };

  const handleSyncMember = async (user: DashboardUser) => {
    setSyncSavingId(user.id);
    setPageError(null);
    try {
      const result = await usersManagementService.syncMemberByUserId(user.id);
      const mode = String(result?.data?.mode || "updated");
      await refetch();
      success("Sinkronisasi Berhasil", `Member ${user.name} berhasil disinkronkan (${mode}).`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal sinkronisasi member";
      setPageError(message);
      showErrorToast("Sync Member Gagal", message);
    } finally {
      setSyncSavingId(null);
    }
  };

  const handleIssueCard = async (user: DashboardUser) => {
    setIssueSavingId(user.id);
    setPageError(null);
    try {
      await usersManagementService.issueMemberCard(user.id);
      await refetch();
      success("Kartu Diterbitkan", `Kartu member untuk ${user.name} berhasil diterbitkan.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal menerbitkan kartu member";
      setPageError(message);
      showErrorToast("Issue Kartu Gagal", message);
    } finally {
      setIssueSavingId(null);
    }
  };

  const handleRecordVisit = async (user: DashboardUser) => {
    setRecordSavingId(user.id);
    try {
      await dashboardDataService.recordVisit({
        name: user.name || "User Tanpa Nama",
        identifier: user.cardNumber || user.email,
        email: user.email,
        faculty: "System User",
      });
      success("Kunjungan Dicatat", `${user.name} berhasil dicatat sebagai pengunjung hari ini.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal mencatat kunjungan";
      showErrorToast("Gagal", message);
    } finally {
      setRecordSavingId(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteConfirmUser) return;
    const user = deleteConfirmUser;

    setDeletingId(user.id);
    setPageError(null);
    try {
      await usersManagementService.deleteUser(user.id);
      await refetch();
      success("User Dihapus", `Akun ${user.name} berhasil dihapus.`);
      setDeleteConfirmUser(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal menghapus user";
      setPageError(message);
      showErrorToast("Hapus User Gagal", message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="w-full min-w-0 max-w-full space-y-6">
      {/* Main Tabs Navigation */}
      <div className="flex border-b border-border gap-2">
        <button
          type="button"
          onClick={() => setMainTab("users")}
          className={`pb-3 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            mainTab === "users"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <UsersIcon size={16} />
          Daftar Pengguna
        </button>

        <button
          type="button"
          onClick={() => setMainTab("roles")}
          className={`pb-3 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            mainTab === "roles"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Shield size={16} />
          Kelola Role & Hak Akses (RBAC)
        </button>
      </div>

      {mainTab === "roles" ? (
        <RolePermissionsManager />
      ) : (
        <>
          <UserFilterBar
            stats={stats}
            search={search}
            onSearchChange={handleSearchChange}
            showOnlyUnsynced={showOnlyUnsynced}
            onShowOnlyUnsyncedChange={setShowOnlyUnsynced}
            visibleColumns={visibleColumns}
            allColumns={ALL_COLUMNS}
            onToggleColumn={toggleColumn}
            onResetColumns={() => setVisibleColumns(DEFAULT_COLUMNS)}
            canAddUsers={canAdd("users")}
            exportingUsers={exportingUsers}
            onOpenCreateModal={() => setIsCreateModalOpen(true)}
            onOpenImportModal={() => setIsImportModalOpen(true)}
            onExportUsers={() => void handleExportUsers()}
            onRefresh={() => void refetch()}
          />

          <UserTable
            users={paginatedUsers}
            loading={loading}
            error={pageError || usersError}
            visibleColumns={visibleColumns}
            currentUserId={currentUserId}
            availableRoles={availableRoles}
            savingId={savingId}
            recordSavingId={recordSavingId}
            syncSavingId={syncSavingId}
            issueSavingId={issueSavingId}
            banSavingId={banSavingId}
            deletingId={deletingId}
            canEditUsers={canEdit("users")}
            canDeleteUsers={canDelete("users")}
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredUsers.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onRoleChange={(user, nextRole) => void handleRoleChange(user, nextRole)}
            onRecordVisit={(user) => void handleRecordVisit(user)}
            onSyncMember={(user) => void handleSyncMember(user)}
            onIssueCard={(user) => void handleIssueCard(user)}
            onToggleBan={handleToggleBan}
            onDeleteUser={(user) => setDeleteConfirmUser(user)}
          />

          <BanUserModal
            user={banModalUser}
            isOpen={Boolean(banModalUser)}
            isSaving={Boolean(banSavingId)}
            banReason={banReasonInput}
            onBanReasonChange={setBanReasonInput}
            onClose={() => setBanModalUser(null)}
            onConfirm={() => void handleConfirmBanToggle()}
          />

          <ImportUserModal
            isOpen={isImportModalOpen}
            onClose={() => setIsImportModalOpen(false)}
            onSuccess={() => {
              void refetch();
              success("Import Berhasil", "Data user telah diperbarui.");
            }}
          />

          <CreateUserModal
            isOpen={isCreateModalOpen}
            loading={createLoading}
            availableRoles={availableRoles}
            form={createForm}
            onFormChange={setCreateForm}
            onClose={() => setIsCreateModalOpen(false)}
            onSubmit={(e) => void handleCreateUser(e)}
          />

          <DeleteUserModal
            user={deleteConfirmUser}
            isOpen={Boolean(deleteConfirmUser)}
            isDeleting={Boolean(deletingId)}
            onClose={() => setDeleteConfirmUser(null)}
            onConfirm={() => void handleDeleteUser()}
          />
        </>
      )}
    </div>
  );
}
