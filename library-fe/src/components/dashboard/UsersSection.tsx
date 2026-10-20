import { useEffect, useMemo, useState, Fragment, useRef } from "react";
import {
  Search,
  RefreshCw,
  Users2,
  ShieldCheck,
  UserX,
  Save,
  Link,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Download,
  Upload,
  Loader2,
  AlertCircle,
  CheckCircle,
  X,
  Columns3,
  Check,
  Trash2,
  UserCog,
  CreditCard,
  GraduationCap,
  BookOpen
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Modal from "@/components/ui/modal";
import { authClient } from "@/utils/auth-client";
import { useToast } from "@/hooks/useToast";
import { useUsersManagement } from "@/hooks/dashboard/useUsersManagement";
import { usersManagementService } from "@/services/dashboard/usersManagementService";
import { dashboardDataService } from "@/services/dashboard/dashboardDataService";
import { exportApi, importApi } from "@/api/client";

const AVAILABLE_ROLES = [
  {
    value: "student",
    label: "Mahasiswa",
    description: "Akses peminjaman buku standar dan pencatatan absensi kunjungan.",
    badge: "bg-muted text-muted-foreground border-border",
    icon: GraduationCap,
  },
  {
    value: "lecturer",
    label: "Dosen",
    description: "Akses peminjaman kuota dosen dan durasi lebih panjang untuk riset.",
    badge: "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800",
    icon: BookOpen,
  },
  {
    value: "staff",
    label: "Staff Perpustakaan",
    description: "Akses dashboard, katalog bibliografi, sirkulasi, dan inventaris.",
    badge: "bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800",
    icon: Users2,
  },
  {
    value: "super_admin",
    label: "Super Admin",
    description: "Akses penuh seluruh konfigurasi sistem, kelola user, dan laporan.",
    badge: "bg-warning-bg text-destructive border-warning-border",
    icon: ShieldCheck,
  },
];

const BAN_PRESET_REASONS = [
  "Pelanggaran kebijakan sistem",
  "Keterlambatan pengembalian buku berulang",
  "Penyalahgunaan kartu anggota perpustakaan",
  "Akun tidak aktif / verifikasi identitas",
];

export default function UsersSection() {
  const { data: session } = authClient.useSession();
  const { success, error: showErrorToast, warning } = useToast();

  const {
    users,
    loading,
    error: usersError,
    stats,
    refetch
  } = useUsersManagement(true);

  // Column visibility
  type ColumnKey = "user" | "role" | "status" | "kartu" | "terdaftar" | "aksi";
  const ALL_COLUMNS: { key: ColumnKey; label: string }[] = [
    { key: "user", label: "User" },
    { key: "role", label: "Role" },
    { key: "status", label: "Status" },
    { key: "kartu", label: "Kartu" },
    { key: "terdaftar", label: "Terdaftar" },
    { key: "aksi", label: "Aksi" },
  ];
  const DEFAULT_COLUMNS: Set<ColumnKey> = new Set(["user", "role", "status", "kartu", "terdaftar", "aksi"]);

  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(() => {
    try {
      const saved = localStorage.getItem("users-visible-columns");
      if (saved) {
        const parsed = JSON.parse(saved) as string[];
        return new Set(parsed as ColumnKey[]);
      }
    } catch (err) {
      console.warn("Failed to load column visibility from localStorage:", err);
    }
    return DEFAULT_COLUMNS;
  });
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const columnPickerRef = useRef<HTMLDivElement>(null);

  // Save column visibility to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem("users-visible-columns", JSON.stringify(Array.from(visibleColumns)));
    } catch (err) {
      console.warn("Failed to save column visibility to localStorage:", err);
    }
  }, [visibleColumns]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (columnPickerRef.current && !columnPickerRef.current.contains(e.target as Node)) {
        setShowColumnPicker(false);
      }
    };
    if (showColumnPicker) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showColumnPicker]);

  const toggleColumn = (key: ColumnKey) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        // Always keep at least 1 column visible
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
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<(typeof users)[number] | null>(null);
  const [search, setSearch] = useState("");
  const [recordSavingId, setRecordSavingId] = useState<string | null>(null);
  const [showOnlyUnsynced, setShowOnlyUnsynced] = useState(false);
  const [roleDraft, setRoleDraft] = useState<Record<string, string>>({});
  const [editingRoleUser, setEditingRoleUser] = useState<(typeof users)[number] | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [banModalUser, setBanModalUser] = useState<(typeof users)[number] | null>(null);
  const [banReasonInput, setBanReasonInput] = useState("Pelanggaran kebijakan sistem");

  const openEditRoleModal = (user: (typeof users)[number]) => {
    setEditingRoleUser(user);
    const isKnown = AVAILABLE_ROLES.some((r) => r.value === user.role);
    setSelectedRole(isKnown ? user.role : "");
  };
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [exportingUsers, setExportingUsers] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

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

  useEffect(() => {
    if (!users.length) return;
    setRoleDraft((prev) => {
      const next = { ...prev };
      for (const user of users) {
        next[user.id] = user.role;
      }
      return next;
    });
  }, [users]);

  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase().trim();
    const list = showOnlyUnsynced
      ? users.filter((u) => !u.hasSyncedMember)
      : users;

    if (!q) return list;

    return list.filter((u) => {
      const name = (u.name || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      const role = (u.role || "").toLowerCase();
      return name.includes(q) || email.includes(q) || role.includes(q);
    });
  }, [users, search, showOnlyUnsynced]);

  // Pagination Logic
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

  const getFallbackInitials = (name?: string | null) => {
    if (!name) return "U";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const roleBadgeClass = (role: string) => {
    if (role === "super_admin") return "bg-warning-bg text-destructive border-warning-border";
    if (role === "staff") return "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800";
    return "bg-muted text-muted-foreground border-border";
  };

  const cardStatusLabel = (status?: string | null) => {
    switch (status) {
      case "active":
        return "Aktif";
      case "pending":
        return "Menunggu";
      case "rejected":
        return "Ditolak";
      case "expired":
        return "Kedaluwarsa";
      default:
        return "Belum Ajukan";
    }
  };

  const cardStatusClass = (status?: string | null) => {
    switch (status) {
      case "active":
        return "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800";
      case "pending":
        return "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border-amber-200";
      case "rejected":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "expired":
        return "bg-orange-50 text-orange-700 border-orange-200";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const handleUpdateRole = async (user: (typeof users)[number], roleArg?: string) => {
    const nextRole = roleArg || selectedRole || roleDraft[user.id] || user.role;
    if (!nextRole || nextRole === user.role) {
      warning(
        "Tidak Ada Perubahan",
        "Role yang dipilih sama dengan role saat ini."
      );
      setEditingRoleUser(null);
      return;
    }

    setSavingId(user.id);
    setPageError(null);
    try {
      await usersManagementService.updateRole(user.id, nextRole);
      await refetch();
      success(
        "Role Diperbarui",
        `Role ${user.name} berhasil diubah menjadi ${nextRole}.`
      );
      setEditingRoleUser(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Gagal memperbarui role user";
      setPageError(message);
      showErrorToast("Update Role Gagal", message);
    } finally {
      setSavingId(null);
    }
  };

  const currentUserId = session?.user?.id;

  const handleConfirmBanToggle = async () => {
    if (!banModalUser) return;
    const user = banModalUser;
    const nextBanned = !user.banned;
    const banReason = nextBanned ? (banReasonInput.trim() || undefined) : undefined;

    setBanSavingId(user.id);
    setPageError(null);
    try {
      await usersManagementService.updateBanStatus(
        user.id,
        nextBanned,
        banReason
      );
      await refetch();
      if (nextBanned) {
        success("User Diblokir", `${user.name} berhasil diban.`);
      } else {
        success("User Diaktifkan", `${user.name} berhasil di-unban.`);
      }
      setBanModalUser(null);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Gagal memperbarui status ban user";
      setPageError(message);
      showErrorToast("Update Status User Gagal", message);
    } finally {
      setBanSavingId(null);
    }
  };

  const handleSyncMember = async (user: (typeof users)[number]) => {
    setSyncSavingId(user.id);
    setPageError(null);
    try {
      const result = await usersManagementService.syncMemberByUserId(user.id);
      const mode = String(result?.data?.mode || "updated");
      await refetch();
      success(
        "Sinkronisasi Berhasil",
        `Member ${user.name} berhasil disinkronkan (${mode}).`
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Gagal sinkronisasi member";
      setPageError(message);
      showErrorToast("Sync Member Gagal", message);
    } finally {
      setSyncSavingId(null);
    }
  };

  const handleIssueCard = async (user: (typeof users)[number]) => {
    setIssueSavingId(user.id);
    setPageError(null);
    try {
      await usersManagementService.issueMemberCard(user.id);
      await refetch();
      success(
        "Kartu Diterbitkan",
        `Kartu member untuk ${user.name} berhasil diterbitkan.`
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Gagal menerbitkan kartu member";
      setPageError(message);
      showErrorToast("Issue Kartu Gagal", message);
    } finally {
      setIssueSavingId(null);
    }
  };

  const handleRecordVisit = async (user: (typeof users)[number]) => {
    setRecordSavingId(user.id);
    try {
      await dashboardDataService.recordVisit({
        name: user.name || "User Tanpa Nama",
        identifier: user.cardNumber || user.email,
        email: user.email,
        faculty: "System User"
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
      const message =
        err instanceof Error ? err.message : "Gagal menghapus user";
      setPageError(message);
      showErrorToast("Hapus User Gagal", message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="w-full min-w-0 max-w-full space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-[28px] font-extrabold text-foreground tracking-tight">
            Manajemen User
          </h2>
          <p className="text-muted-foreground font-medium text-[15px] mt-1">
            Kelola dan monitor akun pengguna sistem perpustakaan.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportUsers}
            disabled={exportingUsers}
            className="bg-card hover:bg-muted text-foreground border border-border px-5 py-2.5 rounded-full text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
            title="Export data user ke CSV"
          >
            {exportingUsers ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Download size={16} strokeWidth={2.5} />
            )}
            Export CSV
          </button>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-full text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-red-500/20 transition-all"
            title="Import user dari file CSV"
          >
            <Upload size={16} strokeWidth={2.5} />
            Import User CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-2xl border border-border p-5">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            Total User
          </p>
          <p className="mt-2 text-2xl font-black text-foreground">
            {stats.total}
          </p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-5">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            Super Admin
          </p>
          <p className="mt-2 text-2xl font-black text-destructive">
            {stats.admins}
          </p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-5">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            Staff
          </p>
          <p className="mt-2 text-2xl font-black text-blue-700 dark:text-blue-400">
            {stats.staffs}
          </p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-5">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            Banned
          </p>
          <p className="mt-2 text-2xl font-black text-orange-700">
            {stats.banned}
          </p>
        </div>
      </div>

      <div className="w-full min-w-0 max-w-full bg-card rounded-[24px] border border-border shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-[360px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <input
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Cari nama, email, atau role..."
              className="w-full pl-11 pr-4 py-2.5 bg-muted border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-red-500/10 focus:border-primary/40 outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Column Picker */}
            <div className="relative" ref={columnPickerRef}>
              <button
                onClick={() => setShowColumnPicker((v) => !v)}
                className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-medium text-foreground hover:bg-surface-hover"
                title="Pilih kolom yang ditampilkan"
                aria-label="Pilih Kolom"
              >
                <Columns3 className="size-4 text-primary" />
                <span className="hidden sm:inline">Kolom</span>
                <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                  {visibleColumns.size}/{ALL_COLUMNS.length}
                </span>
              </button>
              {showColumnPicker && (
                <div className="absolute right-0 top-full z-50 mt-1 w-52 rounded-xl border border-border bg-card shadow-lg">
                  <div className="border-b border-border px-3 py-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tampilkan Kolom</p>
                  </div>
                  <div className="p-2 space-y-0.5">
                    {ALL_COLUMNS.map((col) => {
                      const isChecked = visibleColumns.has(col.key);
                      const isDisabled = isChecked && visibleColumns.size === 1;
                      return (
                        <button
                          key={col.key}
                          onClick={() => toggleColumn(col.key)}
                          disabled={isDisabled}
                          className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                            isChecked
                              ? "text-foreground"
                              : "text-muted-foreground"
                          } hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed`}
                        >
                          <span
                            className={`flex size-4 shrink-0 items-center justify-center rounded border transition-colors ${
                              isChecked
                                ? "border-primary bg-primary"
                                : "border-border bg-card"
                            }`}
                          >
                            {isChecked && <Check className="size-3 text-white" />}
                          </span>
                          {col.label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="border-t border-border px-3 py-2">
                    <button
                      onClick={() =>
                        setVisibleColumns(DEFAULT_COLUMNS)
                      }
                      className="text-xs text-primary hover:underline"
                    >
                      Reset tampilan
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => void refetch()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-muted-foreground hover:text-primary hover:bg-warning-bg border border-border transition-colors"
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          <label className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <input
              type="checkbox"
              className="accent-sky-600"
              checked={showOnlyUnsynced}
              onChange={(e) => setShowOnlyUnsynced(e.target.checked)}
            />
            Tampilkan yang belum sinkron saja
          </label>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(6)].map((_, idx) => (
              <Skeleton key={idx} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : pageError || usersError ? (
          <div className="p-8 text-center">
            <p className="text-sm font-semibold text-destructive">
              {pageError || usersError}
            </p>
          </div>
        ) : paginatedUsers.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">
            <Users2 size={42} className="mx-auto mb-3 opacity-40" />
            <p className="font-semibold">Tidak ada user ditemukan</p>
          </div>
        ) : (
          <>
            <div className="w-full">
              <Table className="w-full min-w-[980px]">
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-transparent border-b border-border">
                    {
                      visibleColumns.has("user") && (
                        <TableHead className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                          User
                        </TableHead>
                      )
                    }
                    {
                      visibleColumns.has("role") && (
                        <TableHead className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                          Role
                        </TableHead>
                      )
                    }
                    {
                      visibleColumns.has("status") && (
                        <TableHead className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                          Status
                        </TableHead>
                      )
                    }
                    {
                      visibleColumns.has("kartu") && (
                        <TableHead className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                          Kartu
                        </TableHead>
                      )
                    }
                    {
                      visibleColumns.has("terdaftar") && (
                        <TableHead className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                          Terdaftar
                        </TableHead>
                      )
                    }
                    {
                      visibleColumns.has("aksi") && (
                        <TableHead className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right whitespace-nowrap">
                          Aksi
                        </TableHead>
                      )
                    }
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedUsers.map((user) => (
                    <TableRow
                      key={user.id}
                      className="hover:bg-muted/40 transition-colors border-b border-border"
                    >
                      {visibleColumns.has("user") && (
                        <TableCell className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <Avatar className="size-9">
                              <AvatarImage
                                src={user.image || ""}
                                alt={user.name || "User"}
                              />
                              <AvatarFallback className="text-xs font-bold bg-muted text-muted-foreground">
                                {getFallbackInitials(user.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-semibold text-foreground leading-tight">
                                {user.name || "-"}
                              </p>
                              <p className="text-xs font-medium text-muted-foreground mt-0.5">
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                      )}
                      {visibleColumns.has("role") && (
                        <TableCell className="px-6 py-4 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              if (user.id !== currentUserId) {
                                openEditRoleModal(user);
                              }
                            }}
                            disabled={user.id === currentUserId}
                            className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold border transition-all ${roleBadgeClass(user.role)} ${
                              user.id !== currentUserId
                                ? "cursor-pointer hover:opacity-80 hover:shadow-xs"
                                : "cursor-default"
                            }`}
                            title={user.id !== currentUserId ? "Klik untuk ubah role" : undefined}
                          >
                            {user.role === "super_admin" ? (
                              <ShieldCheck size={12} className="mr-1.5" />
                            ) : null}
                            {user.role}
                          </button>
                        </TableCell>
                      )}
                      {visibleColumns.has("status") && (
                        <TableCell className="px-6 py-4 whitespace-nowrap">
                          {user.banned ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold border bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800">
                              <UserX size={12} className="mr-1.5" /> Banned
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold border bg-green-50 dark:bg-green-950/60 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800">
                              Aktif
                            </span>
                          )}
                        </TableCell>
                      )}
                      {visibleColumns.has("kartu") && (
                        <TableCell className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold border ${cardStatusClass(user.cardStatus)}`}
                            >
                              {cardStatusLabel(user.cardStatus)}
                            </span>
                            {user.cardNumber ? (
                              <span className="text-[11px] font-mono font-bold text-muted-foreground">
                                {user.cardNumber}
                              </span>
                            ) : null}
                            {user.hasSyncedMember && (
                              <span
                                className="inline-flex items-center text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full"
                                title="Tersinkronisasi dengan data anggota perpustakaan"
                              >
                                Synced
                              </span>
                            )}
                          </div>
                          {user.cardRejectedReason ? (
                            <p className="max-w-[220px] text-[11px] text-rose-600 truncate mt-1">
                              {user.cardRejectedReason}
                            </p>
                          ) : null}
                        </TableCell>
                      )}
                      {visibleColumns.has("terdaftar") && (
                        <TableCell className="px-6 py-4 text-xs font-medium text-muted-foreground whitespace-nowrap">
                          {user.createdAt
                            ? new Date(user.createdAt).toLocaleDateString("id-ID", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric"
                              })
                            : "-"}
                        </TableCell>
                      )}
                      {visibleColumns.has("aksi") && (
                        <TableCell className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                            {/* Catat Kunjungan */}
                            <button
                              type="button"
                              onClick={() => void handleRecordVisit(user)}
                              disabled={recordSavingId === user.id}
                              className="inline-flex size-8 items-center justify-center rounded-lg border bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors disabled:opacity-50 cursor-pointer"
                              title="Catat Kunjungan Hari Ini"
                              aria-label="Catat Kunjungan Hari Ini"
                            >
                              {recordSavingId === user.id ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <UserCheck className="size-4" />
                              )}
                            </button>

                            {/* Ubah Role */}
                            <button
                              type="button"
                              onClick={() => {
                                if (user.id !== currentUserId) {
                                  openEditRoleModal(user);
                                }
                              }}
                              disabled={user.id === currentUserId}
                              className="inline-flex size-8 items-center justify-center rounded-lg border bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                              title={
                                user.id === currentUserId
                                  ? "Tidak bisa mengubah role akun sendiri"
                                  : "Ubah Role Pengguna"
                              }
                              aria-label="Ubah Role Pengguna"
                            >
                              <UserCog className="size-4" />
                            </button>

                            {/* Ban / Unban */}
                            <button
                              type="button"
                              onClick={() => {
                                if (user.id !== currentUserId) {
                                  setBanModalUser(user);
                                  setBanReasonInput(user.banned ? "" : "Pelanggaran kebijakan sistem");
                                }
                              }}
                              disabled={
                                user.id === currentUserId || banSavingId === user.id
                              }
                              className={`inline-flex size-8 items-center justify-center rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                                user.banned
                                  ? "bg-green-50 dark:bg-green-950/60 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900"
                                  : "bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800 hover:bg-orange-100 dark:hover:bg-orange-900"
                              }`}
                              title={
                                user.id === currentUserId
                                  ? "Tidak bisa memblokir akun sendiri"
                                  : user.banned
                                    ? "Aktifkan User (Unban)"
                                    : "Blokir User (Ban)"
                              }
                              aria-label={user.banned ? "Unban User" : "Ban User"}
                            >
                              {banSavingId === user.id ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : user.banned ? (
                                <ShieldCheck className="size-4" />
                              ) : (
                                <UserX className="size-4" />
                              )}
                            </button>

                            {/* Sync Member (jika belum tersinkronisasi) */}
                            {!user.hasSyncedMember && (
                              <button
                                type="button"
                                onClick={() => void handleSyncMember(user)}
                                disabled={syncSavingId === user.id}
                                className="inline-flex size-8 items-center justify-center rounded-lg border bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-800 hover:bg-sky-100 dark:hover:bg-sky-900 transition-colors disabled:opacity-50 cursor-pointer"
                                title="Sinkronisasi ke Data Member"
                                aria-label="Sinkronisasi ke Data Member"
                              >
                                {syncSavingId === user.id ? (
                                  <Loader2 className="size-4 animate-spin" />
                                ) : (
                                  <Link className="size-4" />
                                )}
                              </button>
                            )}

                            {/* Terbitkan Kartu (jika sudah sync dan kartu belum aktif) */}
                            {user.hasSyncedMember && user.cardStatus !== "active" && (
                              <button
                                type="button"
                                onClick={() => void handleIssueCard(user)}
                                disabled={issueSavingId === user.id}
                                className="inline-flex size-8 items-center justify-center rounded-lg border bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors disabled:opacity-50 cursor-pointer"
                                title="Terbitkan Kartu Member"
                                aria-label="Terbitkan Kartu Member"
                              >
                                {issueSavingId === user.id ? (
                                  <Loader2 className="size-4 animate-spin" />
                                ) : (
                                  <CreditCard className="size-4" />
                                )}
                              </button>
                            )}

                            {/* Hapus User */}
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmUser(user)}
                              disabled={
                                user.id === currentUserId ||
                                deletingId === user.id ||
                                savingId === user.id ||
                                banSavingId === user.id
                              }
                              className="inline-flex size-8 items-center justify-center rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                              title={
                                user.id === currentUserId
                                  ? "Anda tidak bisa menghapus akun sendiri"
                                  : "Hapus user"
                              }
                              aria-label="Hapus User"
                            >
                              {deletingId === user.id ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <Trash2 className="size-4" />
                              )}
                            </button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-xs text-muted-foreground font-medium">
                  Menampilkan {Math.min((currentPage - 1) * itemsPerPage + 1, filteredUsers.length)}–
                  {Math.min(currentPage * itemsPerPage, filteredUsers.length)} dari {filteredUsers.length} user
                </p>
                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="flex items-center gap-1 px-3 py-2 text-sm font-bold text-muted-foreground hover:text-muted-foreground hover:bg-surface-hover rounded-xl transition-all disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <ChevronLeft size={16} /> Prev
                  </button>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                    .map((p, idx, arr) => {
                      const showDot = idx > 0 && arr[idx - 1] !== p - 1;
                      return (
                        <Fragment key={p}>
                          {showDot && <span className="px-2 text-muted-foreground">...</span>}
                          <button
                            onClick={() => setCurrentPage(p)}
                            className={`w-10 h-10 flex items-center justify-center rounded-xl text-sm font-bold transition-all ${
                              currentPage === p
                                ? "bg-primary text-white shadow-md shadow-red-500/20"
                                : "text-muted-foreground hover:bg-surface-hover hover:text-muted-foreground"
                            }`}
                          >
                            {p}
                          </button>
                        </Fragment>
                      );
                    })}

                  <button 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-1 px-3 py-2 text-sm font-bold text-muted-foreground hover:text-muted-foreground hover:bg-surface-hover rounded-xl transition-all disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <ImportUserModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          void refetch();
          success("Import Berhasil", "Data user telah diperbarui.");
        }}
      />

      <Modal
        isOpen={Boolean(deleteConfirmUser)}
        onClose={() => {
          if (!deletingId) setDeleteConfirmUser(null);
        }}
        title="Konfirmasi Hapus Pengguna"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-900 mt-0.5">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">
                Apakah Anda yakin ingin menghapus akun ini?
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Akun pengguna akan dinonaktifkan dan seluruh sesi login aktif akan dicabut dari sistem.
              </p>
            </div>
          </div>

          {deleteConfirmUser && (
            <div className="rounded-xl bg-muted/60 border border-border p-3.5 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Nama:</span>
                <span className="font-bold text-foreground">
                  {deleteConfirmUser.name || "Tanpa Nama"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Email:</span>
                <span className="font-mono text-foreground">
                  {deleteConfirmUser.email}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Role:</span>
                <span className="font-bold uppercase text-foreground">
                  {deleteConfirmUser.role}
                </span>
              </div>
              {deleteConfirmUser.cardNumber ? (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">No. Kartu:</span>
                  <span className="font-mono text-foreground">
                    {deleteConfirmUser.cardNumber}
                  </span>
                </div>
              ) : null}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setDeleteConfirmUser(null)}
              disabled={Boolean(deletingId)}
              className="h-9 rounded-lg border border-border px-4 text-sm font-medium text-muted-foreground hover:bg-muted"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => void handleDeleteUser()}
              disabled={Boolean(deletingId)}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-destructive px-4 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
            >
              {deletingId ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Menghapus...</span>
                </>
              ) : (
                <>
                  <Trash2 className="size-4" />
                  <span>Hapus Pengguna</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Ubah Role Modal */}
      <Modal
        isOpen={Boolean(editingRoleUser)}
        onClose={() => {
          if (!savingId) setEditingRoleUser(null);
        }}
        title="Ubah Role Pengguna"
        size="sm"
      >
        <div className="space-y-5">
          {/* User Summary Card */}
          <div className="flex items-center gap-3.5 p-3.5 bg-muted/40 rounded-xl border border-border">
            <Avatar className="size-11 shrink-0 border border-border">
              <AvatarImage
                src={editingRoleUser?.image || ""}
                alt={editingRoleUser?.name || "User"}
              />
              <AvatarFallback className="text-xs font-bold bg-muted text-muted-foreground">
                {getFallbackInitials(editingRoleUser?.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-foreground truncate">
                {editingRoleUser?.name || "Tanpa Nama"}
              </p>
              <p className="text-xs text-muted-foreground truncate font-mono">
                {editingRoleUser?.email}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] text-muted-foreground">Role Saat Ini:</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${roleBadgeClass(editingRoleUser?.role || "")}`}>
                  {editingRoleUser?.role}
                </span>
              </div>
            </div>
          </div>

          {/* Role Dropdown Selector Only */}
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">
              Pilih Role Pengguna
            </label>
            <Select
              value={selectedRole}
              onValueChange={(value) => setSelectedRole(value)}
              disabled={Boolean(savingId)}
            >
              <SelectTrigger className="w-full h-11 text-sm font-medium bg-background border border-border rounded-xl px-3.5 cursor-pointer focus:ring-2 focus:ring-primary/20">
                <SelectValue placeholder="-- Pilih role pengguna --" />
              </SelectTrigger>
              <SelectContent className="z-[10005]">
                {AVAILABLE_ROLES.map((r) => {
                  const IconComponent = r.icon;
                  return (
                    <SelectItem key={r.value} value={r.value} className="text-sm cursor-pointer py-2.5">
                      <div className="flex items-center gap-2.5">
                        <IconComponent className="size-4 text-primary shrink-0" />
                        <span className="font-bold text-foreground">{r.value}</span>
                        <span className="text-xs text-muted-foreground">({r.label})</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">
              Role menentukan hak akses pengguna terhadap peminjaman buku dan administrasi perpustakaan.
            </p>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
            <button
              type="button"
              onClick={() => setEditingRoleUser(null)}
              disabled={Boolean(savingId)}
              className="h-9 rounded-lg border border-border px-4 text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => {
                if (editingRoleUser) {
                  void handleUpdateRole(editingRoleUser, selectedRole);
                }
              }}
              disabled={
                Boolean(savingId) ||
                !selectedRole ||
                selectedRole === editingRoleUser?.role
              }
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-xs font-bold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer shadow-xs"
            >
              {savingId ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save className="size-4" />
                  <span>Simpan Perubahan</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Ban / Unban Confirmation Modal */}
      <Modal
        isOpen={Boolean(banModalUser)}
        onClose={() => {
          if (!banSavingId) setBanModalUser(null);
        }}
        title={
          banModalUser?.banned
            ? "Konfirmasi Aktifkan Pengguna (Unban)"
            : "Konfirmasi Pemblokiran Pengguna (Ban)"
        }
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3.5">
            <div
              className={`size-10 rounded-full flex items-center justify-center shrink-0 border mt-0.5 ${
                banModalUser?.banned
                  ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                  : "bg-orange-100 dark:bg-orange-950/80 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800"
              }`}
            >
              {banModalUser?.banned ? (
                <ShieldCheck className="size-5" />
              ) : (
                <UserX className="size-5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {banModalUser?.banned
                  ? `Aktifkan kembali akun ${banModalUser?.name || "pengguna"}?`
                  : `Apakah Anda yakin ingin memblokir ${banModalUser?.name || "pengguna"}?`}
              </p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {banModalUser?.banned
                  ? "Pengguna akan dapat kembali login ke sistem dan menggunakan seluruh fasilitas perpustakaan."
                  : "Pengguna yang diblokir tidak akan dapat login atau melakukan transaksi perpustakaan sampai statusnya diaktifkan kembali."}
              </p>
            </div>
          </div>

          {banModalUser && (
            <div className="rounded-xl bg-muted/60 border border-border p-3.5 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Nama:</span>
                <span className="font-bold text-foreground">
                  {banModalUser.name || "Tanpa Nama"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Email:</span>
                <span className="font-mono text-foreground">
                  {banModalUser.email}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Role:</span>
                <span className="font-bold uppercase text-foreground">
                  {banModalUser.role}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status Saat Ini:</span>
                <span
                  className={`font-bold ${
                    banModalUser.banned
                      ? "text-orange-600 dark:text-orange-400"
                      : "text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {banModalUser.banned ? "Diblokir (Banned)" : "Aktif"}
                </span>
              </div>
            </div>
          )}

          {!banModalUser?.banned && (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-muted-foreground uppercase">
                Alasan Pemblokiran (Opsional)
              </label>
              <textarea
                rows={2}
                value={banReasonInput}
                onChange={(e) => setBanReasonInput(e.target.value)}
                placeholder="Tulis alasan pemblokiran pengguna..."
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {BAN_PRESET_REASONS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setBanReasonInput(preset)}
                    className={`text-[10px] px-2 py-0.5 rounded-md border transition-colors cursor-pointer ${
                      banReasonInput === preset
                        ? "bg-orange-50 text-orange-700 border-orange-300 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800 font-bold"
                        : "bg-muted/60 text-muted-foreground border-border hover:bg-muted"
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
            <button
              type="button"
              onClick={() => setBanModalUser(null)}
              disabled={Boolean(banSavingId)}
              className="h-9 rounded-lg border border-border px-4 text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => void handleConfirmBanToggle()}
              disabled={Boolean(banSavingId)}
              className={`inline-flex h-9 items-center gap-2 rounded-lg px-4 text-xs font-bold text-white transition-colors cursor-pointer ${
                banModalUser?.banned
                  ? "bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
                  : "bg-orange-600 hover:bg-orange-700 disabled:opacity-50"
              }`}
            >
              {banSavingId ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : banModalUser?.banned ? (
                <>
                  <ShieldCheck className="size-4" />
                  <span>Aktifkan Pengguna</span>
                </>
              ) : (
                <>
                  <UserX className="size-4" />
                  <span>Blokir Pengguna</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ImportUserModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [result, setResult] = useState<{
    total: number;
    successCount: number;
    errorCount: number;
    errors: Array<{ row: number; errors: string[] }>;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);
    try {
      await importApi.downloadTemplate("users");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Gagal mengunduh template");
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setErrorMsg(null);
    setResult(null);

    try {
      const res = await importApi.uploadUsers(file);
      setResult(res.data);
      if (res.data.successCount > 0) {
        onSuccess();
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Import gagal");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setResult(null);
    setErrorMsg(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-card border border-border w-full max-w-[540px] rounded-[24px] overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-5 border-b border-border flex items-center justify-between">
          <h2 className="text-foreground text-[16px] font-bold">Import Data User CSV</h2>
          <button onClick={handleClose} className="text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/50 p-3 rounded-xl">
            <span>Gunakan format CSV dengan pemisah titik koma (;)</span>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              disabled={downloadingTemplate}
              className="text-primary hover:underline font-bold inline-flex items-center gap-1"
            >
              {downloadingTemplate ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
              Unduh Template
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {result && (
            <div className="p-4 bg-muted rounded-xl space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-foreground">
                <CheckCircle size={16} className="text-emerald-500" />
                <span>Hasil Import: {result.successCount} berhasil dari {result.total} baris</span>
              </div>
              {result.errorCount > 0 && (
                <div className="text-destructive space-y-1 max-h-32 overflow-y-auto">
                  <p className="font-semibold">{result.errorCount} baris bermasalah:</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {result.errors.slice(0, 5).map((e, idx) => (
                      <li key={idx}>Baris {e.row}: {e.errors.join(", ")}</li>
                    ))}
                    {result.errors.length > 5 && <li>...dan {result.errors.length - 5} baris lainnya</li>}
                  </ul>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1.5">Pilih File CSV User</label>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-muted-foreground file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary file:text-white hover:file:bg-primary/90 cursor-pointer"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-muted-foreground hover:bg-muted"
              >
                Tutup
              </button>
              <button
                type="submit"
                disabled={!file || loading}
                className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold shadow-md shadow-red-500/20 disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                Upload & Proses
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
