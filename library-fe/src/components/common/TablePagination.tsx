import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  itemsPerPage?: number;
  onPageChange: (page: number) => void;
  label?: string;
  className?: string;
}

export const TablePagination: React.FC<TablePaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  label = "data",
  className = "",
}) => {
  const safeTotalPages = Math.max(1, totalPages || 1);
  const safeCurrentPage = Math.min(Math.max(1, currentPage || 1), safeTotalPages);

  // Compute item range description
  let rangeText = `Halaman ${safeCurrentPage} dari ${safeTotalPages}`;
  if (typeof totalItems === "number" && totalItems > 0 && typeof itemsPerPage === "number" && itemsPerPage > 0) {
    const start = (safeCurrentPage - 1) * itemsPerPage + 1;
    const end = Math.min(safeCurrentPage * itemsPerPage, totalItems);
    rangeText = `Menampilkan ${start}-${end} dari ${totalItems} ${label}`;
  } else if (typeof totalItems === "number") {
    rangeText = `Menampilkan ${totalItems} ${label} (Halaman ${safeCurrentPage} dari ${safeTotalPages})`;
  }

  // Generate page numbers with ellipses
  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    if (safeTotalPages <= 7) {
      for (let i = 1; i <= safeTotalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (safeCurrentPage > 3) {
        pages.push("ellipsis");
      }
      const start = Math.max(2, safeCurrentPage - 1);
      const end = Math.min(safeTotalPages - 1, safeCurrentPage + 1);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      if (safeCurrentPage < safeTotalPages - 2) {
        pages.push("ellipsis");
      }
      pages.push(safeTotalPages);
    }
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div
      className={`p-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 ${className}`}
    >
      <p className="text-xs text-muted-foreground font-medium">
        {rangeText}
      </p>

      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(1, safeCurrentPage - 1))}
          disabled={safeCurrentPage <= 1}
          className="h-8 px-2.5 text-xs gap-1"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sebelumnya</span>
        </Button>

        <div className="flex items-center gap-1">
          {pageNumbers.map((p, idx) => {
            if (p === "ellipsis") {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="w-8 h-8 flex items-center justify-center text-xs text-muted-foreground"
                >
                  ...
                </span>
              );
            }
            const isActive = p === safeCurrentPage;
            return (
              <Button
                key={p}
                type="button"
                variant={isActive ? "default" : "ghost"}
                size="sm"
                onClick={() => onPageChange(p)}
                className={`w-8 h-8 p-0 text-xs font-semibold ${
                  isActive
                    ? "pointer-events-none"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p}
              </Button>
            );
          })}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(safeTotalPages, safeCurrentPage + 1))}
          disabled={safeCurrentPage >= safeTotalPages}
          className="h-8 px-2.5 text-xs gap-1"
        >
          <span className="hidden sm:inline">Berikutnya</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
};
