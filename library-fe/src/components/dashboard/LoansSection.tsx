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
import { triggerBadgeRefresh } from "@/hooks/dashboard/useDashboardBadges";
import { useRolePermissions } from "@/hooks/useRolePermissions";


interface Loan {
  id: string;
  itemId: string;
  memberId: string;
  loanDate: string;
  dueDate: string;
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
  item?: {
    itemCode?: string;
    barcode?: string;
    bibliography?: {
      title?: string;
      author?: string;
      image?: string;
    };
  };
  member?: {
    nimNidn?: string;
    faculty?: string;
    studyProgram?: string;
    institution?: string;
    type?: string;
    cardNumber?: string;
    user?: {
      name?: string;
    };
  };
}

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
        approved: allLoans.filter(
          (l) =>
            (l?.status === "approved" || l?.status === "extended") &&
            Boolean(l?.dueDate) &&
            new Date(l.dueDate).setHours(0, 0, 0, 0) >= todayMidnight
        ).length,
        overdue: allLoans.filter(
          (l) =>
            (l?.status === "approved" || l?.status === "extended") &&
            Boolean(l?.dueDate) &&
            new Date(l.dueDate).setHours(0, 0, 0, 0) < todayMidnight
        ).length,
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
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold tracking-wide bg-purple-100 text-purple-700">
          <Clock size={14} /> Menunggu Perpanjangan
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
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold tracking-wide bg-red-100 dark:bg-red-900 text-destructive`}>
            <Clock size={14} /> Terlambat
          </span>
        );
      }
    }

    const statusConfig: Record<string, { color: string; icon: React.ElementType; text: string }> = {
      pending: { color: "bg-yellow-100 text-yellow-700 dark:text-yellow-400", icon: Clock, text: "Menunggu" },
      approved: { color: "bg-blue-100 text-blue-700 dark:text-blue-400", icon: BookOpen, text: "Dipinjam" },
      rejected: { color: "bg-red-100 dark:bg-red-900 text-destructive", icon: XCircle, text: "Ditolak" },
      returned: { color: "bg-muted text-muted-foreground", icon: CheckCircle, text: "Dikembalikan" },
      extended: { color: "bg-purple-100 text-purple-700", icon: Clock, text: "Diperpanjang" },
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold tracking-wide ${config.color}`}>
        <Icon size={14} /> {config.text}
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
            Boolean(loan.dueDate) &&
            new Date(loan.dueDate).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0);
          if (!isOverdue) return false;
        }

        if (filter === "approved") {
          const isNotOverdue =
            (loan.status === "approved" || loan.status === "extended") &&
            Boolean(loan.dueDate) &&
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
        <div className="p-6 md:px-8 border-b border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <h2 className="text-[20px] font-extrabold text-foreground tracking-tight">Peminjaman & Persetujuan</h2>
          
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
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
              <SelectTrigger className="w-[220px] text-[13px] font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                <SelectItem value="pending">Menunggu Persetujuan</SelectItem>
                <SelectItem value="pending_extension">Menunggu Perpanjangan</SelectItem>
                <SelectItem value="reservations">Antrean Reservasi</SelectItem>
                <SelectItem value="approved">Sedang Dipinjam</SelectItem>
                <SelectItem value="returned">Dikembalikan</SelectItem>
                <SelectItem value="overdue">Terlambat</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Search */}
            <div className="relative flex-1 md:flex-initial">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <input
                type="text"
                placeholder="Cari peminjaman..."
                className="w-full md:w-64 pl-11 pr-4 py-2.5 bg-background border-none rounded-xl text-[13px] font-medium text-muted-foreground focus:ring-2 focus:ring-primary/10 placeholder:text-muted-foreground"
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>
            
            {/* Refresh Button */}
            <button
              onClick={() => {
                fetchLoans();
                void fetchSummaryStats();
              }}
              className="w-10 h-10 bg-background rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all flex items-center justify-center shrink-0 cursor-pointer"
              title="Refresh data"
            >
              <RefreshCw size={16} strokeWidth={2.5} />
            </button>

            {/* Export CSV Button */}
            <button
              onClick={handleExportLoans}
              disabled={exportingLoans}
              className="h-10 px-4 bg-background rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all flex items-center gap-2 shrink-0 text-[13px] font-bold border border-border/50 disabled:opacity-50 cursor-pointer"
              title="Export riwayat peminjaman ke CSV"
            >
              {exportingLoans ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Download size={16} strokeWidth={2.5} />
              )}
              <span>Export CSV</span>
            </button>

            {/* Direct Loan Button (Input di Tempat) */}
            {canEdit("loans") && (
              <button
                type="button"
                onClick={() => setIsDirectLoanOpen(true)}
                className="h-10 px-4 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all flex items-center gap-2 shrink-0 text-[13px] font-bold shadow-xs cursor-pointer"
                title="Input peminjaman mandiri di tempat oleh petugas jika pemustaka tidak membawa HP"
              >
                <PlusCircle size={16} strokeWidth={2.5} />
                <span>Peminjaman di Tempat</span>
              </button>
            )}
          </div>
        </div>

        {/* Stats Cards Row */}
        <div className="p-6 md:px-8 border-b border-border">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
            
            {/* Card 1: Menunggu Persetujuan */}
            <button
              type="button"
              onClick={() => setFilter("pending")}
              className={`bg-yellow-50 dark:bg-yellow-950/60 rounded-2xl p-4 sm:p-5 flex flex-col justify-between h-[100px] text-left transition-all cursor-pointer hover:shadow-xs active:scale-[0.98] ${
                filter === "pending"
                  ? "ring-2 ring-yellow-500 shadow-xs"
                  : "hover:ring-1 hover:ring-yellow-300 dark:hover:ring-yellow-700"
              }`}
              title="Filter: Menunggu Persetujuan"
            >
              <div className="flex items-start justify-between w-full">
                <Clock className="text-yellow-700 dark:text-yellow-400 shrink-0" size={20} strokeWidth={2.5} />
                <span className="text-[26px] sm:text-[28px] font-black leading-none text-yellow-700 dark:text-yellow-400">
                  {summaryStats.pending}
                </span>
              </div>
              <p className="text-[11px] font-bold text-yellow-700 dark:text-yellow-400 truncate">Menunggu Persetujuan</p>
            </button>

            {/* Card 2: Antrean Reservasi */}
            <button
              type="button"
              onClick={() => setFilter("reservations")}
              className={`bg-purple-50 dark:bg-purple-950/60 rounded-2xl p-4 sm:p-5 flex flex-col justify-between h-[100px] text-left transition-all cursor-pointer hover:shadow-xs active:scale-[0.98] ${
                filter === "reservations"
                  ? "ring-2 ring-purple-500 shadow-xs"
                  : "hover:ring-1 hover:ring-purple-300 dark:hover:ring-purple-700"
              }`}
              title="Filter: Antrean Reservasi"
            >
              <div className="flex items-start justify-between w-full">
                <Bookmark className="text-purple-700 dark:text-purple-400 shrink-0" size={20} strokeWidth={2.5} />
                <span className="text-[26px] sm:text-[28px] font-black leading-none text-purple-700 dark:text-purple-400">
                  {summaryStats.reservations}
                </span>
              </div>
              <p className="text-[11px] font-bold text-purple-700 dark:text-purple-400 truncate">Antrean Reservasi</p>
            </button>

            {/* Card 3: Sedang Dipinjam */}
            <button
              type="button"
              onClick={() => setFilter("approved")}
              className={`bg-blue-50 dark:bg-blue-950/60 rounded-2xl p-4 sm:p-5 flex flex-col justify-between h-[100px] text-left transition-all cursor-pointer hover:shadow-xs active:scale-[0.98] ${
                filter === "approved"
                  ? "ring-2 ring-blue-500 shadow-xs"
                  : "hover:ring-1 hover:ring-blue-300 dark:hover:ring-blue-700"
              }`}
              title="Filter: Sedang Dipinjam"
            >
              <div className="flex items-start justify-between w-full">
                <BookOpen className="text-blue-600 dark:text-blue-400 shrink-0" size={20} strokeWidth={2.5} />
                <span className="text-[26px] sm:text-[28px] font-black leading-none text-blue-600 dark:text-blue-400">
                  {summaryStats.approved}
                </span>
              </div>
              <p className="text-[11px] font-bold text-blue-600 dark:text-blue-400 truncate">Sedang Dipinjam</p>
            </button>

            {/* Card 4: Dikembalikan */}
            <button
              type="button"
              onClick={() => setFilter("returned")}
              className={`bg-muted rounded-2xl p-4 sm:p-5 flex flex-col justify-between h-[100px] text-left transition-all cursor-pointer hover:shadow-xs active:scale-[0.98] ${
                filter === "returned"
                  ? "ring-2 ring-foreground/40 shadow-xs"
                  : "hover:ring-1 hover:ring-foreground/20"
              }`}
              title="Filter: Dikembalikan"
            >
              <div className="flex items-start justify-between w-full">
                <CheckCircle className="text-foreground shrink-0" size={20} strokeWidth={2.5} />
                <span className="text-[26px] sm:text-[28px] font-black leading-none text-foreground">
                  {summaryStats.returned}
                </span>
              </div>
              <p className="text-[11px] font-bold text-foreground truncate">Dikembalikan</p>
            </button>

            {/* Card 5: Terlambat */}
            <button
              type="button"
              onClick={() => setFilter("overdue")}
              className={`bg-red-50 dark:bg-red-950/60 rounded-2xl p-4 sm:p-5 flex flex-col justify-between h-[100px] text-left transition-all cursor-pointer hover:shadow-xs active:scale-[0.98] ${
                filter === "overdue"
                  ? "ring-2 ring-primary shadow-xs"
                  : "hover:ring-1 hover:ring-red-300 dark:hover:ring-red-700"
              }`}
              title="Filter: Terlambat"
            >
              <div className="flex items-start justify-between w-full">
                <XCircle className="text-primary shrink-0" size={20} strokeWidth={2.5} />
                <span className="text-[26px] sm:text-[28px] font-black leading-none text-primary">
                  {summaryStats.overdue}
                </span>
              </div>
              <p className="text-[11px] font-bold text-primary truncate">Terlambat</p>
            </button>

          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-8 mt-6 p-4 bg-warning-bg border border-warning-border rounded-xl">
            <p className="text-sm font-medium text-destructive">{error}</p>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 p-6 md:px-8">
          {loading ? (
            <div className="space-y-4 animate-in fade-in duration-500">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-[140px] w-full rounded-[20px]" />
              ))}
            </div>
          ) : filter === "reservations" ? (
            paginatedReservations.length === 0 ? (
              <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center text-muted-foreground">
                <Clock className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-[15px] font-bold text-muted-foreground">
                  {searchTerm ? "Tidak ada hasil reservasi" : "Tidak ada antrean reservasi saat ini"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {paginatedReservations.map((res) => (
                  <div
                    key={res.id}
                    className="bg-background rounded-[20px] p-6 border border-border hover:bg-card hover:shadow-lg transition-all group"
                  >
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-5">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950 text-amber-600 rounded-xl flex items-center justify-center shrink-0 border border-amber-200 dark:border-amber-800">
                          <Clock size={20} />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-foreground text-[15px] leading-snug">
                            {res.bibliography?.title || "Judul tidak tersedia"}
                          </h4>
                          <div className="flex items-center gap-2 mt-1.5">
                            <User size={13} className="text-muted-foreground" />
                            <span className="text-[13px] font-bold text-muted-foreground">
                              {res.member?.user?.name || "Nama tidak tersedia"}
                            </span>
                            {res.member?.nimNidn && (
                              <span className="text-[11px] font-medium text-muted-foreground bg-card px-2 py-0.5 rounded-md border border-border">
                                {res.member.nimNidn}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400">
                        <Clock size={12} />
                        Antrean Reservasi (Menunggu)
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-card p-4 rounded-xl border border-border text-sm">
                      <div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Pengarang</span>
                        <span className="font-medium text-foreground">{res.bibliography?.author || "-"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Tanggal Diajukan</span>
                        <span className="font-medium text-foreground">
                          {res.createdAt ? new Date(res.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : paginatedLoans.length === 0 ? (
            <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center text-muted-foreground">
              <BookOpen className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-[15px] font-bold text-muted-foreground">
                {searchTerm 
                  ? "Tidak ada hasil pencarian" 
                  : filter === "overdue"
                  ? "Tidak ada peminjaman yang terlambat saat ini"
                  : "Tidak ada data peminjaman"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {paginatedLoans.map((loan) => (
                <div 
                  key={loan.id} 
                  className="bg-background rounded-[20px] p-6 border border-border hover:bg-card hover:shadow-lg hover:shadow-lg transition-all group"
                >
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-5">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-card rounded-xl flex items-center justify-center shrink-0 border border-border group-hover:border-red-100 dark:border-red-900 group-hover:bg-warning-bg transition-colors">
                        <BookOpen className="text-muted-foreground group-hover:text-primary transition-colors" size={20} />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-foreground text-[15px] leading-snug hover:text-primary transition-colors">{loan.item?.bibliography?.title || 'Judul tidak tersedia'}</h4>
                        <div className="flex items-center gap-2 mt-1.5">
                          <User size={13} className="text-muted-foreground" />
                          <span className="text-[13px] font-bold text-muted-foreground">{loan.member?.user?.name || 'Nama tidak tersedia'}</span>
                          {loan.member?.nimNidn && (
                            <span className="text-[11px] font-medium text-muted-foreground bg-card px-2 py-0.5 rounded-md border border-border">{loan.member.nimNidn}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {getStatusBadge(loan.status, loan.dueDate, loan.extensionStatus)}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-card p-4 rounded-xl border border-border">
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Mulai Pinjam</p>
                      <div className="flex items-center gap-2 text-[13px]">
                        <Calendar size={14} className="text-muted-foreground" />
                        <span className="font-bold text-muted-foreground">
                          {loan.loanDate ? new Date(loan.loanDate).toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'}) : '-'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Batas Kembali</p>
                      <div className="flex items-center gap-2 text-[13px]">
                        <Calendar size={14} className="text-muted-foreground" />
                        <span className="font-bold text-primary">
                          {loan.dueDate ? new Date(loan.dueDate).toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'}) : '-'}
                        </span>
                      </div>
                    </div>
                    {(loan.notes || loan.purpose) && (
                      <div className="md:col-span-2 lg:col-span-1">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Catatan Member</p>
                        <span className="text-[13px] font-medium text-foreground bg-muted/60 px-2 py-1 rounded block">{loan.notes || loan.purpose}</span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons - Pending: Setujui / Tolak */}
                  {loan.status === 'pending' && canEdit("loans") && (
                    <div className="flex flex-col sm:flex-row gap-3 pt-5 mt-5 border-t border-border">
                      <button
                        onClick={() => {
                          setSelectedLoan(loan);
                          setActionNotes('');
                        }}
                        disabled={processingId === loan.id}
                        className="flex-1 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-green-600 hover:text-white transition-all disabled:opacity-50"
                      >
                         {processingId === loan.id ? 'Memproses...' : '✓ Setujui Peminjaman'}
                      </button>
                      <button
                        onClick={() => openRejectModal(loan.id)}
                        disabled={processingId === loan.id}
                        className="flex-none bg-card text-muted-foreground border border-border px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-warning-bg hover:text-destructive hover:border-warning-border transition-all disabled:opacity-50"
                      >
                         Tolak
                      </button>
                    </div>
                  )}

                  {/* Action Buttons - Approved */}
                  {(loan.status === 'approved' || loan.status === 'extended') && canEdit("loans") && (
                    <div className="flex flex-wrap items-center gap-3 pt-5 mt-5 border-t border-border">
                      <button
                        type="button"
                        onClick={() => setSelectedLoanReceipt(loan)}
                        className="flex items-center gap-2 bg-primary/10 text-primary border border-primary/20 px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer shadow-2xs"
                        title="Cetak struk bukti sirkulasi peminjaman buku"
                      >
                        <Printer size={14} />
                        Cetak Struk Pinjam
                      </button>

                      <button
                        id={`btn-return-${loan.id}`}
                        onClick={() => navigate(`/dashboard/return-confirmation/${loan.id}`)}
                        className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-600 hover:text-white transition-all disabled:opacity-50"
                      >
                        <RotateCcw size={14} />
                        Proses Pengembalian & TTD
                      </button>

                      {loan.extensionStatus === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApproveExtension(loan.id)}
                            disabled={processingId === loan.id}
                            className="flex items-center gap-2 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-green-600 hover:text-white transition-all disabled:opacity-50"
                          >
                            ✓ Setujui Perpanjangan
                          </button>
                          <button
                            onClick={() => handleRejectExtension(loan.id)}
                            disabled={processingId === loan.id}
                            className="flex items-center gap-2 bg-red-50 dark:bg-red-950 text-primary border border-red-200 dark:border-red-900 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-destructive hover:text-white transition-all disabled:opacity-50"
                          >
                            ✗ Tolak Perpanjangan
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {/* Action Buttons - Returned */}
                  {loan.status === 'returned' && (
                    <div className="flex flex-wrap items-center gap-3 pt-5 mt-5 border-t border-border">
                      <button
                        type="button"
                        onClick={() => setSelectedReceiptLoan(loan)}
                        className="flex items-center gap-2 bg-primary/10 text-primary border border-primary/20 px-4 py-2 rounded-xl text-xs font-bold hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer"
                      >
                        <Printer size={14} />
                        Cetak Resi ({loan.returnReceiptNo || 'BA-RET'})
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
                        className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-600 hover:text-white transition-all cursor-pointer"
                      >
                        <FileDown size={14} />
                        Unduh Berita Acara (PDF)
                      </button>
                    </div>
                  )}

                  {/* Info untuk status lainnya */}
                  {loan.status === 'rejected' && loan.rejectReason && (
                    <div className="mt-4 p-3 bg-warning-bg/50 rounded-xl text-[13px] border border-red-100 dark:border-red-900">
                      <span className="font-bold text-destructive">Alasan Penolakan: </span>
                      <span className="text-destructive font-medium">{loan.rejectReason}</span>
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
                        new Date(returnModalLoan.dueDate).setHours(0, 0, 0, 0) <
                        new Date().setHours(0, 0, 0, 0)
                          ? "text-destructive"
                          : "text-foreground"
                      }`}
                    >
                      {new Date(returnModalLoan.dueDate).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
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
                  <SelectItem value="21">21 Hari (3 Minggu)</SelectItem>
                  <SelectItem value="30">30 Hari (1 Bulan)</SelectItem>
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
