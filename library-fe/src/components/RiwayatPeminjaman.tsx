import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
} from "lucide-react";
import loanService, { type Loan as LoanData } from "@/services/loanService";
import { useToast } from "@/hooks/useToast";
import Modal from "@/components/ui/modal";
import { getLoanTitle, getLoanAuthor } from "./riwayat-peminjaman/helpers";
import { ActiveLoanCard } from "./riwayat-peminjaman/ActiveLoanCard";
import { LoanDetailDialog } from "./riwayat-peminjaman/LoanDetailDialog";
import { ReturnModalContent } from "./riwayat-peminjaman/ReturnModalContent";
import { ExtendModalContent } from "./riwayat-peminjaman/ExtendModalContent";
import { LoanFilterToolbar } from "./riwayat-peminjaman/LoanFilterToolbar";
import { LoanHistoryTable } from "./riwayat-peminjaman/LoanHistoryTable";
import { LoanHistoryCards } from "./riwayat-peminjaman/LoanHistoryCards";

export interface RiwayatPeminjamanProps {
  type: "active" | "history";
  view?: "grid" | "table";
}

export default function RiwayatPeminjaman({
  type,
  view = "grid",
}: RiwayatPeminjamanProps) {
  const [loans, setLoans] = useState<LoanData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Table & View Controls
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLoan, setSelectedLoan] = useState<LoanData | null>(null);
  const [returnModalLoan, setReturnModalLoan] = useState<LoanData | null>(null);
  const [extendModalLoan, setExtendModalLoan] = useState<LoanData | null>(null);
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);
  const [isSubmittingExtend, setIsSubmittingExtend] = useState(false);
  const [displayMode, setDisplayMode] = useState<"auto" | "table" | "cards">("auto");
  const itemsPerPage = 8;

  const toast = useToast();

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

  const handleConfirmReturn = async () => {
    if (!returnModalLoan) return;
    try {
      setIsSubmittingReturn(true);
      const res = await loanService.createReturnRequest(returnModalLoan.id);
      toast.success(
        "Pengajuan Berhasil",
        res.message || "Pengajuan pengembalian berhasil dikirim. Menunggu konfirmasi admin."
      );
      setReturnModalLoan(null);
      fetchLoans();
    } catch (err) {
      toast.error(
        "Gagal",
        err instanceof Error ? err.message : "Gagal mengajukan pengembalian"
      );
    } finally {
      setIsSubmittingReturn(false);
    }
  };

  const handleConfirmExtend = async () => {
    if (!extendModalLoan) return;
    try {
      setIsSubmittingExtend(true);
      const res = await loanService.extendLoan(extendModalLoan.id);
      toast.success(
        "Perpanjangan Berhasil",
        res.message || "Pengajuan perpanjangan berhasil dikirim."
      );
      setExtendModalLoan(null);
      fetchLoans();
    } catch (err) {
      toast.error(
        "Gagal",
        err instanceof Error ? err.message : "Gagal memperpanjang peminjaman"
      );
    } finally {
      setIsSubmittingExtend(false);
    }
  };

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
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-all cursor-pointer"
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
            <ActiveLoanCard
              key={loan.id}
              loan={loan}
              onReturnClick={(l) => setReturnModalLoan(l)}
              onExtendClick={(l) => setExtendModalLoan(l)}
            />
          ))}
        </div>

        {/* Modal: Kembalikan Buku */}
        <Modal
          isOpen={!!returnModalLoan}
          onClose={() => {
            if (!isSubmittingReturn) setReturnModalLoan(null);
          }}
          title="Konfirmasi Pengembalian Buku"
          size="md"
        >
          {returnModalLoan && (
            <ReturnModalContent
              loan={returnModalLoan}
              loading={isSubmittingReturn}
              onClose={() => setReturnModalLoan(null)}
              onConfirm={handleConfirmReturn}
            />
          )}
        </Modal>

        {/* Modal: Perpanjang Buku */}
        <Modal
          isOpen={!!extendModalLoan}
          onClose={() => {
            if (!isSubmittingExtend) setExtendModalLoan(null);
          }}
          title="Konfirmasi Perpanjangan Peminjaman"
          size="md"
        >
          {extendModalLoan && (
            <ExtendModalContent
              loan={extendModalLoan}
              loading={isSubmittingExtend}
              onClose={() => setExtendModalLoan(null)}
              onConfirm={handleConfirmExtend}
            />
          )}
        </Modal>
      </div>
    );
  }

  // History Loans - Counts for Filters
  const statusCounts = {
    all: loans.length,
    returned: loans.filter((l) => l.status === "returned").length,
    rejected: loans.filter((l) => l.status === "rejected").length,
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <LoanFilterToolbar
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        onClearSearch={handleClearSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={handleStatusFilterChange}
        statusCounts={statusCounts}
        displayMode={displayMode}
        onDisplayModeChange={setDisplayMode}
      />

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
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-muted text-foreground hover:bg-muted/80 text-xs font-bold transition-all cursor-pointer"
            >
              Reset Filter
            </button>
          )}
        </div>
      ) : (
        <>
          <LoanHistoryTable
            loans={paginatedLoans}
            onSelectLoan={(loan) => setSelectedLoan(loan)}
            displayMode={displayMode}
          />

          <LoanHistoryCards
            loans={paginatedLoans}
            onSelectLoan={(loan) => setSelectedLoan(loan)}
            displayMode={displayMode}
          />
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
              className="p-2 rounded-xl border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
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
              className="p-2 rounded-xl border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
              title="Halaman Berikutnya"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Loan History Detail Dialog */}
      {selectedLoan && (
        <LoanDetailDialog
          loan={selectedLoan}
          type={type}
          onClose={() => setSelectedLoan(null)}
          onReturnClick={(l) => {
            setSelectedLoan(null);
            setReturnModalLoan(l);
          }}
          onExtendClick={(l) => {
            setSelectedLoan(null);
            setExtendModalLoan(l);
          }}
        />
      )}

      {/* Modal: Kembalikan Buku */}
      <Modal
        isOpen={!!returnModalLoan}
        onClose={() => {
          if (!isSubmittingReturn) setReturnModalLoan(null);
        }}
        title="Konfirmasi Pengembalian Buku"
        size="md"
      >
        {returnModalLoan && (
          <ReturnModalContent
            loan={returnModalLoan}
            loading={isSubmittingReturn}
            onClose={() => setReturnModalLoan(null)}
            onConfirm={handleConfirmReturn}
          />
        )}
      </Modal>

      {/* Modal: Perpanjang Buku */}
      <Modal
        isOpen={!!extendModalLoan}
        onClose={() => {
          if (!isSubmittingExtend) setExtendModalLoan(null);
        }}
        title="Konfirmasi Perpanjangan Peminjaman"
        size="md"
      >
        {extendModalLoan && (
          <ExtendModalContent
            loan={extendModalLoan}
            loading={isSubmittingExtend}
            onClose={() => setExtendModalLoan(null)}
            onConfirm={handleConfirmExtend}
          />
        )}
      </Modal>
    </div>
  );
}
