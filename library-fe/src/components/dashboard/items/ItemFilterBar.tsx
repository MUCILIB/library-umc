import { RotateCcw, Search } from "lucide-react";
import type { Location } from "@/api/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface ItemFilterBarProps {
  searchInput: string;
  onSearchInputChange: (val: string) => void;
  onSearch: () => void;
  statusFilter: string;
  onStatusFilterChange: (val: string) => void;
  locationFilter: string;
  onLocationFilterChange: (val: string) => void;
  locations: Location[];
  sortBy: string;
  sortOrder: "asc" | "desc";
  onSortChange: (sortBy: string, sortOrder: "asc" | "desc") => void;
  onReset: () => void;
  isFiltered: boolean;
}

export function ItemFilterBar({
  searchInput,
  onSearchInputChange,
  onSearch,
  statusFilter,
  onStatusFilterChange,
  locationFilter,
  onLocationFilterChange,
  locations,
  sortBy,
  sortOrder,
  onSortChange,
  onReset,
  isFiltered,
}: ItemFilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-border bg-card p-3">
      <div className="relative flex-1 min-w-[200px] sm:min-w-[260px]">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Cari item..."
          value={searchInput}
          onChange={(e) => onSearchInputChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSearch()}
          className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="w-[140px] sm:w-[160px]">
        <Select
          value={statusFilter}
          onValueChange={onStatusFilterChange}
        >
          <SelectTrigger className="h-9 w-full text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="available">Tersedia</SelectItem>
            <SelectItem value="loaned">Dipinjam</SelectItem>
            <SelectItem value="damaged">Rusak</SelectItem>
            <SelectItem value="lost">Hilang</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="w-[150px] sm:w-[180px]">
        <Select
          value={locationFilter}
          onValueChange={onLocationFilterChange}
        >
          <SelectTrigger className="h-9 w-full text-xs">
            <SelectValue placeholder="Lokasi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Lokasi</SelectItem>
            {locations.map((loc) => (
              <SelectItem key={loc.id} value={String(loc.id)}>
                {loc.room} {loc.rack ? `- Rak ${loc.rack}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="w-[160px] sm:w-[185px]">
        <Select
          value={`${sortBy}-${sortOrder}`}
          onValueChange={(val) => {
            const [sb, so] = val.split("-") as [string, "asc" | "desc"];
            onSortChange(sb, so);
          }}
        >
          <SelectTrigger className="h-9 w-full text-xs">
            <SelectValue placeholder="Urutan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="itemCode-asc">Kode Item (1, 2, 3...)</SelectItem>
            <SelectItem value="itemCode-desc">Kode Item (3, 2, 1...)</SelectItem>
            <SelectItem value="createdAt-desc">Terbaru Ditambahkan</SelectItem>
            <SelectItem value="createdAt-asc">Terlama Ditambahkan</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <button
        type="button"
        onClick={onSearch}
        className="rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-white hover:bg-primary/90 transition-colors cursor-pointer"
      >
        Cari
      </button>

      {isFiltered && (
        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          title="Reset filter"
        >
          <RotateCcw className="size-3.5" />
          Reset
        </button>
      )}
    </div>
  );
}

export default ItemFilterBar;
