import { useEffect, useMemo, useState, Fragment, useRef } from "react";
import {
  Search,
  RefreshCw,
  Users2,
  ShieldCheck,
  UserX,
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
  MoreHorizontal,
  CreditCard
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Modal from "@/components/ui/modal";
import { authClient } from "@/utils/auth-client";
import { useToast } from "@/hooks/useToast";
import { useUsersManagement } from "@/hooks/dashboard/useUsersManagement";
import { usersManagementService } from "@/services/dashboard/usersManagementService";
import { dashboardDataService } from "@/services/dashboard/dashboardDataService";
import { exportApi, importApi } from "@/api/client";

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

  const handleRoleChange = async (user: (typeof users)[number], nextRole: string) => {
    if (!nextRole || nextRole === user.role) return;

    if (user.id === currentUserId) {
      warning(
        "Tidak Diizinkan",
        "Anda tidak dapat mengubah role akun sendiri."
      );
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

  const handleToggleBan = async (user: (typeof users)[number]) => {
    const nextBanned = !user.banned;
    let banReason: string | undefined;

    if (nextBanned) {
      const reason = window.prompt(
        "Alasan ban user (opsional):",
        "Pelanggaran kebijakan sistem"
      );
      if (reason === null) return;
      banReason = reason.trim() || undefined;
    }

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
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold border ${roleBadgeClass(user.role)}`}
                          >
                            {user.role === "super_admin" ? (
                              <ShieldCheck size={12} className="mr-1.5" />
                            ) : null}
                            {user.role}
                          </span>
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
                          <div className="inline-flex items-center justify-end gap-2 whitespace-nowrap">
                            {/* Role Selector with auto-save */}
                            <Select
                              value={user.role}
                              onValueChange={(value) => void handleRoleChange(user, value)}
                              disabled={user.id === currentUserId || savingId === user.id}
                            >
                              <SelectTrigger className="w-[115px] h-8 text-xs font-semibold bg-background hover:bg-muted/50 transition-colors cursor-pointer">
                                {savingId === user.id ? (
                                  <span className="flex items-center gap-1.5 text-muted-foreground">
                                    <Loader2 size={12} className="animate-spin" />
                                    <span>Simpan...</span>
                                  </span>
                                ) : (
                                  <SelectValue />
                                )}
                              </SelectTrigger>
                              <SelectContent align="end">
                                <SelectItem value="student" className="text-xs cursor-pointer">student</SelectItem>
                                <SelectItem value="lecturer" className="text-xs cursor-pointer">lecturer</SelectItem>
                                <SelectItem value="staff" className="text-xs cursor-pointer">staff</SelectItem>
                                <SelectItem value="super_admin" className="text-xs cursor-pointer">super_admin</SelectItem>
                              </SelectContent>
                            </Select>

                            {/* Dropdown Menu for Secondary & Administrative Actions */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  className="size-8 inline-flex items-center justify-center rounded-lg border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                  title="Aksi Lainnya"
                                >
                                  <MoreHorizontal size={15} />
                                  <span className="sr-only">Menu aksi user</span>
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-52">
                                <DropdownMenuLabel className="text-[11px] font-semibold text-muted-foreground tracking-wider uppercase">
                                  Operasional
                                </DropdownMenuLabel>
                                <DropdownMenuItem
                                  onClick={() => void handleRecordVisit(user)}
                                  disabled={recordSavingId === user.id}
                                  className="cursor-pointer text-xs flex items-center gap-2"
                                >
                                  <UserCheck size={14} className="text-emerald-600 dark:text-emerald-400" />
                                  <span>{recordSavingId === user.id ? "Mencatat..." : "Catat Kunjungan"}</span>
                                </DropdownMenuItem>

                                {!user.hasSyncedMember ? (
                                  <DropdownMenuItem
                                    onClick={() => void handleSyncMember(user)}
                                    disabled={syncSavingId === user.id}
                                    className="cursor-pointer text-xs flex items-center gap-2"
                                  >
                                    <RefreshCw size={14} className={`text-sky-600 dark:text-sky-400 ${syncSavingId === user.id ? "animate-spin" : ""}`} />
                                    <span>{syncSavingId === user.id ? "Menyinkronkan..." : "Sinkronisasi Member"}</span>
                                  </DropdownMenuItem>
                                ) : user.cardStatus !== "active" ? (
                                  <DropdownMenuItem
                                    onClick={() => void handleIssueCard(user)}
                                    disabled={issueSavingId === user.id}
                                    className="cursor-pointer text-xs flex items-center gap-2"
                                  >
                                    <CreditCard size={14} className="text-blue-600 dark:text-blue-400" />
                                    <span>{issueSavingId === user.id ? "Menerbitkan..." : "Terbitkan Kartu"}</span>
                                  </DropdownMenuItem>
                                ) : null}

                                <DropdownMenuSeparator />

                                <DropdownMenuLabel className="text-[11px] font-semibold text-muted-foreground tracking-wider uppercase">
                                  Akses & Keamanan
                                </DropdownMenuLabel>
                                <DropdownMenuItem
                                  onClick={() => void handleToggleBan(user)}
                                  disabled={user.id === currentUserId || banSavingId === user.id}
                                  className={`cursor-pointer text-xs flex items-center gap-2 ${
                                    user.banned ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                                  }`}
                                >
                                  {user.banned ? (
                                    <>
                                      <UserCheck size={14} />
                                      <span>{banSavingId === user.id ? "Memproses..." : "Buka Blokir (Unban)"}</span>
                                    </>
                                  ) : (
                                    <>
                                      <UserX size={14} />
                                      <span>{banSavingId === user.id ? "Memproses..." : "Blokir User (Ban)"}</span>
                                    </>
                                  )}
                                </DropdownMenuItem>

                                <DropdownMenuSeparator />

                                <DropdownMenuItem
                                  onClick={() => setDeleteConfirmUser(user)}
                                  disabled={user.id === currentUserId || deletingId === user.id}
                                  className="cursor-pointer text-xs flex items-center gap-2 text-rose-600 dark:text-rose-400 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/50"
                                >
                                  <Trash2 size={14} />
                                  <span>Hapus Akun</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
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
