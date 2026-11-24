// src/components/dashboard/LoansSection.tsx
import { useState, useEffect } from "react";
import { TablePagination } from "@/components/common/TablePagination";
import { useNavigate } from "react-router";
import reservationService, { type Reservation } from "@/services/reservationService";
import loanService from "@/services/loanService";
import { 
  Clock,
  CheckCircle,
  XCircle,
  BookOpen,
  Search,
  User,
  Calendar,
  RefreshCw,
  RotateCcw,
  AlertTriangle,
  Download,
  Loader2,
  FileDown,
  Bookmark,
  Printer,
  PlusCircle,
} from "lucide-react";
import { ReturnReceiptModal } from "@/components/common/ReturnReceiptModal";
import { LoanReceiptModal } from "@/components/common/LoanReceiptModal";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { API_BASE_URL } from "@/utils/api-config";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/useToast";
import { exportApi } from "@/api/client";
import Modal from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { triggerBadgeRefresh } from "@/hooks/dashboard/useDashboardBadges";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { cn } from "@/utils/utils";

interface Loan {
  id: string;
  itemId?: string;
  memberId?: string;
  loanDate?: string;
  dueDate?: string;
  returnDate?: string | null;
  returnStaffName?: string;
  returnStaffSignature?: string;
  returnCondition?: "good" | "damaged" | "lost";
  returnReceiptNo?: string;
  purpose?: string;
  notes?: string;
  status: "pending" | "approved" | "rejected" | "returned" | "extended";
  extensionStatus?: "none" | "pending" | "approved" | "rejected";
  requestDate?: string;
  approvedBy?: string;
  approvedDate?: string;
  rejectReason?: string;
  bibliographyTitle?: string;
  memberName?: string;
  itemCode?: string;
  fine?: number;
  item?: {
    id?: string;
    itemCode?: string;
    barcode?: string;
    inventoryCode?: string;
    callNumber?: string;
    location?: {
      name?: string;
      room?: string;
      rack?: string;
      shelf?: string;
    };
    bibliography?: {
      id?: string;
      title?: string;
      author?: string;
      sor?: string;
      publisher?: string;
      publishYear?: number;
      classification?: string;
      callNumber?: string;
      image?: string;
      isbnIssn?: string;
    };
  };
  member?: {
    id?: string;
    nimNidn?: string;
    faculty?: string;
    studyProgram?: string;
    institution?: string;
    type?: string;
    memberType?: string;
    cardNumber?: string;
    phone?: string;
    user?: {
      id?: string;
      name?: string;
      email?: string;
      role?: string;
    };
  };
}

const getBorrowerType = (loan: Loan) => {
  const raw = loan.member?.type || loan.member?.memberType || loan.member?.user?.role || "student";
  if (raw === "student") return "Mahasiswa";
  if (raw === "lecturer" || raw === "dosen") return "Dosen";
  if (raw === "staff") return "Tenaga Kependidikan";
  if (raw === "external") return "Anggota Luar";
  return raw;
};

const getConditionLabel = (cond?: "good" | "damaged" | "lost") => {
  if (cond === "good") return "Baik & Lengkap";
  if (cond === "damaged") return "Rusak";
  if (cond === "lost") return "Hilang";
  return cond || "Baik";
};

interface LoansSectionProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

export default function LoansSection({ searchTerm, onSearchChange }: LoansSectionProps) {
  const navigate = useNavigate();
  const { canEdit } = useRolePermissions();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "returned" | "pending_extension" | "reservations" | "overdue">("all");
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [summaryStats, setSummaryStats] = useState({
    pending: 0,
    reservations: 0,
    approved: 0,
    returned: 0,
    overdue: 0,
  });
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [selectedReceiptLoan, setSelectedReceiptLoan] = useState<Loan | null>(null);
  const [selectedLoanReceipt, setSelectedLoanReceipt] = useState<Loan | null>(null);
  const [actionNotes, setActionNotes] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [returnModalLoan, setReturnModalLoan] = useState<Loan | null>(null);
  const [returnResult, setReturnResult] = useState<{ message: string; isLate: boolean } | null>(null);
  // Modal reject: menggantikan prompt() native browser
  const [rejectModal, setRejectModal] = useState<{ loanId: string; reason: string } | null>(null);
  const toast = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [exportingLoans, setExportingLoans] = useState(false);
  const [isDirectLoanOpen, setIsDirectLoanOpen] = useState(false);
  const [directLoanSubmitting, setDirectLoanSubmitting] = useState(false);
  const [directForm, setDirectForm] = useState({
    memberIdentifier: "",
    itemIdentifier: "",
    durationDays: 7,
    notes: "",
  });

  const handleDirectLoanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directForm.memberIdentifier.trim()) {
      toast.error("Validasi Gagal", "Nomor Kartu Anggota atau NIM/NIDN pemustaka wajib diisi");
      return;
    }
    if (!directForm.itemIdentifier.trim()) {
      toast.error("Validasi Gagal", "Kode Eksemplar / Barcode buku wajib diisi");
      return;
    }

    try {
      setDirectLoanSubmitting(true);
      const newLoan = await loanService.createDirectLoan({
        memberIdentifier: directForm.memberIdentifier.trim(),
        itemIdentifier: directForm.itemIdentifier.trim(),
        durationDays: Number(directForm.durationDays) || 7,
        notes: directForm.notes.trim() || undefined,
      });

      toast.success("Peminjaman Berhasil", "Peminjaman di tempat berhasil diproses dan buku siap diserahkan.");
      setIsDirectLoanOpen(false);
      setDirectForm({
        memberIdentifier: "",
        itemIdentifier: "",
        durationDays: 7,
        notes: "",
      });

      // Tampilkan struk bukti sirkulasi peminjaman buku (Loan Receipt)
      setSelectedLoanReceipt(newLoan as any);

      // Refresh data
      fetchLoans();
      void fetchSummaryStats();
      triggerBadgeRefresh();
    } catch (err: any) {
      toast.error("Peminjaman Gagal", err.message || "Gagal memproses peminjaman langsung");
    } finally {
      setDirectLoanSubmitting(false);
    }
  };

  const fetchSummaryStats = async () => {
    try {
      const [loansRes, reservationsList] = await Promise.all([
        fetch(`${API_BASE_URL}/api/loans?limit=200`, { credentials: "include" }),
        reservationService.getAllReservations({ status: "waiting" }).catch(() => [])
      ]);

      const loansData = await loansRes.json();
      const allLoans: Loan[] = (loansData.success && Array.isArray(loansData.data)) ? loansData.data : [];
      const todayMidnight = new Date().setHours(0, 0, 0, 0);

      setSummaryStats({
        pending: allLoans.filter((l) => l?.status === "pending").length,
        reservations: Array.isArray(reservationsList) ? reservationsList.length : 0,
        approved: allLoans.filter((l) => {
          if (!l || (l.status !== "approved" && l.status !== "extended") || !l.dueDate) return false;
          return new Date(l.dueDate).setHours(0, 0, 0, 0) >= todayMidnight;
        }).length,
        overdue: allLoans.filter((l) => {
          if (!l || (l.status !== "approved" && l.status !== "extended") || !l.dueDate) return false;
          return new Date(l.dueDate).setHours(0, 0, 0, 0) < todayMidnight;
        }).length,
        returned: allLoans.filter((l) => l?.status === "returned").length,
      });
    } catch (err) {
      console.warn("Failed to fetch loan summary stats:", err);
    }
  };

  const handleExportLoans = async () => {
    setExportingLoans(true);
    try {
      const statusParam = filter === "all" ? undefined : filter === "pending_extension" ? "approved" : filter;
      await exportApi.downloadLoans({
        status: statusParam,
        search: searchTerm || undefined,
      });
      toast.success("Export Berhasil", "Data peminjaman berhasil diunduh.");
    } catch (err: unknown) {
      toast.error("Export Gagal", err instanceof Error ? err.message : "Gagal mengunduh CSV");
    } finally {
      setExportingLoans(false);
    }
  };

  useEffect(() => {
    fetchLoans();
    void fetchSummaryStats();
    setCurrentPage(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const fetchLoans = async () => {
    setLoading(true);
    setError(null);
    try {
      if (filter === "reservations") {
        const resList = await reservationService.getAllReservations({ status: "waiting" });
        setReservations(resList);
        setLoading(false);
        return;
      }
      let statusParam = "";
      if (filter === "pending_extension" || filter === "overdue") {
        statusParam = "?status=approved";
      } else if (filter !== "all") {
        statusParam = `?status=${filter}`;
      }
      const response = await fetch(`${API_BASE_URL}/api/loans${statusParam}`, {
        credentials: "include",
      });
      const data = await response.json();
      if (data.success) {
        // Pastikan data.data adalah array
        if (Array.isArray(data.data)) {
          setLoans(data.data);
          triggerBadgeRefresh();
        } else {
          console.error("Data is not an array:", data.data);
          setLoans([]);
          setError("Format data tidak sesuai");
        }
      } else {
        setLoans([]);
        setError(data.message || "Gagal memuat data");
      }
    } catch (error) {
      console.error("Failed to fetch loans:", error);
      setError("Gagal terhubung ke server");
      setLoans([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (loanId: string) => {
    setProcessingId(loanId);
    const loadingId = toast.loading("Memproses...", "Menyetujui peminjaman");
    try {
      const response = await fetch(`${API_BASE_URL}/api/loans/${loanId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ notes: actionNotes }),
      });
      const data = await response.json();
      toast.removeToast(loadingId);
      if (data.success) {
        toast.success("Disetujui!", "Peminjaman berhasil disetujui");
        setSelectedLoan(null);
        setActionNotes("");
        fetchLoans();
        triggerBadgeRefresh();
      } else {
        toast.error("Gagal", data.message || "Gagal menyetujui peminjaman");
      }
    } catch {
      toast.removeToast(loadingId);
      toast.error("Error", "Gagal terhubung ke server");
    } finally {
      setProcessingId(null);
    }
  };

  // Buka modal reject — menggantikan prompt() agar konsisten dengan design system
  const openRejectModal = (loanId: string) => {
    setRejectModal({ loanId, reason: "" });
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    const { loanId, reason } = rejectModal;
    if (!reason.trim()) {
      toast.warning("Isi Alasan", "Alasan penolakan tidak boleh kosong");
      return;
    }

    setProcessingId(loanId);
    setRejectModal(null);
    const loadingId = toast.loading("Memproses...", "Menolak peminjaman");
    try {
      const response = await fetch(`${API_BASE_URL}/api/loans/${loanId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason }),
      });
      const data = await response.json();
      toast.removeToast(loadingId);
      if (data.success) {
        toast.success("Ditolak", "Peminjaman berhasil ditolak");
        fetchLoans();
        triggerBadgeRefresh();
      } else {
        toast.error("Gagal", data.message || "Gagal menolak peminjaman");
      }
    } catch {
      toast.removeToast(loadingId);
      toast.error("Error", "Gagal terhubung ke server");
    } finally {
      setProcessingId(null);
    }
  };

  // ─── Handler: Return Book ───────────────────────────────────────────
  const handleReturn = async (loanId: string) => {
    setProcessingId(loanId);
    const loadingId = toast.loading("Memproses...", "Memproses pengembalian buku");
    try {
      const response = await fetch(`${API_BASE_URL}/api/loans/${loanId}/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      const data = await response.json();
      toast.removeToast(loadingId);
      if (data.success) {
        const isLate = data.message?.toLowerCase().includes("terlambat");
        setReturnResult({ message: data.message, isLate });
        fetchLoans();
      } else {
        toast.error("Gagal", data.message || "Gagal memproses pengembalian");
        setReturnModalLoan(null);
      }
    } catch {
      toast.removeToast(loadingId);
      toast.error("Error", "Gagal terhubung ke server");
      setReturnModalLoan(null);
    } finally {
      setProcessingId(null);
    }
  };

  // ─── Handler: Approve Extension ─────────────────────────────────────
  const handleApproveExtension = async (loanId: string) => {
    setProcessingId(loanId);
    const loadingId = toast.loading("Memproses...", "Menyetujui perpanjangan peminjaman");
    try {
      const response = await fetch(`${API_BASE_URL}/api/loans/${loanId}/approve-extension`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const data = await response.json();
      toast.removeToast(loadingId);
      if (data.success) {
        toast.success("Berhasil", "Perpanjangan peminjaman disetujui");
        fetchLoans();
        triggerBadgeRefresh();
      } else {
        toast.error("Gagal", data.message || "Gagal menyetujui perpanjangan");
      }
    } catch {
      toast.removeToast(loadingId);
      toast.error("Error", "Gagal terhubung ke server");
    } finally {
      setProcessingId(null);
    }
  };

  // ─── Handler: Reject Extension ─────────────────────────────────────
  const handleRejectExtension = async (loanId: string) => {
    setProcessingId(loanId);
    const loadingId = toast.loading("Memproses...", "Menolak perpanjangan peminjaman");
    try {
      const response = await fetch(`${API_BASE_URL}/api/loans/${loanId}/reject-extension`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const data = await response.json();
      toast.removeToast(loadingId);
      if (data.success) {
        toast.success("Berhasil", "Perpanjangan peminjaman ditolak");
        fetchLoans();
        triggerBadgeRefresh();
      } else {
        toast.error("Gagal", data.message || "Gagal menolak perpanjangan");
      }
    } catch {
      toast.removeToast(loadingId);
      toast.error("Error", "Gagal terhubung ke server");
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string, dueDate?: string, extensionStatus?: string) => {
    // Check if pending extension
    if (extensionStatus === 'pending') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20">
          <Clock size={13} /> Menunggu Perpanjangan
        </span>
      );
    }

    // Check if overdue
    if ((status === 'approved' || status === 'extended') && dueDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const due = new Date(dueDate);
      due.setHours(0, 0, 0, 0);
      
      if (today > due) {
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20">
            <AlertTriangle size={13} /> Terlambat
          </span>
        );
      }
    }

    const statusConfig: Record<string, { badgeClass: string; icon: React.ElementType; text: string }> = {
      pending: { badgeClass: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20", icon: Clock, text: "Menunggu Persetujuan" },
      approved: { badgeClass: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20", icon: BookOpen, text: "Sedang Dipinjam" },
      rejected: { badgeClass: "bg-red-500/10 text-destructive border-red-500/20", icon: XCircle, text: "Ditolak" },
      returned: { badgeClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20", icon: CheckCircle, text: "Dikembalikan" },
      extended: { badgeClass: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20", icon: Clock, text: "Diperpanjang" },
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;
    
    return (
      <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border", config.badgeClass)}>
        <Icon size={13} /> {config.text}
      </span>
    );
  };

  const handleSearchChange = (val: string) => {
    onSearchChange(val);
    setCurrentPage(1);
  };

  // Filter dengan pengecekan keamanan
  const filteredLoans = filter === "reservations" ? [] : (Array.isArray(loans) 
    ? loans.filter(loan => {
        if (!loan) return false;
        
        if (filter === "pending_extension" && loan.extensionStatus !== "pending") {
          return false;
        }

        if (filter === "overdue") {
          const isOverdue =
            (loan.status === "approved" || loan.status === "extended") &&
            loan.dueDate &&
            new Date(loan.dueDate).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0);
          if (!isOverdue) return false;
        }

        if (filter === "approved") {
          const isNotOverdue =
            (loan.status === "approved" || loan.status === "extended") &&
            loan.dueDate &&
            new Date(loan.dueDate).setHours(0, 0, 0, 0) >= new Date().setHours(0, 0, 0, 0);
          if (!isNotOverdue) return false;
        }
        
        const bookTitle = loan.item?.bibliography?.title?.toLowerCase() || '';
        const borrowerName = loan.member?.user?.name?.toLowerCase() || '';
        const borrowerNim = loan.member?.nimNidn?.toString() || '';
        const searchLower = searchTerm.toLowerCase();
        
        return bookTitle.includes(searchLower) ||
               borrowerName.includes(searchLower) ||
               borrowerNim.includes(searchTerm);
      })
    : []);

  const filteredReservations = filter === "reservations" ? (Array.isArray(reservations)
    ? reservations.filter(res => {
        if (!res) return false;
        const bookTitle = res.bibliography?.title?.toLowerCase() || '';
        const borrowerName = res.member?.user?.name?.toLowerCase() || '';
        const borrowerNim = res.member?.nimNidn?.toString() || '';
        const searchLower = searchTerm.toLowerCase();
        return bookTitle.includes(searchLower) ||
               borrowerName.includes(searchLower) ||
               borrowerNim.includes(searchTerm);
      })
    : []) : [];

  // Pagination Logic
  const totalCount = filter === "reservations" ? filteredReservations.length : filteredLoans.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / itemsPerPage));
  const paginatedLoans = filteredLoans.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const paginatedReservations = filteredReservations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="w-full">
      {/* Main Container */}
      <div className="bg-card rounded-[24px] border border-border shadow-sm overflow-hidden flex flex-col min-h-[600px]">
        
        {/* Header Controls */}
        <div className="p-6 md:px-8 border-b border-border space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold text-foreground tracking-tight">
                Peminjaman &amp; Persetujuan
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Kelola sirkulasi buku, verifikasi pengajuan pinjaman, dan berita acara pengembalian
              </p>
            </div>

            {canEdit("loans") && (
              <button
                type="button"
                onClick={() => setIsDirectLoanOpen(true)}
                className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-xs cursor-pointer shrink-0"
                title="Input peminjaman mandiri di tempat oleh petugas jika pemustaka tidak membawa HP"
              >
                <PlusCircle size={15} />
                <span>Peminjaman di Tempat</span>
              </button>
            )}
          </div>

          {/* Search, Filter, & Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
              {/* Filter Status */}
              <Select
                value={filter}
                onValueChange={(value) =>
                  setFilter(
                    value as
                      | "all"
                      | "pending"
                      | "pending_extension"
                      | "reservations"
                      | "approved"
                      | "returned"
                      | "overdue"
                  )
                }
              >
                <SelectTrigger className="w-[190px] sm:w-[210px] h-9 text-xs font-semibold">
                  <SelectValue placeholder="Pilih Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="pending">Menunggu Persetujuan</SelectItem>
                  <SelectItem value="pending_extension">Menunggu Perpanjangan</SelectItem>
                  <SelectItem value="reservations">Antrean Reservasi</SelectItem>
                  <SelectItem value="approved">Sedang Dipinjam</SelectItem>
                  <SelectItem value="returned">Dikembalikan</SelectItem>
                  <SelectItem value="overdue">Terlambat</SelectItem>
                </SelectContent>
              </Select>

              {/* Search */}
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground size-4" />
                <input
                  type="text"
                  placeholder="Cari judul buku, nama pemustaka, NIM/NIDN..."
                  className="w-full pl-9 pr-3 h-9 bg-background border border-border rounded-lg text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  fetchLoans();
                  void fetchSummaryStats();
                }}
                className="h-9 w-9 rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center justify-center cursor-pointer"
                title="Segarkan data sirkulasi"
              >
                <RefreshCw size={14} />
              </button>

              <button
                onClick={handleExportLoans}
                disabled={exportingLoans}
                className="h-9 px-3 rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center gap-1.5 text-xs font-semibold disabled:opacity-50 cursor-pointer"
                title="Export riwayat peminjaman ke CSV"
              >
                {exportingLoans ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Download size={14} />
                )}
                <span>Export CSV</span>
              </button>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="p-6 md:px-8 border-b border-border/80">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {[
              {
                key: "pending" as const,
                label: "Menunggu Persetujuan",
                value: summaryStats.pending,
                icon: Clock,
                badgeStyle: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
              },
              {
                key: "reservations" as const,
                label: "Antrean Reservasi",
                value: summaryStats.reservations,
                icon: Bookmark,
                badgeStyle: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
              },
              {
                key: "approved" as const,
                label: "Sedang Dipinjam",
                value: summaryStats.approved,
                icon: BookOpen,
                badgeStyle: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
              },
              {
                key: "returned" as const,
                label: "Dikembalikan",
                value: summaryStats.returned,
                icon: CheckCircle,
                badgeStyle: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
              },
              {
                key: "overdue" as const,
                label: "Terlambat",
                value: summaryStats.overdue,
                icon: XCircle,
                badgeStyle: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
              },
            ].map((card) => {
              const Icon = card.icon;
              const isActive = filter === card.key;
              return (
                <button
                  key={card.key}
                  type="button"
                  onClick={() => setFilter(isActive ? "all" : card.key)}
                  className={cn(
                    "rounded-xl p-4 flex flex-col justify-between text-left transition-all cursor-pointer border",
                    isActive
                      ? "bg-card border-primary ring-2 ring-primary/20 shadow-xs"
                      : "bg-card/70 hover:bg-card border-border/80 hover:border-border shadow-2xs"
                  )}
                  title={`Filter: ${card.label}`}
                >
                  <div className="flex items-center justify-between w-full mb-3">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider truncate">
                      {card.label}
                    </span>
                    <div className={cn("p-1.5 rounded-lg border shrink-0", card.badgeStyle)}>
                      <Icon size={14} />
                    </div>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                      {card.value}
                    </span>
                    {isActive && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                        Aktif
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-8 mt-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl">
            <p className="text-sm font-medium text-destructive">{error}</p>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 p-6 md:px-8">
          {loading ? (
            <div className="space-y-4 animate-in fade-in duration-500">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-[180px] w-full rounded-xl" />
              ))}
            </div>
          ) : filter === "reservations" ? (
            paginatedReservations.length === 0 ? (
              <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center text-muted-foreground">
                <Clock className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-sm font-bold text-muted-foreground">
                  {searchTerm ? "Tidak ada hasil reservasi" : "Tidak ada antrean reservasi saat ini"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {paginatedReservations.map((res) => (
                  <div
                    key={res.id}
                    className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-2xs hover:border-border/90 hover:shadow-sm transition-all space-y-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border/70">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-mono font-bold px-2 py-0.5 rounded bg-muted text-foreground border border-border/80">
                          #RES-{res.id.slice(0, 8).toUpperCase()}
                        </span>
                        <span className="text-muted-foreground text-[11px]">
                          {res.createdAt ? `Diajukan: ${new Date(res.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}` : ""}
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                        <Clock size={12} />
                        Antrean Reservasi
                      </span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                      {/* Detail Bahan Pustaka */}
                      <div className="lg:col-span-7 rounded-xl border border-border/70 bg-muted/10 p-4 space-y-2.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                          Bahan Pustaka yang Dipesan
                        </span>
                        <h4 className="font-bold text-foreground text-sm sm:text-base leading-snug">
                          {res.bibliography?.title || "Judul tidak tersedia"}
                        </h4>
                        <p className="text-xs text-muted-foreground font-medium mt-0.5">
                          {res.bibliography?.author || "-"}
                        </p>
                        {res.bibliography?.publisher && (
                          <p className="text-xs text-muted-foreground pt-1.5 border-t border-border/50">
                            Penerbit: {[res.bibliography.publisher, res.bibliography.publicationYear].filter(Boolean).join(" • ")}
                          </p>
                        )}
                      </div>

                      {/* Detail Pemustaka */}
                      <div className="lg:col-span-5 rounded-xl border border-border/70 bg-muted/20 p-4 space-y-2.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                          Identitas Pemustaka
                        </span>
                        <h4 className="font-bold text-foreground text-sm leading-snug">
                          {res.member?.user?.name || "Nama tidak tersedia"}
                        </h4>
                        <div className="text-xs pt-1.5 border-t border-border/50">
                          <span className="text-[10px] font-medium text-muted-foreground block">NIM / NIDN</span>
                          <span className="font-mono font-semibold text-foreground">{res.member?.nimNidn || "-"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : paginatedLoans.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title={
                searchTerm
                  ? "Tidak ada hasil pencarian"
                  : filter === "overdue"
                  ? "Tidak ada peminjaman yang terlambat"
                  : "Tidak ada data peminjaman"
              }
              description={
                searchTerm
                  ? "Coba gunakan kata kunci pencarian yang berbeda."
                  : "Belum ada transaksi peminjaman pada kategori filter ini."
              }
            />
          ) : (
            <div className="space-y-4">
              {paginatedLoans.map((loan) => (
                <div 
                  key={loan.id} 
                  className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-2xs hover:border-border/90 hover:shadow-sm transition-all space-y-4"
                >
                  {/* Header: ID, Badge, Timestamp */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border/70">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-mono font-bold px-2 py-0.5 rounded bg-muted text-foreground border border-border/80">
                        #{loan.id.slice(0, 8).toUpperCase()}
                      </span>
                      {loan.returnReceiptNo && (
                        <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                          {loan.returnReceiptNo}
                        </span>
                      )}
                      <span className="text-muted-foreground text-[11px]">
                        {loan.loanDate ? `Diajukan: ${new Date(loan.loanDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}` : ""}
                      </span>
                    </div>
                    <div>
                      {getStatusBadge(loan.status, loan.dueDate, loan.extensionStatus)}
                    </div>
                  </div>

                  {/* 2-Column Grid: Detail Bahan Pustaka & Detail Pemustaka */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    {/* Kolom 1: Detail Buku (Bahan Pustaka) */}
                    <div className="lg:col-span-7 rounded-xl border border-border/70 bg-muted/10 p-4 space-y-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                          Bahan Pustaka (Buku)
                        </span>
                        <h4 className="font-bold text-foreground text-sm sm:text-base leading-snug">
                          {loan.item?.bibliography?.title || loan.bibliographyTitle || "Judul tidak tersedia"}
                        </h4>
                        <p className="text-xs text-muted-foreground font-medium mt-0.5">
                          {loan.item?.bibliography?.author || loan.item?.bibliography?.sor || "Pengarang tidak tertera"}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2.5 border-t border-border/50 text-xs">
                        <div>
                          <span className="text-[10px] font-medium text-muted-foreground block">No. Eksemplar / Barcode</span>
                          <span className="font-mono font-semibold text-foreground">
                            {loan.item?.itemCode || loan.item?.barcode || loan.itemCode || "-"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-medium text-muted-foreground block">Nomor Panggil (Call No.)</span>
                          <span className="font-mono font-semibold text-foreground">
                            {loan.item?.callNumber || loan.item?.bibliography?.callNumber || loan.item?.bibliography?.classification || "-"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-medium text-muted-foreground block">Lokasi Rak</span>
                          <span className="font-medium text-foreground">
                            {loan.item?.location?.name || "-"}
                          </span>
                        </div>
                        {loan.item?.bibliography?.publisher && (
                          <div className="col-span-2 sm:col-span-3">
                            <span className="text-[10px] font-medium text-muted-foreground block">Penerbit &amp; Tahun</span>
                            <span className="font-medium text-foreground">
                              {[loan.item?.bibliography?.publisher, loan.item?.bibliography?.publishYear].filter(Boolean).join(" • ")}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Kolom 2: Detail Pemustaka (Peminjam) */}
                    <div className="lg:col-span-5 rounded-xl border border-border/70 bg-muted/20 p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                            Identitas Pemustaka
                          </span>
                          <h4 className="font-bold text-foreground text-sm leading-snug">
                            {loan.member?.user?.name || loan.memberName || "Nama tidak tersedia"}
                          </h4>
                        </div>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-background text-foreground border border-border">
                          {getBorrowerType(loan)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5 pt-2.5 border-t border-border/50 text-xs">
                        <div>
                          <span className="text-[10px] font-medium text-muted-foreground block">NIM / NIDN</span>
                          <span className="font-mono font-semibold text-foreground">
                            {loan.member?.nimNidn || "-"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-medium text-muted-foreground block">No. Kartu Anggota</span>
                          <span className="font-mono font-semibold text-foreground">
                            {loan.member?.cardNumber || "-"}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-[10px] font-medium text-muted-foreground block">Fakultas &amp; Program Studi</span>
                          <span className="font-medium text-foreground">
                            {[loan.member?.faculty, loan.member?.studyProgram].filter(Boolean).join(" • ") || "-"}
                          </span>
                        </div>
                        {(loan.member?.user?.email || loan.member?.phone) && (
                          <div className="col-span-2">
                            <span className="text-[10px] font-medium text-muted-foreground block">Kontak</span>
                            <span className="font-medium text-muted-foreground truncate block">
                              {[loan.member?.user?.email, loan.member?.phone].filter(Boolean).join(" / ")}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Circulation Dates Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-lg bg-background border border-border/60 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Mulai Pinjam</span>
                      <span className="font-semibold text-foreground mt-0.5 block">
                        {loan.loanDate ? new Date(loan.loanDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Batas Jatuh Tempo</span>
                      <span className="font-semibold text-primary mt-0.5 block">
                        {loan.dueDate ? new Date(loan.dueDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Status Pengembalian</span>
                      <span className="font-semibold text-foreground mt-0.5 block">
                        {loan.returnDate ? (
                          `${new Date(loan.returnDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })} (${getConditionLabel(loan.returnCondition)})`
                        ) : (
                          "Belum Dikembalikan"
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Denda / Biaya</span>
                      <span className="font-semibold text-foreground mt-0.5 block">
                        {(loan.fine ?? 0) > 0 ? `Rp ${(loan.fine ?? 0).toLocaleString("id-ID")}` : "Bebas Denda"}
                      </span>
                    </div>
                  </div>

                  {/* Catatan Member jika ada */}
                  {(loan.notes || loan.purpose) && (
                    <div className="p-2.5 rounded-lg bg-muted/30 border border-border/50 text-xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Catatan Pemustaka:</span>
                      <p className="text-foreground mt-0.5 font-medium">{loan.notes || loan.purpose}</p>
                    </div>
                  )}

                  {/* Action Buttons - Pending: Setujui / Tolak */}
                  {loan.status === 'pending' && canEdit("loans") && (
                    <div className="flex flex-col sm:flex-row gap-2.5 pt-3 border-t border-border/70">
                      <button
                        onClick={() => {
                          setSelectedLoan(loan);
                          setActionNotes('');
                        }}
                        disabled={processingId === loan.id}
                        className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700 px-4 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {processingId === loan.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                        <span>{processingId === loan.id ? 'Memproses...' : 'Setujui Peminjaman'}</span>
                      </button>
                      <button
                        onClick={() => openRejectModal(loan.id)}
                        disabled={processingId === loan.id}
                        className="inline-flex items-center justify-center gap-2 bg-background text-destructive border border-destructive/30 hover:bg-destructive/10 px-5 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        <XCircle size={14} />
                        <span>Tolak</span>
                      </button>
                    </div>
                  )}

                  {/* Action Buttons - Approved / Extended */}
                  {(loan.status === 'approved' || loan.status === 'extended') && canEdit("loans") && (
                    <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t border-border/70">
                      <button
                        type="button"
                        onClick={() => setSelectedLoanReceipt(loan)}
                        className="inline-flex items-center gap-2 bg-primary/10 text-primary border border-primary/20 px-3.5 py-2 rounded-lg text-xs font-semibold hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer"
                        title="Cetak struk bukti sirkulasi peminjaman buku"
                      >
                        <Printer size={14} />
                        <span>Cetak Struk Pinjam</span>
                      </button>

                      <button
                        id={`btn-return-${loan.id}`}
                        onClick={() => navigate(`/dashboard/return-confirmation/${loan.id}`)}
                        className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20 px-3.5 py-2 rounded-lg text-xs font-semibold hover:bg-blue-600 hover:text-white transition-colors cursor-pointer"
                      >
                        <RotateCcw size={14} />
                        <span>Proses Pengembalian &amp; TTD</span>
                      </button>

                      {loan.extensionStatus === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApproveExtension(loan.id)}
                            disabled={processingId === loan.id}
                            className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 px-3.5 py-2 rounded-lg text-xs font-semibold hover:bg-emerald-600 hover:text-white transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            <CheckCircle size={14} />
                            <span>Setujui Perpanjangan</span>
                          </button>
                          <button
                            onClick={() => handleRejectExtension(loan.id)}
                            disabled={processingId === loan.id}
                            className="inline-flex items-center gap-2 bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20 px-3.5 py-2 rounded-lg text-xs font-semibold hover:bg-destructive hover:text-white transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            <XCircle size={14} />
                            <span>Tolak Perpanjangan</span>
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {/* Action Buttons - Returned */}
                  {loan.status === 'returned' && (
                    <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t border-border/70">
                      <button
                        type="button"
                        onClick={() => setSelectedReceiptLoan(loan)}
                        className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-3.5 py-2 rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors shadow-xs cursor-pointer"
                      >
                        <Printer size={14} />
                        <span>Cetak Resi ({loan.returnReceiptNo || 'BA-RET'})</span>
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            await loanService.downloadReturnReceiptPdf(loan.id);
                            toast.success("Berhasil", "Tanda terima pengembalian PDF berhasil diunduh");
                          } catch (e: any) {
                            toast.error("Gagal", e.message || "Gagal mengunduh tanda terima");
                          }
                        }}
                        className="inline-flex items-center gap-2 border border-border bg-background hover:bg-muted text-foreground px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <FileDown size={14} />
                        <span>Unduh Berita Acara (PDF)</span>
                      </button>
                    </div>
                  )}

                  {/* Info penolakan jika ada */}
                  {loan.status === 'rejected' && loan.rejectReason && (
                    <div className="p-3 bg-destructive/10 rounded-lg text-xs border border-destructive/20 text-destructive">
                      <span className="font-bold">Alasan Penolakan: </span>
                      <span>{loan.rejectReason}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredLoans.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          label="data peminjaman"
        />
      </div>

      {/* ── Modal: Approve Loan ── */}
      <Modal
        isOpen={!!selectedLoan}
        onClose={() => {
          setSelectedLoan(null);
          setActionNotes("");
        }}
        title="Setujui Peminjaman"
        size="md"
      >
        {selectedLoan && (
          <div className="space-y-4 p-2">
            <div className="p-4 bg-muted/60 rounded-xl space-y-3 border border-border">
              <div className="text-[13px] text-muted-foreground flex justify-between items-center">
                <span className="font-semibold text-muted-foreground">Buku</span>
                <span className="font-bold text-foreground text-right max-w-[65%] truncate">
                  {selectedLoan.item?.bibliography?.title || "-"}
                </span>
              </div>
              <div className="h-px bg-border"></div>
              <div className="text-[13px] text-muted-foreground flex justify-between items-center">
                <span className="font-semibold text-muted-foreground">Peminjam</span>
                <span className="font-bold text-foreground text-right">
                  {selectedLoan.member?.user?.name}{" "}
                  <span className="text-muted-foreground font-normal">
                    ({selectedLoan.member?.nimNidn})
                  </span>
                </span>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-foreground">
                Catatan Persetujuan (Opsional)
              </label>
              <textarea
                placeholder="Opsional, berikan pesan atau catatan untuk peminjam..."
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                rows={3}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedLoan(null);
                  setActionNotes("");
                }}
                disabled={processingId === selectedLoan.id}
                className="h-9 rounded-lg border border-border px-4 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                id="btn-confirm-approve"
                onClick={() => handleApprove(selectedLoan.id)}
                disabled={processingId === selectedLoan.id}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-green-600 px-4 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 shadow-sm transition-colors"
              >
                {processingId === selectedLoan.id && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                <span>
                  {processingId === selectedLoan.id
                    ? "Memproses..."
                    : "Setujui Sekarang"}
                </span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal: Return Book ── */}
      <Modal
        isOpen={!!returnModalLoan}
        onClose={() => {
          setReturnModalLoan(null);
          setReturnResult(null);
        }}
        title={
          returnResult
            ? (returnResult.isLate ? "Pengembalian Terlambat" : "Buku Berhasil Dikembalikan")
            : "Konfirmasi Pengembalian Buku"
        }
        size="md"
      >
        {returnModalLoan && (
          <div className="space-y-4 p-2">
            {returnResult ? (
              <div className="text-center py-2">
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 ${
                    returnResult.isLate
                      ? "bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400"
                      : "bg-green-100 dark:bg-green-950 text-green-600 dark:text-green-400"
                  }`}
                >
                  {returnResult.isLate ? (
                    <AlertTriangle size={28} />
                  ) : (
                    <CheckCircle size={28} />
                  )}
                </div>
                <h3 className="text-base font-bold text-foreground mb-2">
                  {returnResult.isLate
                    ? "Pengembalian Melewati Batas Waktu"
                    : "Buku Berhasil Dikembalikan!"}
                </h3>
                <p className="text-sm text-muted-foreground font-medium leading-relaxed mb-5">
                  {returnResult.message}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setReturnModalLoan(null);
                    setReturnResult(null);
                  }}
                  className="w-full h-9 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Tutup
                </button>
              </div>
            ) : (
              <>
                <div className="p-4 bg-muted/60 rounded-xl space-y-3 border border-border">
                  <div className="text-[13px] text-muted-foreground flex justify-between items-center">
                    <span className="font-semibold text-muted-foreground">Kode Buku</span>
                    <span className="font-mono font-bold text-primary px-2 py-0.5 bg-primary/10 rounded border border-primary/20 text-xs">
                      {returnModalLoan.item?.itemCode ||
                        returnModalLoan.item?.barcode ||
                        (returnModalLoan as any).itemCode ||
                        "-"}
                    </span>
                  </div>
                  <div className="h-px bg-border"></div>
                  <div className="text-[13px] text-muted-foreground flex justify-between items-center">
                    <span className="font-semibold text-muted-foreground">Judul Buku</span>
                    <span className="font-bold text-foreground text-right max-w-[65%] truncate">
                      {returnModalLoan.item?.bibliography?.title ||
                        returnModalLoan.bibliographyTitle ||
                        "-"}
                    </span>
                  </div>
                  <div className="h-px bg-border"></div>
                  <div className="text-[13px] text-muted-foreground flex justify-between items-center">
                    <span className="font-semibold text-muted-foreground">Peminjam</span>
                    <span className="font-bold text-foreground text-right">
                      {returnModalLoan.member?.user?.name ||
                        returnModalLoan.memberName ||
                        "-"}
                    </span>
                  </div>
                  <div className="h-px bg-border"></div>
                  <div className="text-[13px] text-muted-foreground flex justify-between items-center">
                    <span className="font-semibold text-muted-foreground">Batas Kembali</span>
                    <span
                      className={`font-bold ${
                        returnModalLoan.dueDate &&
                        new Date(returnModalLoan.dueDate).setHours(0, 0, 0, 0) <
                        new Date().setHours(0, 0, 0, 0)
                          ? "text-destructive"
                          : "text-foreground"
                      }`}
                    >
                      {returnModalLoan.dueDate
                        ? new Date(returnModalLoan.dueDate).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })
                        : "-"}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground font-medium text-center">
                  Denda keterlambatan:{" "}
                  <strong className="text-primary font-bold">Rp 500 / hari</strong>{" "}
                  jika melewati batas kembali.
                </p>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setReturnModalLoan(null)}
                    disabled={processingId === returnModalLoan.id}
                    className="h-9 rounded-lg border border-border px-4 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    id="btn-confirm-return"
                    onClick={() => handleReturn(returnModalLoan.id)}
                    disabled={processingId === returnModalLoan.id}
                    className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {processingId === returnModalLoan.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <RotateCcw className="size-4" />
                    )}
                    <span>
                      {processingId === returnModalLoan.id
                        ? "Memproses..."
                        : "Kembalikan Buku"}
                    </span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* ── Modal: Reject Loan ── */}
      <Modal
        isOpen={!!rejectModal}
        onClose={() => setRejectModal(null)}
        title="Tolak Peminjaman"
        size="md"
      >
        {rejectModal && (
          <div className="space-y-4 p-2">
            <p className="text-sm text-muted-foreground">
              Berikan alasan penolakan yang jelas agar peminjam mengetahui alasan permintaan ditolak.
            </p>

            <div>
              <label className="mb-1 block text-xs font-semibold text-foreground">
                Alasan Penolakan *
              </label>
              <textarea
                autoFocus
                value={rejectModal.reason}
                onChange={(e) =>
                  setRejectModal({ ...rejectModal, reason: e.target.value })
                }
                placeholder="Contoh: Buku sedang dalam perbaikan, kartu tidak valid, dll."
                className="w-full rounded-lg border border-border px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-destructive/20 focus:border-destructive resize-none"
                rows={3}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRejectModal(null)}
                disabled={processingId === rejectModal.loanId}
                className="h-9 rounded-lg border border-border px-4 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                id="btn-confirm-reject"
                onClick={handleReject}
                disabled={processingId === rejectModal.loanId}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-destructive px-4 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 shadow-sm transition-colors"
              >
                {processingId === rejectModal.loanId && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                <span>
                  {processingId === rejectModal.loanId
                    ? "Memproses..."
                    : "Tolak Peminjaman"}
                </span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal: Peminjaman Mandiri di Tempat oleh Petugas ── */}
      <Modal
        isOpen={isDirectLoanOpen}
        onClose={() => setIsDirectLoanOpen(false)}
        title="Input Peminjaman di Tempat"
        size="md"
      >
        <form onSubmit={handleDirectLoanSubmit} className="space-y-4 p-1">
          <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-3.5 text-xs text-blue-900 dark:text-blue-200">
            <p className="font-bold mb-1">Peminjaman Buku Langsung (Tanpa HP)</p>
            <p className="text-muted-foreground leading-relaxed">
              Gunakan fitur ini apabila pemustaka telah memiliki kartu anggota aktif dan fisik kartu/NIM tersedia, namun tidak membawa smartphone untuk scan/mengajukan peminjaman secara mandiri.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground mb-1.5">
              Identitas Pemustaka (No. Kartu / NIM / NIDN) <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="text"
                required
                autoFocus
                value={directForm.memberIdentifier}
                onChange={(e) => setDirectForm({ ...directForm, memberIdentifier: e.target.value })}
                placeholder="Contoh: UMCLIB-... atau 22010199"
                disabled={directLoanSubmitting}
                className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium placeholder:text-muted-foreground"
              />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Masukkan Nomor Kartu Anggota yang tertera pada kartu fisik pemustaka atau NIM mahasiswa.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground mb-1.5">
              Identitas Buku (Kode Item / Barcode / No. Inventaris) <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <BookOpen className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="text"
                required
                value={directForm.itemIdentifier}
                onChange={(e) => setDirectForm({ ...directForm, itemIdentifier: e.target.value })}
                placeholder="Contoh: ITEM-001 atau INV-2026-..."
                disabled={directLoanSubmitting}
                className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium placeholder:text-muted-foreground font-mono"
              />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Scan barcode buku atau ketik kode item eksemplar fisik yang akan dipinjam.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                Durasi Peminjaman
              </label>
              <Select
                value={String(directForm.durationDays)}
                onValueChange={(val) => setDirectForm({ ...directForm, durationDays: Number(val) })}
                disabled={directLoanSubmitting}
              >
                <SelectTrigger className="w-full rounded-xl text-xs font-semibold">
                  <SelectValue placeholder="Pilih Durasi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 Hari (Standar)</SelectItem>
                  <SelectItem value="14">14 Hari (2 Minggu)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                Jatuh Tempo Otomatis
              </label>
              <div className="h-10 px-3 flex items-center bg-muted/50 rounded-xl border border-border text-xs font-medium text-muted-foreground">
                <Calendar size={14} className="mr-2 text-primary" />
                <span>
                  {new Date(Date.now() + (directForm.durationDays || 7) * 24 * 60 * 60 * 1000).toLocaleDateString("id-ID", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground mb-1.5">
              Catatan / Keperluan (Opsional)
            </label>
            <input
              type="text"
              value={directForm.notes}
              onChange={(e) => setDirectForm({ ...directForm, notes: e.target.value })}
              placeholder="Contoh: Referensi Tugas Akhir / Skripsi"
              disabled={directLoanSubmitting}
              className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border mt-2">
            <button
              type="button"
              onClick={() => setIsDirectLoanOpen(false)}
              disabled={directLoanSubmitting}
              className="h-10 px-4 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={directLoanSubmitting || !directForm.memberIdentifier.trim() || !directForm.itemIdentifier.trim()}
              className="h-10 px-5 bg-primary text-primary-foreground text-xs font-bold rounded-xl hover:bg-primary/90 transition-all flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {directLoanSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <CheckCircle size={14} />
                  <span>Proses Peminjaman</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {selectedReceiptLoan && (
        <ReturnReceiptModal
          isOpen={!!selectedReceiptLoan}
          onClose={() => setSelectedReceiptLoan(null)}
          loan={selectedReceiptLoan as any}
          onDownloadPdf={async () => {
            try {
              await loanService.downloadReturnReceiptPdf(selectedReceiptLoan.id);
              toast.success("Berhasil", "Tanda terima pengembalian PDF berhasil diunduh");
            } catch (e: any) {
              toast.error("Gagal", e.message || "Gagal mengunduh tanda terima");
            }
          }}
        />
      )}

      {selectedLoanReceipt && (
        <LoanReceiptModal
          isOpen={!!selectedLoanReceipt}
          onClose={() => setSelectedLoanReceipt(null)}
          loan={selectedLoanReceipt as any}
        />
      )}
    </div>
  );
}
