import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Info,
  Clock,
  RefreshCw,
  RotateCcw,
  Search,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  FileText
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

interface RiwayatPeminjamanProps {
  type: "active" | "history";
  view?: "grid" | "table";
}

const RiwayatPeminjaman = ({ type, view = "grid" }: RiwayatPeminjamanProps) => {
  const [loans, setLoans] = useState<LoanData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Table Controls (Anti-slop standard UX)
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
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
      const title = loan.item?.bibliography?.title?.toLowerCase() || "";
      const author = loan.item?.bibliography?.author?.toLowerCase() || "";
      const notes = loan.notes?.toLowerCase() || "";
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        title.includes(query) ||
        author.includes(query) ||
        notes.includes(query);

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

  if (loading) {
    return (
      <div className="py-16 text-center animate-pulse">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
        <p className="text-muted-foreground text-sm font-medium">Memuat data peminjaman...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center bg-accent rounded-2xl border border-primary p-6">
        <AlertCircle className="w-8 h-8 text-primary mx-auto mb-3" />
        <h3 className="text-primary font-bold mb-1">Terjadi Kesalahan</h3>
        <p className="text-primary/80 text-xs">{error}</p>
      </div>
    );
  }

  if (loans.length === 0) {
    return (
      <div className="py-16 text-center bg-slate-50/50 dark:bg-card/30 rounded-3xl border border-dashed border-border">
        <div className="w-14 h-14 bg-card rounded-2xl flex items-center justify-center text-muted-foreground mx-auto mb-3 shadow-sm border border-border">
          <Info size={22} />
        </div>
        <h3 className="text-foreground font-bold text-sm mb-1">Belum Ada Data</h3>
        <p className="text-muted-foreground text-xs">
          Belum ada data {type === "active" ? "peminjaman aktif" : "riwayat peminjaman"} yang tercatat.
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

  // History Loans - Shadcn Data Table
  const statusCounts = {
    all: loans.length,
    returned: loans.filter((l) => l.status === "returned").length,
    rejected: loans.filter((l) => l.status === "rejected").length
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Table Toolbar & Faceted Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground size-4" />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Cari judul, pengarang, atau catatan..."
            className="w-full pl-9 pr-4 py-2 bg-muted/50 border border-border rounded-xl text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>

        {/* Faceted Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => handleStatusFilterChange("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              statusFilter === "all"
                ? "bg-primary text-white shadow-xs"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            Semua ({statusCounts.all})
          </button>
          <button
            onClick={() => handleStatusFilterChange("returned")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              statusFilter === "returned"
                ? "bg-green-600 text-white shadow-xs"
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
                ? "bg-destructive text-white shadow-xs"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <XCircle size={12} />
            Ditolak ({statusCounts.rejected})
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[45%] text-[11px] font-bold text-muted-foreground uppercase tracking-wider pl-5 py-3.5">
                Buku & Pengarang
              </TableHead>
              <TableHead className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider py-3.5">
                Tanggal Pinjam
              </TableHead>
              <TableHead className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider py-3.5">
                Tanggal Kembali
              </TableHead>
              <TableHead className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider py-3.5 pr-5 text-right">
                Status
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedLoans.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-36 text-center text-muted-foreground text-xs font-medium">
                  {searchQuery || statusFilter !== "all"
                    ? "Tidak ada riwayat peminjaman yang cocok dengan filter."
                    : "Belum ada riwayat peminjaman."}
                </TableCell>
              </TableRow>
            ) : (
              paginatedLoans.map((loan) => {
                const bib = loan.item?.bibliography;
                const borrowDate = loan.loanDate ? new Date(loan.loanDate) : null;
                const returnDate = loan.returnDate ? new Date(loan.returnDate) : null;
                const isReturned = loan.status === "returned";

                return (
                  <TableRow key={loan.id} className="hover:bg-muted/40 transition-colors">
                    <TableCell className="pl-5 py-3.5 align-top">
                      <div className="font-bold text-foreground text-xs leading-snug line-clamp-2">
                        {bib?.title || "Judul tidak tersedia"}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 font-medium">
                        {bib?.author || "Penulis tidak tersedia"}
                      </div>
                      {loan.notes && (
                        <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-[10px] font-medium text-muted-foreground">
                          <FileText size={10} className="shrink-0" />
                          <span className="line-clamp-1">Catatan: {loan.notes}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="py-3.5 text-xs text-muted-foreground font-medium align-top">
                      {borrowDate
                        ? borrowDate.toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric"
                          })
                        : "-"}
                    </TableCell>
                    <TableCell className="py-3.5 text-xs text-muted-foreground font-medium align-top">
                      {returnDate
                        ? returnDate.toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric"
                          })
                        : "-"}
                    </TableCell>
                    <TableCell className="py-3.5 pr-5 align-top text-right">
                      <Badge
                        variant="secondary"
                        className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 ${
                          isReturned
                            ? "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800"
                            : "bg-red-50 dark:bg-red-950 text-destructive border border-red-200 dark:border-red-800"
                        }`}
                      >
                        {isReturned ? "Dikembalikan" : "Dibatalkan"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2 pt-1 text-xs text-muted-foreground">
          <span>
            Menampilkan {(currentPage - 1) * itemsPerPage + 1} -{" "}
            {Math.min(currentPage * itemsPerPage, filteredLoans.length)} dari{" "}
            {filteredLoans.length} data
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="font-bold px-2 text-foreground">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
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
  const [isReturning, setIsReturning] = useState(false);
  const [isExtending, setIsExtending] = useState(false);
  const toast = useToast();

  const handleReturn = async () => {
    if (
      !confirm(
        `Ajukan pengembalian untuk buku "${bibliography?.title || "ini"}"?`
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
        `Ajukan perpanjangan untuk buku "${bibliography?.title || "ini"}"?`
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
    <div className="bg-card border border-border rounded-2xl p-4 shadow-xs flex gap-4 transition-all">
      <div className="w-20 h-28 bg-muted rounded-xl shrink-0 overflow-hidden flex items-center justify-center border border-border">
        {bibliography?.image ? (
          <img
            src={bibliography.image}
            alt={bibliography.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-slate-800 flex items-center justify-center p-2 text-center">
            <span className="text-white text-[9px] font-bold line-clamp-3">
              {bibliography?.title || "Buku"}
            </span>
          </div>
        )}
      </div>
      <div className="flex-1 flex flex-col justify-between py-1 min-w-0">
        <div>
          <h4 className="font-bold text-foreground text-sm mb-1 line-clamp-2 leading-tight">
            {bibliography?.title || "Unknown Title"}
          </h4>
          <p className="text-[11px] font-medium text-muted-foreground mb-1.5 truncate">
            {bibliography?.author || "Unknown Author"}
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
                  ? "text-primary"
                  : isWarning
                  ? "text-orange-500"
                  : "text-muted-foreground"
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
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg mb-2">
              <Clock size={11} className="text-yellow-600 dark:text-yellow-400 shrink-0" />
              <span className="text-[10px] font-bold text-yellow-700 dark:text-yellow-400">
                Menunggu Konfirmasi Admin
              </span>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-2">
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
                "Kembalikan"
              )}
            </button>
          ) : (
            <div className="px-3 py-1.5 bg-yellow-50 dark:bg-yellow-950 text-yellow-600 dark:text-yellow-400 text-[10px] font-bold uppercase tracking-wider rounded-lg flex items-center gap-1">
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
                  <RotateCcw size={10} className="animate-spin" /> Memproses...
                </>
              ) : (
                "Perpanjang"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RiwayatPeminjaman;
