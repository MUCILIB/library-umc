import {
  Book,
  Eye,
  Package,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TablePagination } from "@/components/common/TablePagination";
import { cleanIsbn } from "@/utils/format";
import type { Bibliography, BibliographyListResponse } from "@/api/client";

export interface BibliographyTableProps {
  data: BibliographyListResponse | null;
  searchTerm: string;
  visibleColumns: Set<string>;
  canAddItems: boolean;
  canEditBib: boolean;
  canDeleteBib: boolean;
  onViewItems?: (bib: Bibliography) => void;
  onQuickAddItem: (bib: Bibliography) => void;
  onOpenDetail: (id: string) => void;
  onEditBib: (bib: Bibliography) => void;
  onDeleteBib: (bib: Bibliography) => void;
  onPageChange: (page: number) => void;
}

export function BibliographyTable({
  data,
  searchTerm,
  visibleColumns,
  canAddItems,
  canEditBib,
  canDeleteBib,
  onViewItems,
  onQuickAddItem,
  onOpenDetail,
  onEditBib,
  onDeleteBib,
  onPageChange,
}: BibliographyTableProps) {
  if (!data || data.items.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-12 text-center">
        <Book className="mx-auto mb-4 size-12 text-muted-foreground" />
        <h3 className="text-lg font-semibold text-muted-foreground">
          {searchTerm ? "Tidak ada hasil" : "Belum ada bibliografi"}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {searchTerm
            ? `Tidak ditemukan bibliografi untuk "${searchTerm}"`
            : "Bibliografi akan muncul di sini setelah ditambahkan"}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <Table className="w-full text-sm min-w-[850px]">
        <TableHeader>
          <TableRow className="border-b border-border bg-muted/50 hover:bg-transparent">
            <TableHead className="px-4 py-3.5 font-bold text-xs uppercase tracking-wider text-muted-foreground">
              Judul
            </TableHead>
            {visibleColumns.has("fakultasProdi") && (
              <TableHead className="px-4 py-3.5 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                Fakultas & Prodi
              </TableHead>
            )}
            {visibleColumns.has("penulis") && (
              <TableHead className="px-4 py-3.5 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                Penulis
              </TableHead>
            )}
            {visibleColumns.has("penerbit") && (
              <TableHead className="px-4 py-3.5 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                Penerbit
              </TableHead>
            )}
            {visibleColumns.has("tahun") && (
              <TableHead className="px-4 py-3.5 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                Tahun
              </TableHead>
            )}
            {visibleColumns.has("isbn") && (
              <TableHead className="px-4 py-3.5 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                ISBN / ISSN
              </TableHead>
            )}
            {visibleColumns.has("stok") && (
              <TableHead className="px-4 py-3.5 text-center font-bold text-xs uppercase tracking-wider text-muted-foreground">
                Stok
              </TableHead>
            )}
            <TableHead className="px-4 py-3.5 text-center font-bold text-xs uppercase tracking-wider text-muted-foreground">
              Aksi
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.items.map((bib) => (
            <TableRow
              key={bib.id}
              className="border-b border-border hover:bg-muted/40 transition-colors"
            >
              <TableCell className="px-4 py-3.5">
                <div className="max-w-xs truncate font-medium text-foreground">
                  {bib.title}
                </div>
              </TableCell>
              {visibleColumns.has("fakultasProdi") && (
                <TableCell className="px-4 py-3.5">
                  <div className="max-w-[200px] space-y-1">
                    {bib.faculties && bib.faculties.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {bib.faculties.map((f: any) => (
                          <span
                            key={f.id}
                            className="inline-flex items-center rounded-md bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60"
                          >
                            {f.name}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {bib.studyPrograms && bib.studyPrograms.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {bib.studyPrograms.map((sp: any) => (
                          <span
                            key={sp.id}
                            className="inline-flex items-center rounded-md bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60"
                          >
                            {sp.name}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {(!bib.faculties || bib.faculties.length === 0) &&
                      (!bib.studyPrograms || bib.studyPrograms.length === 0) && (
                        <span className="text-xs text-muted-foreground/70 italic">
                          -
                        </span>
                      )}
                  </div>
                </TableCell>
              )}
              {visibleColumns.has("penulis") && (
                <TableCell className="px-4 py-3.5">
                  <div className="max-w-[200px] truncate text-muted-foreground">
                    {bib.authors?.map((a) => a.name).join(", ") || "-"}
                    {bib.unlistedAuthorsLabel && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        +{bib.unlistedAuthorsLabel}
                      </span>
                    )}
                  </div>
                </TableCell>
              )}
              {visibleColumns.has("penerbit") && (
                <TableCell className="px-4 py-3.5 text-muted-foreground">
                  {bib.publisher?.name || "-"}
                </TableCell>
              )}
              {visibleColumns.has("tahun") && (
                <TableCell className="px-4 py-3.5 text-muted-foreground">
                  {bib.publishYear || "-"}
                </TableCell>
              )}
              {visibleColumns.has("isbn") && (
                <TableCell className="px-4 py-3.5 text-muted-foreground text-xs font-mono">
                  {bib.isbn && bib.issn ? (
                    <div className="space-y-0.5">
                      <div>
                        <span className="text-[10px] text-muted-foreground/70 font-sans">
                          ISBN:{" "}
                        </span>
                        {cleanIsbn(bib.isbn)}
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground/70 font-sans">
                          ISSN:{" "}
                        </span>
                        {bib.issn}
                      </div>
                    </div>
                  ) : bib.isbn ? (
                    cleanIsbn(bib.isbn)
                  ) : bib.issn ? (
                    <span>
                      <span className="text-[10px] text-muted-foreground/70 font-sans">
                        ISSN:{" "}
                      </span>
                      {bib.issn}
                    </span>
                  ) : (
                    cleanIsbn(bib.isbnIssn) || "-"
                  )}
                </TableCell>
              )}
              {visibleColumns.has("stok") && (
                <TableCell className="px-4 py-3.5 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onViewItems) onViewItems(bib);
                      }}
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
                        onViewItems
                          ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900 cursor-pointer"
                          : "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400"
                      }`}
                      title={onViewItems ? "Lihat eksemplar buku ini" : undefined}
                    >
                      <Package className="size-3" />
                      {bib.availableItems}/{bib.totalItems}
                    </button>
                    {canAddItems && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onQuickAddItem(bib);
                        }}
                        className="inline-flex items-center justify-center size-5 rounded-full border border-emerald-300 dark:border-emerald-800 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900 transition-colors cursor-pointer"
                        title="Tambah eksemplar fisik buku ini"
                        aria-label={`Tambah eksemplar fisik untuk ${bib.title}`}
                      >
                        <Plus className="size-3" />
                      </button>
                    )}
                  </div>
                </TableCell>
              )}
              <TableCell className="px-4 py-3.5 text-center">
                <div className="flex items-center justify-center gap-1">
                  {canAddItems && (
                    <button
                      onClick={() => onQuickAddItem(bib)}
                      className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50 dark:bg-emerald-950/60 hover:text-emerald-700 transition-colors cursor-pointer"
                      title="Tambah eksemplar fisik"
                      aria-label={`Tambah eksemplar untuk ${bib.title}`}
                    >
                      <Plus className="size-4" />
                    </button>
                  )}
                  {onViewItems && (
                    <button
                      onClick={() => onViewItems(bib)}
                      className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50 dark:bg-emerald-950/60 hover:text-emerald-700 transition-colors cursor-pointer"
                      title="Lihat eksemplar"
                    >
                      <Package className="size-4" />
                    </button>
                  )}
                  <button
                    onClick={() => onOpenDetail(bib.id)}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-muted-foreground transition-colors cursor-pointer"
                    title="Lihat detail"
                  >
                    <Eye className="size-4" />
                  </button>
                  {canEditBib && (
                    <button
                      onClick={() => onEditBib(bib)}
                      className="rounded-lg p-1.5 text-blue-500 hover:bg-blue-50 dark:bg-blue-950/60 hover:text-blue-600 dark:text-blue-400 transition-colors cursor-pointer"
                      title="Edit"
                    >
                      <Pencil className="size-4" />
                    </button>
                  )}
                  {canDeleteBib && (
                    <button
                      onClick={() => onDeleteBib(bib)}
                      className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/60 hover:text-rose-700 dark:text-rose-400 transition-colors cursor-pointer"
                      title="Hapus Bibliografi"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Pagination */}
      <TablePagination
        currentPage={data.page}
        totalPages={data.totalPages}
        totalItems={data.total}
        itemsPerPage={data.limit || 10}
        onPageChange={onPageChange}
        label="bibliografi"
      />
    </div>
  );
}

export default BibliographyTable;
