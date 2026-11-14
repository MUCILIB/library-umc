import { useState, useRef, useEffect } from "react";
import {
  Search,
  RefreshCw,
  Download,
  Upload,
  Loader2,
  Columns3,
  Check,
  UserPlus,
} from "lucide-react";

export interface ColumnDef {
  key: string;
  label: string;
}

export interface UserFilterBarProps {
  stats: {
    total: number;
    admins: number;
    staffs: number;
    banned: number;
  };
  search: string;
  onSearchChange: (val: string) => void;
  showOnlyUnsynced: boolean;
  onShowOnlyUnsyncedChange: (checked: boolean) => void;
  visibleColumns: Set<string>;
  allColumns: ColumnDef[];
  onToggleColumn: (key: string) => void;
  onResetColumns: () => void;
  canAddUsers: boolean;
  exportingUsers: boolean;
  onOpenCreateModal: () => void;
  onOpenImportModal: () => void;
  onExportUsers: () => void;
  onRefresh: () => void;
}

export function UserFilterBar({
  stats,
  search,
  onSearchChange,
  showOnlyUnsynced,
  onShowOnlyUnsyncedChange,
  visibleColumns,
  allColumns,
  onToggleColumn,
  onResetColumns,
  canAddUsers,
  exportingUsers,
  onOpenCreateModal,
  onOpenImportModal,
  onExportUsers,
  onRefresh,
}: UserFilterBarProps) {
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const columnPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        columnPickerRef.current &&
        !columnPickerRef.current.contains(event.target as Node)
      ) {
        setShowColumnPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="space-y-6">
      {/* Title & Top Action Buttons */}
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
          {canAddUsers && (
            <>
              <button
                onClick={onOpenCreateModal}
                className="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-full text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-red-500/20 transition-all cursor-pointer"
                title="Tambah akun pengguna baru secara manual"
              >
                <UserPlus size={16} strokeWidth={2.5} />
                Tambah Pengguna
              </button>

              <button
                onClick={onOpenImportModal}
                className="bg-card hover:bg-muted text-foreground border border-border px-5 py-2.5 rounded-full text-sm font-bold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                title="Import user dari file CSV"
              >
                <Upload size={16} strokeWidth={2.5} />
                Import User CSV
              </button>
            </>
          )}

          <button
            onClick={onExportUsers}
            disabled={exportingUsers}
            className="bg-card hover:bg-muted text-foreground border border-border px-5 py-2.5 rounded-full text-sm font-bold flex items-center justify-center gap-2 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            title="Export data user ke CSV"
          >
            {exportingUsers ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Download size={16} strokeWidth={2.5} />
            )}
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats Cards */}
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

      {/* Search, Filter & Column Toggle Bar */}
      <div className="p-6 border-b border-border flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-[360px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
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
                {visibleColumns.size}/{allColumns.length}
              </span>
            </button>
            {showColumnPicker && (
              <div className="absolute right-0 top-full z-50 mt-1 w-52 rounded-xl border border-border bg-card shadow-lg">
                <div className="border-b border-border px-3 py-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Tampilkan Kolom
                  </p>
                </div>
                <div className="p-2 space-y-0.5">
                  {allColumns.map((col) => {
                    const isChecked = visibleColumns.has(col.key);
                    const isDisabled = isChecked && visibleColumns.size === 1;
                    return (
                      <button
                        key={col.key}
                        onClick={() => onToggleColumn(col.key)}
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
                    onClick={onResetColumns}
                    className="text-xs text-primary hover:underline"
                  >
                    Reset tampilan
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={onRefresh}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-muted-foreground hover:text-primary hover:bg-warning-bg border border-border transition-colors cursor-pointer"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        <label className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <input
            type="checkbox"
            className="accent-sky-600"
            checked={showOnlyUnsynced}
            onChange={(e) => onShowOnlyUnsyncedChange(e.target.checked)}
          />
          Tampilkan yang belum sinkron saja
        </label>
      </div>
    </div>
  );
}

export default UserFilterBar;
