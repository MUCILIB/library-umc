import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Clock,
  RefreshCw,
  RotateCcw,
  Search,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  FileText,
  Calendar,
  Eye,
  BookOpen,
  X,
  LayoutGrid,
  Table as TableIcon,
  Tag,
  MapPin,
  Barcode
} from "lucide-react";
import loanService, { type Loan as LoanData } from "@/services/loanService";
import { useToast } from "@/hooks/useToast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface RiwayatPeminjamanProps {
  type: "active" | "history";
  view?: "grid" | "table";
}

// Helper format date
function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  } catch {
    return "-";
  }
}

// Helper get loan title
function getLoanTitle(loan: LoanData): string {
  return (
    loan.item?.bibliography?.title ||
    loan.bibliographyTitle ||
    (loan as unknown as { title?: string }).title ||
    "Judul tidak tersedia"
  );
}

// Helper get loan author
function getLoanAuthor(loan: LoanData): string {
  const bib = loan.item?.bibliography;
  if (bib?.author) return bib.author;
  if (Array.isArray(bib?.authors) && bib.authors.length > 0) {
    return bib.authors
      .map((a: unknown) =>
        typeof a === "string" ? a : (a as { name?: string })?.name
      )
      .filter(Boolean)
      .join(", ");
  }
  if (
    Array.isArray(bib?.bibliographyAuthors) &&
    bib.bibliographyAuthors.length > 0
  ) {
    return bib.bibliographyAuthors
      .map((ba: unknown) => (ba as { author?: { name?: string } })?.author?.name)
      .filter(Boolean)
      .join(", ");
  }
  if (bib?.sor) return bib.sor;
  if (loan.bibliographyAuthor) return loan.bibliographyAuthor;
  return "Penulis tidak tersedia";
}

const RiwayatPeminjaman = ({
  type,
  view = "grid"
}: RiwayatPeminjamanProps) => {
  const [loans, setLoans] = useState<LoanData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Table & View Controls
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLoan, setSelectedLoan] = useState<LoanData | null>(null);
  const [displayMode, setDisplayMode] = useState<"auto" | "table" | "cards">("auto");
  const itemsPerPage = 8;

  const fetchLoans = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await loanService.getMyLoanHistory();

      if (type === "active") {
        setLoans(
          data.filter((l) =>
            ["pending", "approved", "extended"].includes(l.status)
          )
        );
      } else {
        setLoans(
          data.filter((l) => ["returned", "rejected"].includes(l.status))
        );
      }
    } catch (err) {
      console.error("Fetch loans error:", err);
      setError(
        err instanceof Error ? err.message : "Gagal memuat riwayat peminjaman"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoans();
  }, [type]);

  // Faceted Filtering & Search
  const filteredLoans = useMemo(() => {
    return loans.filter((loan) => {
      const title = getLoanTitle(loan).toLowerCase();
      const author = getLoanAuthor(loan).toLowerCase();
      const notes = (loan.notes || "").toLowerCase();
      const itemCode = (
        loan.item?.itemCode ||
        loan.item?.barcode ||
        loan.item?.uniqueCode ||
        ""
      ).toLowerCase();
      const query = searchQuery.trim().toLowerCase();

      const matchesSearch =
        !query ||
        title.includes(query) ||
        author.includes(query) ||
        notes.includes(query) ||
        itemCode.includes(query);

      const matchesStatus =
        statusFilter === "all" || loan.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [loans, searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredLoans.length / itemsPerPage));
  const paginatedLoans = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLoans.slice(start, start + itemsPerPage);
  }, [filteredLoans, currentPage, itemsPerPage]);

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <div className="py-20 text-center animate-pulse">
        <div className="inline-block animate-spin rounded-full h-9 w-9 border-b-2 border-primary mb-4"></div>
        <p className="text-muted-foreground text-sm font-medium">
          Memuat data peminjaman...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center bg-accent/50 rounded-2xl border border-destructive/30 p-6">
        <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-3" />
        <h3 className="text-foreground font-bold mb-1">Terjadi Kesalahan</h3>
        <p className="text-muted-foreground text-xs mb-4">{error}</p>
        <button
          onClick={fetchLoans}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-all"
        >
          <RefreshCw size={13} />
          Coba Lagi
        </button>
      </div>
    );
  }

  if (loans.length === 0) {
    return (
      <div className="py-16 text-center bg-card rounded-3xl border border-dashed border-border shadow-2xs">
        <div className="w-16 h-16 bg-muted/60 rounded-2xl flex items-center justify-center text-muted-foreground mx-auto mb-3 border border-border">
          <BookOpen size={24} />
        </div>
        <h3 className="text-foreground font-bold text-base mb-1">
          Belum Ada {type === "active" ? "Peminjaman Aktif" : "Riwayat Peminjaman"}
        </h3>
        <p className="text-muted-foreground text-xs max-w-sm mx-auto px-4">
          {type === "active"
            ? "Buku yang sedang Anda pinjam akan muncul di sini bersama batas waktu pengembaliannya."
            : "Buku yang telah Anda kembalikan atau transaksi yang selesai akan tersimpan di sini."}
        </p>
      </div>
    );
  }

  // Active Loans - Card View
  if (view === "grid") {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
          {loans.map((loan) => (
            <ActiveLoanCard key={loan.id} loan={loan} onRefresh={fetchLoans} />
          ))}
        </div>
      </div>
    );
  }

  // History Loans - Counts for Filters
  const statusCounts = {
    all: loans.length,
    returned: loans.filter((l) => l.status === "returned").length,
    rejected: loans.filter((l) => l.status === "rejected").length
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Table Toolbar & Faceted Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 sm:p-4 rounded-2xl border border-border shadow-2xs">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground size-4" />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Cari judul, pengarang, nomor item..."
            className="w-full pl-9 pr-9 py-2 bg-muted/40 border border-border rounded-xl text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
          {searchQuery && (
            <button
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-md"
              title="Hapus pencarian"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Faceted Status Filters & Layout Toggle */}
        <div className="flex items-center justify-between sm:justify-end gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <button
              onClick={() => handleStatusFilterChange("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                statusFilter === "all"
                  ? "bg-primary text-white shadow-2xs"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              Semua ({statusCounts.all})
            </button>
            <button
              onClick={() => handleStatusFilterChange("returned")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                statusFilter === "returned"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <CheckCircle2 size={12} />
              Dikembalikan ({statusCounts.returned})
            </button>
            <button
              onClick={() => handleStatusFilterChange("rejected")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
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
              onClick={() => setDisplayMode("table")}
              className={`p-1.5 rounded-lg text-xs transition-all ${
                displayMode === "table" || displayMode === "auto"
                  ? "bg-muted text-foreground font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Tampilan Tabel"
            >
              <TableIcon size={15} />
            </button>
            <button
              onClick={() => setDisplayMode("cards")}
              className={`p-1.5 rounded-lg text-xs transition-all ${
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
      </div>

      {/* Empty Filter State */}
      {paginatedLoans.length === 0 ? (
        <div className="py-14 text-center bg-card rounded-2xl border border-dashed border-border p-6 shadow-2xs">
          <div className="w-12 h-12 bg-muted/60 rounded-xl flex items-center justify-center text-muted-foreground mx-auto mb-3">
            <Search size={20} />
          </div>
          <h4 className="text-foreground font-bold text-sm mb-1">
            Tidak Ditemukan
          </h4>
          <p className="text-muted-foreground text-xs max-w-xs mx-auto mb-4">
            Tidak ada riwayat peminjaman yang cocok dengan kata kunci atau filter status terpilih.
          </p>
          {(searchQuery || statusFilter !== "all") && (
            <button
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
                setCurrentPage(1);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-muted text-foreground hover:bg-muted/80 text-xs font-bold transition-all"
            >
              Reset Filter
            </button>
          )}
        </div>
      ) : (
        <>
          {/* 1. Desktop & Tablet Table (Auto Mode: >= md, or explicitly set to table) */}
          <div
            className={`rounded-2xl border border-border bg-card overflow-hidden shadow-2xs ${
              displayMode === "cards"
                ? "hidden"
                : displayMode === "table"
                ? "block"
                : "hidden md:block"
            }`}
          >
            <Table className="w-full">
              <TableHeader className="bg-muted/40">
                <TableRow className="hover:bg-transparent border-b border-border">
                  <TableHead className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider pl-5 py-3.5 w-[42%]">
                    Buku & Pengarang
                  </TableHead>
                  <TableHead className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider py-3.5 w-[20%]">
                    Tanggal Pinjam
                  </TableHead>
                  <TableHead className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider py-3.5 w-[20%]">
                    Tanggal Kembali
                  </TableHead>
                  <TableHead className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider py-3.5 w-[12%] text-center">
                    Status
                  </TableHead>
                  <TableHead className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider py-3.5 pr-5 text-right w-[6%]">
                    Aksi
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLoans.map((loan) => {
                  const bib = loan.item?.bibliography;
                  const title = getLoanTitle(loan);
                  const author = getLoanAuthor(loan);
                  const isReturned = loan.status === "returned";
                  const itemCode =
                    loan.item?.itemCode ||
                    loan.item?.barcode ||
                    loan.item?.uniqueCode;

                  return (
                    <TableRow
                      key={loan.id}
                      onClick={() => setSelectedLoan(loan)}
                      className="hover:bg-muted/30 transition-colors cursor-pointer group"
                    >
                      {/* Buku & Pengarang */}
                      <TableCell className="pl-5 py-3.5 align-middle whitespace-normal">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-14 bg-muted rounded-lg shrink-0 overflow-hidden flex items-center justify-center border border-border shadow-2xs">
                            {bib?.image ? (
                              <img
                                src={bib.image}
                                alt={title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-slate-800 flex items-center justify-center p-1 text-center">
                                <BookOpen size={14} className="text-slate-300" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-foreground text-xs leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                              {title}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1 font-medium">
                              {author}
                            </p>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                              {itemCode && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono text-muted-foreground">
                                  <Barcode size={10} className="shrink-0" />
                                  {itemCode}
                                </span>
                              )}
                              {loan.notes && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted text-[10px] font-medium text-muted-foreground line-clamp-1">
                                  <FileText size={10} className="shrink-0" />
                                  Catatan: {loan.notes}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Tanggal Pinjam */}
                      <TableCell className="py-3.5 text-xs text-muted-foreground font-medium align-middle whitespace-normal">
                        <div className="inline-flex items-center gap-1.5">
                          <Calendar size={13} className="text-muted-foreground/70 shrink-0" />
                          <span>{formatDate(loan.loanDate || loan.createdAt)}</span>
                        </div>
                      </TableCell>

                      {/* Tanggal Kembali */}
                      <TableCell className="py-3.5 text-xs text-muted-foreground font-medium align-middle whitespace-normal">
                        <div className="inline-flex items-center gap-1.5">
                          <RotateCcw size={13} className="text-muted-foreground/70 shrink-0" />
                          <span>{formatDate(loan.returnDate || loan.dueDate)}</span>
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="py-3.5 align-middle text-center whitespace-normal">
                        <Badge
                          variant="secondary"
                          className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 inline-flex items-center gap-1 ${
                            isReturned
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800"
                              : "bg-destructive/10 text-destructive border-destructive/20 dark:bg-destructive/20 dark:text-destructive"
                          }`}
                        >
                          {isReturned ? (
                            <>
                              <CheckCircle2 size={11} className="shrink-0" />
                              <span>Dikembalikan</span>
                            </>
                          ) : (
                            <>
                              <XCircle size={11} className="shrink-0" />
                              <span>Ditolak</span>
                            </>
                          )}
                        </Badge>
                      </TableCell>

                      {/* Aksi */}
                      <TableCell className="py-3.5 pr-5 align-middle text-right whitespace-normal">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLoan(loan);
                          }}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                          title="Lihat Detail Riwayat"
                        >
                          <Eye size={15} />
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* 2. Mobile Responsive Card List (Auto Mode: < md, or explicitly set to cards) */}
          <div
            className={`space-y-3 ${
              displayMode === "table"
                ? "hidden"
                : displayMode === "cards"
                ? "block"
                : "block md:hidden"
            }`}
          >
            {paginatedLoans.map((loan) => {
              const bib = loan.item?.bibliography;
              const title = getLoanTitle(loan);
              const author = getLoanAuthor(loan);
              const isReturned = loan.status === "returned";
              const itemCode =
                loan.item?.itemCode ||
                loan.item?.barcode ||
                loan.item?.uniqueCode;

              return (
                <div
                  key={loan.id}
                  onClick={() => setSelectedLoan(loan)}
                  className="bg-card border border-border rounded-2xl p-4 shadow-2xs hover:border-primary/30 transition-all cursor-pointer space-y-3"
                >
                  {/* Top Row: Status badge & Item code */}
                  <div className="flex items-center justify-between gap-2">
                    <Badge
                      variant="secondary"
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 inline-flex items-center gap-1 ${
                        isReturned
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800"
                          : "bg-destructive/10 text-destructive border-destructive/20 dark:bg-destructive/20 dark:text-destructive"
                      }`}
                    >
                      {isReturned ? (
                        <>
                          <CheckCircle2 size={11} className="shrink-0" />
                          <span>Dikembalikan</span>
                        </>
                      ) : (
                        <>
                          <XCircle size={11} className="shrink-0" />
                          <span>Ditolak</span>
                        </>
                      )}
                    </Badge>

                    {itemCode && (
                      <span className="text-[10px] font-mono text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md">
                        {itemCode}
                      </span>
                    )}
                  </div>

                  {/* Middle Row: Cover & Book Info */}
                  <div className="flex items-start gap-3">
                    <div className="w-14 h-20 bg-muted rounded-xl shrink-0 overflow-hidden flex items-center justify-center border border-border shadow-2xs">
                      {bib?.image ? (
                        <img
                          src={bib.image}
                          alt={title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-slate-800 flex items-center justify-center p-1 text-center">
                          <BookOpen size={16} className="text-slate-300" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-foreground text-sm leading-snug line-clamp-2">
                        {title}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {author}
                      </p>
                      {loan.notes && (
                        <p className="text-[10px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md mt-1.5 line-clamp-1 inline-block">
                          Catatan: {loan.notes}
                        </p>
                      )}
                      {loan.rejectReason && (
                        <p className="text-[10px] text-destructive bg-destructive/10 border border-destructive/20 px-2 py-0.5 rounded-md mt-1.5 line-clamp-2">
                          Alasan: {loan.rejectReason}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Bottom Row: Dates in Structured 2-Column Box (Zero Horizontal Scroll!) */}
                  <div className="grid grid-cols-2 gap-2 bg-muted/30 border border-border/60 rounded-xl p-2.5 text-xs">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                        <Calendar size={11} className="text-muted-foreground/80" />
                        Tgl Pinjam
                      </span>
                      <p className="font-bold text-foreground text-[11px]">
                        {formatDate(loan.loanDate || loan.createdAt)}
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                        <RotateCcw size={11} className="text-muted-foreground/80" />
                        Tgl Kembali
                      </span>
                      <p className="font-bold text-foreground text-[11px]">
                        {formatDate(loan.returnDate || loan.dueDate)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Responsive Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2 pt-2 text-xs text-muted-foreground">
          <span className="order-2 sm:order-1 font-medium">
            Menampilkan{" "}
            <span className="font-bold text-foreground">
              {(currentPage - 1) * itemsPerPage + 1}
            </span>{" "}
            -{" "}
            <span className="font-bold text-foreground">
              {Math.min(currentPage * itemsPerPage, filteredLoans.length)}
            </span>{" "}
            dari{" "}
            <span className="font-bold text-foreground">
              {filteredLoans.length}
            </span>{" "}
            data
          </span>
          <div className="flex items-center gap-1.5 order-1 sm:order-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-xl border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              title="Halaman Sebelumnya"
            >
              <ChevronLeft size={15} />
            </button>
            <span className="font-bold px-3 py-1 rounded-xl bg-muted/50 text-foreground text-xs">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-xl border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              title="Halaman Berikutnya"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Loan History Detail Dialog */}
      {selectedLoan && (
        <Dialog
          open={Boolean(selectedLoan)}
          onOpenChange={(open) => !open && setSelectedLoan(null)}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <BookOpen size={18} className="text-primary" />
                Detail Riwayat Peminjaman
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Informasi lengkap transaksi peminjaman buku.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Book Info Card */}
              <div className="flex gap-3.5 bg-muted/30 p-3 rounded-2xl border border-border">
                <div className="w-14 h-20 bg-muted rounded-xl shrink-0 overflow-hidden flex items-center justify-center border border-border shadow-2xs">
                  {selectedLoan.item?.bibliography?.image ? (
                    <img
                      src={selectedLoan.item.bibliography.image}
                      alt={getLoanTitle(selectedLoan)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-800 flex items-center justify-center p-1 text-center">
                      <BookOpen size={16} className="text-slate-300" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <Badge
                    variant="secondary"
                    className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 mb-1 inline-flex items-center gap-1 ${
                      selectedLoan.status === "returned"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400"
                        : "bg-destructive/10 text-destructive border-destructive/20"
                    }`}
                  >
                    {selectedLoan.status === "returned" ? (
                      <>
                        <CheckCircle2 size={10} />
                        Dikembalikan
                      </>
                    ) : (
                      <>
                        <XCircle size={10} />
                        Ditolak
                      </>
                    )}
                  </Badge>
                  <h4 className="font-bold text-foreground text-sm leading-snug line-clamp-2">
                    {getLoanTitle(selectedLoan)}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {getLoanAuthor(selectedLoan)}
                  </p>
                </div>
              </div>

              {/* Transaction Metadata Grid */}
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="bg-card border border-border p-2.5 rounded-xl">
                  <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                    <Calendar size={11} /> Tanggal Pinjam
                  </span>
                  <p className="font-bold text-foreground mt-0.5">
                    {formatDate(selectedLoan.loanDate || selectedLoan.createdAt)}
                  </p>
                </div>

                <div className="bg-card border border-border p-2.5 rounded-xl">
                  <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                    <RotateCcw size={11} /> Tanggal Kembali
                  </span>
                  <p className="font-bold text-foreground mt-0.5">
                    {formatDate(selectedLoan.returnDate || selectedLoan.dueDate)}
                  </p>
                </div>

                {(selectedLoan.item?.itemCode ||
                  selectedLoan.item?.barcode ||
                  selectedLoan.item?.uniqueCode) && (
                  <div className="bg-card border border-border p-2.5 rounded-xl">
                    <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                      <Barcode size={11} /> Kode Eksemplar
                    </span>
                    <p className="font-bold font-mono text-foreground mt-0.5">
                      {selectedLoan.item.itemCode ||
                        selectedLoan.item.barcode ||
                        selectedLoan.item.uniqueCode}
                    </p>
                  </div>
                )}

                {selectedLoan.item?.location && (
                  <div className="bg-card border border-border p-2.5 rounded-xl">
                    <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                      <MapPin size={11} /> Lokasi Rak
                    </span>
                    <p className="font-bold text-foreground mt-0.5">
                      {selectedLoan.item.location.room
                        ? `${selectedLoan.item.location.room} / ${selectedLoan.item.location.rack || "-"}`
                        : "-"}
                    </p>
                  </div>
                )}
              </div>

              {/* Reject Reason Callout (if rejected) */}
              {selectedLoan.rejectReason && (
                <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-xl text-xs space-y-1">
                  <span className="text-[10px] font-bold text-destructive uppercase tracking-wider flex items-center gap-1">
                    <AlertCircle size={12} /> Alasan Penolakan
                  </span>
                  <p className="text-foreground font-medium">
                    {selectedLoan.rejectReason}
                  </p>
                </div>
              )}

              {/* Notes Callout */}
              {selectedLoan.notes && (
                <div className="bg-muted/40 border border-border p-3 rounded-xl text-xs space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Tag size={12} /> Catatan Peminjaman
                  </span>
                  <p className="text-foreground font-medium">
                    {selectedLoan.notes}
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                className="w-full rounded-xl text-xs font-bold"
                onClick={() => setSelectedLoan(null)}
              >
                Tutup
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

const ActiveLoanCard = ({
  loan,
  onRefresh
}: {
  loan: LoanData;
  onRefresh: () => void;
}) => {
  const bibliography = loan.item?.bibliography;
  const title = getLoanTitle(loan);
  const author = getLoanAuthor(loan);
  const [isReturning, setIsReturning] = useState(false);
  const [isExtending, setIsExtending] = useState(false);
  const toast = useToast();

  const handleReturn = async () => {
    if (
      !confirm(
        `Ajukan pengembalian untuk buku "${title}"?`
      )
    )
      return;

    try {
      setIsReturning(true);
      await loanService.createReturnRequest(loan.id);
      toast.success(
        "Berhasil",
        "Pengajuan pengembalian berhasil dikirim. Menunggu konfirmasi admin."
      );
      onRefresh();
    } catch (err) {
      toast.error(
        "Gagal",
        err instanceof Error ? err.message : "Gagal mengajukan pengembalian"
      );
    } finally {
      setIsReturning(false);
    }
  };

  const handleExtend = async () => {
    if (
      !confirm(
        `Ajukan perpanjangan untuk buku "${title}"?`
      )
    )
      return;

    try {
      setIsExtending(true);
      await loanService.extendLoan(loan.id);
      toast.success("Berhasil", "Pengajuan perpanjangan berhasil dikirim.");
      onRefresh();
    } catch (err) {
      toast.error(
        "Gagal",
        err instanceof Error ? err.message : "Gagal memperpanjang peminjaman"
      );
    } finally {
      setIsExtending(false);
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = loan.dueDate ? new Date(loan.dueDate) : null;
  if (dueDate) dueDate.setHours(0, 0, 0, 0);

  const daysLeft = dueDate
    ? Math.round(
        (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      )
    : null;

  const isLate = daysLeft !== null && daysLeft < 0;
  const isWarning = daysLeft !== null && daysLeft >= 0 && daysLeft <= 2;

  const formattedDate = dueDate
    ? dueDate.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric"
      })
    : "-";

  const returnPending = loan.returnRequests?.some(
    (r) => r.status === "pending"
  );

  return (
    <div className="bg-card border border-border rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row gap-3.5 sm:gap-4 transition-all hover:border-primary/20">
      <div className="w-16 h-24 sm:w-20 sm:h-28 bg-muted rounded-xl shrink-0 overflow-hidden flex items-center justify-center border border-border">
        {bibliography?.image ? (
          <img
            src={bibliography.image}
            alt={title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-slate-800 flex items-center justify-center p-2 text-center">
            <span className="text-white text-[9px] font-bold line-clamp-3">
              {title}
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col justify-between py-0.5 min-w-0">
        <div>
          <h4 className="font-bold text-foreground text-sm mb-1 line-clamp-2 leading-tight">
            {title}
          </h4>
          <p className="text-[11px] font-medium text-muted-foreground mb-1.5 truncate">
            {author}
          </p>

          {/* Catatan Peminjaman */}
          {loan.notes && (
            <p className="text-[10px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded mb-2 line-clamp-1 font-medium">
              Catatan: {loan.notes}
            </p>
          )}

          {/* Status jatuh tempo */}
          {daysLeft !== null && (
            <p
              className={`text-[10px] font-bold mb-2 ${
                isLate
                  ? "text-primary font-black"
                  : isWarning
                  ? "text-orange-500 font-bold"
                  : "text-muted-foreground font-medium"
              }`}
            >
              {isLate
                ? `Terlambat ${Math.abs(daysLeft)} hari`
                : daysLeft === 0
                ? "Jatuh tempo hari ini"
                : `Jatuh Tempo: ${formattedDate}`}
            </p>
          )}

          {/* Indikator menunggu konfirmasi admin */}
          {returnPending && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 rounded-lg mb-2">
              <Clock size={11} className="text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400">
                Menunggu Konfirmasi Admin
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 mt-2 pt-2 border-t border-border/50">
          {!returnPending ? (
            <button
              onClick={handleReturn}
              disabled={isReturning || isExtending}
              className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              {isReturning ? (
                <>
                  <RefreshCw size={10} className="animate-spin" /> Memproses...
                </>
              ) : (
                <>
                  <RotateCcw size={10} />
                  Kembalikan
                </>
              )}
            </button>
          ) : (
            <div className="px-3 py-1.5 bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase tracking-wider rounded-lg flex items-center gap-1">
              <Clock size={10} /> Diajukan
            </div>
          )}

          {loan.status !== "extended" && !isLate && (
            <button
              onClick={handleExtend}
              disabled={isExtending || isReturning || returnPending}
              className="px-3 py-1.5 bg-accent text-primary text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-accent/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              {isExtending ? (
                <>
                  <RefreshCw size={10} className="animate-spin" /> Memproses...
                </>
              ) : (
                <>
                  <RefreshCw size={10} />
                  Perpanjang
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RiwayatPeminjaman;
