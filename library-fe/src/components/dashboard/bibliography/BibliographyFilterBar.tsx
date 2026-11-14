import { useState, useRef, useEffect } from "react";
import {
  Search,
  Loader2,
  Plus,
  X,
  Check,
  FileDown,
  Columns3,
  Layers,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Faculty, StudyProgram } from "@/api/client";

export interface ColumnDef {
  key: string;
  label: string;
}

export interface BibliographyFilterBarProps {
  dataTotal?: number;
  faculties: Faculty[];
  availableStudyPrograms: StudyProgram[];
  selectedFacultyId: string;
  selectedStudyProgramId: string;
  searchInput: string;
  searchTerm: string;
  visibleColumns: Set<string>;
  allColumns: ColumnDef[];
  defaultColumns: Set<string>;
  exporting: boolean;
  deduplicating: boolean;
  canAddBib: boolean;
  onFacultyChange: (val: string) => void;
  onStudyProgramChange: (val: string) => void;
  onSearchInputChange: (val: string) => void;
  onSearch: () => void;
  onClearSearch: () => void;
  onExport: () => void;
  onDeduplicate: () => void;
  onCreate: () => void;
  onToggleColumn: (key: string) => void;
  onSetVisibleColumns: (cols: Set<string>) => void;
}

export function BibliographyFilterBar({
  dataTotal,
  faculties,
  availableStudyPrograms,
  selectedFacultyId,
  selectedStudyProgramId,
  searchInput,
  searchTerm,
  visibleColumns,
  allColumns,
  defaultColumns,
  exporting,
  deduplicating,
  canAddBib,
  onFacultyChange,
  onStudyProgramChange,
  onSearchInputChange,
  onSearch,
  onClearSearch,
  onExport,
  onDeduplicate,
  onCreate,
  onToggleColumn,
  onSetVisibleColumns,
}: BibliographyFilterBarProps) {
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const columnPickerRef = useRef<HTMLDivElement>(null);

  // Close column picker on click outside
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      onSearch();
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Row 1: Title + Primary Actions */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">Bibliografi</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Kelola data bibliografi perpustakaan
            {dataTotal !== undefined && (
              <span className="ml-2 text-primary font-semibold">
                ({dataTotal} total)
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Column Picker */}
          <div className="relative" ref={columnPickerRef}>
            <button
              onClick={() => setShowColumnPicker((v) => !v)}
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-surface-hover"
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
                <div className="border-t border-border px-3 py-2 flex items-center justify-between">
                  <button
                    onClick={() =>
                      onSetVisibleColumns(new Set(allColumns.map((c) => c.key)))
                    }
                    className="text-xs text-primary hover:underline cursor-pointer"
                  >
                    Tampilkan semua
                  </button>
                  <button
                    onClick={() => onSetVisibleColumns(defaultColumns)}
                    className="text-xs text-muted-foreground hover:underline cursor-pointer"
                  >
                    Reset tampilan
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={onDeduplicate}
            disabled={deduplicating}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-surface-hover disabled:opacity-50"
            title="Gabungkan eksemplar dan bersihkan data bibliografi yang terduplikasi"
          >
            {deduplicating ? (
              <Loader2 className="size-4 animate-spin text-primary" />
            ) : (
              <Layers className="size-4 text-primary" />
            )}
            <span className="hidden sm:inline">Deduplikasi</span>
          </button>
          <button
            onClick={onExport}
            disabled={exporting}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-surface-hover disabled:opacity-50"
            title={
              selectedStudyProgramId
                ? "Export buku program studi terpilih"
                : selectedFacultyId
                ? "Export buku fakultas terpilih"
                : "Export semua buku"
            }
          >
            {exporting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FileDown className="size-4 text-primary" />
            )}
            <span className="hidden sm:inline">Export</span>
          </button>
          {canAddBib && (
            <button
              onClick={onCreate}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              <Plus className="size-4" />
              Tambah
            </button>
          )}
        </div>
      </div>

      {/* Header Row 2: Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={selectedFacultyId === "" ? "all" : selectedFacultyId}
          onValueChange={onFacultyChange}
        >
          <SelectTrigger className="w-[180px]" aria-label="Filter Fakultas">
            <SelectValue placeholder="Semua Fakultas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Fakultas</SelectItem>
            {faculties.map((f) => (
              <SelectItem key={f.id} value={String(f.id)}>
                {f.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedStudyProgramId === "" ? "all" : selectedStudyProgramId}
          onValueChange={onStudyProgramChange}
        >
          <SelectTrigger className="w-[200px]" aria-label="Filter Program Studi">
            <SelectValue placeholder="Semua Program Studi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Program Studi</SelectItem>
            {availableStudyPrograms.map((sp) => (
              <SelectItem key={sp.id} value={String(sp.id)}>
                {sp.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari bibliografi..."
            value={searchInput}
            onChange={(e) => onSearchInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full rounded-lg border border-border bg-card py-2 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <button
          onClick={onSearch}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
        >
          Cari
        </button>
        {(searchTerm || selectedFacultyId || selectedStudyProgramId) && (
          <button
            onClick={onClearSearch}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-surface-hover"
          >
            <X className="size-3.5" />
            Reset
          </button>
        )}
      </div>
    </div>
  );
}

export default BibliographyFilterBar;
