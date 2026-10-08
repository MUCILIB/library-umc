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
  Check
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
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
  const [search, setSearch] = useState("");
  const [recordSavingId, setRecordSavingId] = useState<string | null>(null);
  const [showOnlyUnsynced, setShowOnlyUnsynced] = useState(false);
  const [roleDraft, setRoleDraft] = useState<Record<string, string>>({});
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

  const handleUpdateRole = async (user: (typeof users)[number]) => {
    const nextRole = roleDraft[user.id] || user.role;
    if (!nextRole || nextRole === user.role) {
      warning(
        "Tidak Ada Perubahan",
        "Role yang dipilih sama dengan role saat ini."
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

  return (
    <div className="space-y-6 overflow-x-hidden">
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

      <div className="bg-card rounded-[24px] border border-border shadow-sm overflow-hidden">
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
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    {
                      visibleColumns.has("user") && (
                        <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                          User
                        </th>
                      )
                    }
                    {
                      visibleColumns.has("role") && (
                        <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                          Role
                        </th>
                      )
                    }
                    {
                      visibleColumns.has("status") && (
                        <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                          Status
                        </th>
                      )
                    }
                    {
                      visibleColumns.has("kartu") && (
                        <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                          Kartu
                        </th>
                      )
                    }
                    {
                      visibleColumns.has("terdaftar") && (
                        <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                          Terdaftar
                        </th>
                      )
                    }
                    {
                      visibleColumns.has("aksi") && (
                        <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-widest text-right">
                          Aksi
                        </th>
                      )
                    }
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {paginatedUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="hover:bg-surface-hover/40 transition-colors"
                    >
                      {visibleColumns.has("user") && (
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-muted overflow-hidden flex items-center justify-center text-muted-foreground text-xs font-bold">
                              {user.image ? (
                                <img
                                  src={user.image}
                                  alt={user.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                user.name?.charAt(0)?.toUpperCase() || "U"
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-foreground">
                                {user.name || "-"}
                              </p>
                              <p className="text-xs font-medium text-muted-foreground">
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </td>
                      )}
                      {visibleColumns.has("role") && (
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold border ${roleBadgeClass(user.role)}`}
                          >
                            {user.role === "super_admin" ? (
                              <ShieldCheck size={12} className="mr-1.5" />
                            ) : null}
                            {user.role}
                          </span>
                        </td>
                      )}
                      {visibleColumns.has("status") && (
                        <td className="px-6 py-4">
                          {user.banned ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold border bg-orange-50 text-orange-700 border-orange-200">
                              <UserX size={12} className="mr-1.5" /> Banned
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold border bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800">
                              Aktif
                            </span>
                          )}
                        </td>
                      )}
                      {visibleColumns.has("kartu") && (
                        <td className="px-6 py-4 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
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
                            <p className="max-w-[220px] text-[11px] text-rose-600">
                              {user.cardRejectedReason}
                            </p>
                          ) : null}
                        </td>
                      )}
                      {visibleColumns.has("terdaftar") && (
                        <td className="px-6 py-4 text-sm font-medium text-muted-foreground">
                          {user.createdAt
                            ? new Date(user.createdAt).toLocaleDateString("id-ID", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric"
                              })
                            : "-"}
                        </td>
                      )}
                      {visibleColumns.has("aksi") && (
                        <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => void handleRecordVisit(user)}
                            disabled={recordSavingId === user.id}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border-emerald-200 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                            title="Catat Kunjungan Hari Ini"
                          >
                            <UserCheck size={12} />
                            {recordSavingId === user.id ? "..." : "Catat Kunjungan"}
                          </button>

                          <Select
                            value={roleDraft[user.id] || user.role}
                            onValueChange={(value) =>
                              setRoleDraft((prev) => ({
                                ...prev,
                                [user.id]: value
                              }))
                            }
                            disabled={
                              user.id === currentUserId || savingId === user.id
                            }
                          >
                            <SelectTrigger className="w-[120px] h-8 text-xs font-bold">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="student">student</SelectItem>
                              <SelectItem value="lecturer">lecturer</SelectItem>
                              <SelectItem value="staff">staff</SelectItem>
                              <SelectItem value="super_admin">super_admin</SelectItem>
                            </SelectContent>
                          </Select>

                          <button
                            onClick={() => void handleUpdateRole(user)}
                            disabled={
                              user.id === currentUserId ||
                              savingId === user.id ||
                              (roleDraft[user.id] || user.role) === user.role
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-primary text-white hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground"
                          >
                            <Save size={12} />
                            {savingId === user.id ? "Menyimpan..." : "Simpan"}
                          </button>

                          <button
                            onClick={() => void handleToggleBan(user)}
                            disabled={
                              user.id === currentUserId || banSavingId === user.id
                            }
                            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border transition-colors disabled:bg-muted disabled:text-muted-foreground disabled:border-border ${
                              user.banned
                                ? "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800 hover:bg-green-100 dark:bg-green-900"
                                : "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100 dark:bg-orange-900"
                            }`}
                          >
                            <UserX size={12} />
                            {banSavingId === user.id
                              ? "Memproses..."
                              : user.banned
                                ? "Unban"
                                : "Ban"}
                          </button>

                          {!user.hasSyncedMember ? (
                            <button
                              onClick={() => void handleSyncMember(user)}
                              disabled={syncSavingId === user.id}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100 transition-colors disabled:bg-muted disabled:text-muted-foreground disabled:border-border"
                            >
                              <Link size={12} />
                              {syncSavingId === user.id
                                ? "Sync..."
                                : "Sync Member"}
                            </button>
                          ) : (
                            <>
                              <span className="inline-flex items-center px-3 py-2 rounded-lg text-xs font-bold bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800">
                                Sudah Sync
                              </span>
                              {user.cardStatus !== "active" ? (
                                <button
                                  onClick={() => void handleIssueCard(user)}
                                  disabled={issueSavingId === user.id}
                                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-primary text-white hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground"
                                >
                                  <ShieldCheck size={12} />
                                  {issueSavingId === user.id
                                    ? "Menerbitkan..."
                                    : "Terbitkan Kartu"}
                                </button>
                              ) : null}
                            </>
                          )}
                        </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
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
