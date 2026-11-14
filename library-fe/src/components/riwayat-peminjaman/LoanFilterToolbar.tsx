import React, { useState } from "react";
import {
  CheckCircle2,
  Filter,
  LayoutGrid,
  Search,
  Table as TableIcon,
  X,
  XCircle,
} from "lucide-react";

export interface LoanFilterToolbarProps {
  searchQuery: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearSearch: () => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  statusCounts: {
    all: number;
    returned: number;
    rejected: number;
  };
  displayMode: "auto" | "table" | "cards";
  onDisplayModeChange: (mode: "auto" | "table" | "cards") => void;
}

export function LoanFilterToolbar({
  searchQuery,
  onSearchChange,
  onClearSearch,
  statusFilter,
  onStatusFilterChange,
  statusCounts,
  displayMode,
  onDisplayModeChange,
}: LoanFilterToolbarProps) {
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  return (
    <div className="bg-card p-3 sm:p-4 rounded-2xl border border-border shadow-2xs space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground size-4" />
          <input
            type="text"
            value={searchQuery}
            onChange={onSearchChange}
            placeholder="Cari judul, pengarang, nomor item..."
            className="w-full pl-9 pr-9 py-2 bg-muted/40 border border-border rounded-xl text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
          {searchQuery && (
            <button
              onClick={onClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-md cursor-pointer"
              title="Hapus pencarian"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Mobile Filter Button */}
        <button
          type="button"
          onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
          className={`sm:hidden inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all shrink-0 cursor-pointer ${
            statusFilter !== "all" || isMobileFilterOpen
              ? "bg-primary text-primary-foreground border-primary shadow-2xs"
              : "bg-muted/60 text-muted-foreground border-border hover:text-foreground"
          }`}
        >
          <Filter size={13} />
          <span>Filter</span>
          {statusFilter !== "all" && (
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          )}
        </button>

        {/* Desktop Filter Chips */}
        <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            onClick={() => onStatusFilterChange("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              statusFilter === "all"
                ? "bg-primary text-white shadow-2xs"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            Semua ({statusCounts.all})
          </button>
          <button
            onClick={() => onStatusFilterChange("returned")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
              statusFilter === "returned"
                ? "bg-emerald-600 text-white shadow-2xs"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <CheckCircle2 size={12} />
            Dikembalikan ({statusCounts.returned})
          </button>
          <button
            onClick={() => onStatusFilterChange("rejected")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
              statusFilter === "rejected"
                ? "bg-destructive text-white shadow-2xs"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <XCircle size={12} />
            Ditolak ({statusCounts.rejected})
          </button>
        </div>

        {/* Desktop Layout Switcher (Table vs Card view) */}
        <div className="hidden lg:flex items-center gap-1 border-l border-border pl-2">
          <button
            onClick={() => onDisplayModeChange("table")}
            className={`p-1.5 rounded-lg text-xs transition-all cursor-pointer ${
              displayMode === "table" || displayMode === "auto"
                ? "bg-muted text-foreground font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Tampilan Tabel"
          >
            <TableIcon size={15} />
          </button>
          <button
            onClick={() => onDisplayModeChange("cards")}
            className={`p-1.5 rounded-lg text-xs transition-all cursor-pointer ${
              displayMode === "cards"
                ? "bg-muted text-foreground font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Tampilan Kartu"
          >
            <LayoutGrid size={15} />
          </button>
        </div>
      </div>

      {/* Mobile Filter Options */}
      {isMobileFilterOpen && (
        <div className="sm:hidden pt-2.5 border-t border-border/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar animate-fade-in">
          <button
            onClick={() => onStatusFilterChange("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
              statusFilter === "all"
                ? "bg-primary text-white shadow-2xs"
                : "bg-muted/60 text-muted-foreground hover:bg-muted"
            }`}
          >
            Semua ({statusCounts.all})
          </button>
          <button
            onClick={() => onStatusFilterChange("returned")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 transition-all cursor-pointer ${
              statusFilter === "returned"
                ? "bg-emerald-600 text-white shadow-2xs"
                : "bg-muted/60 text-muted-foreground hover:bg-muted"
            }`}
          >
            <CheckCircle2 size={12} />
            Dikembalikan ({statusCounts.returned})
          </button>
          <button
            onClick={() => onStatusFilterChange("rejected")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 transition-all cursor-pointer ${
              statusFilter === "rejected"
                ? "bg-destructive text-white shadow-2xs"
                : "bg-muted/60 text-muted-foreground hover:bg-muted"
            }`}
          >
            <XCircle size={12} />
            Ditolak ({statusCounts.rejected})
          </button>
        </div>
      )}
    </div>
  );
}

export default LoanFilterToolbar;
