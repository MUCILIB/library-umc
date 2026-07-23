// src/components/dashboard/LoansSection.tsx
import { useState, useEffect, Fragment } from "react";
import {
  Clock,
  CheckCircle,
  XCircle,
  BookOpen,
  Search,
  User,
  Calendar,
  ChevronDown,
  RefreshCw,
  RotateCcw,
  AlertTriangle,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { API_BASE_URL } from "@/utils/api-config";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/useToast";


interface Loan {
  id: string;
  itemId: string;
  memberId: string;
  loanDate: string;
  dueDate: string;
  returnDate?: string | null;
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
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "returned" | "pending_extension">("pending");
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
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

  useEffect(() => {
    fetchLoans();
    setCurrentPage(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const fetchLoans = async () => {
    setLoading(true);
    setError(null);
    try {
      let statusParam = "";
      if (filter === "pending_extension") {
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
    if (status === 'approved' && dueDate) {
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
  const filteredLoans = Array.isArray(loans) 
    ? loans.filter(loan => {
        if (!loan) return false;
        
        if (filter === "pending_extension" && loan.extensionStatus !== "pending") {
          return false;
        }
        
        const bookTitle = loan.item?.bibliography?.title?.toLowerCase() || '';
        const borrowerName = loan.member?.user?.name?.toLowerCase() || '';
        const borrowerNim = loan.member?.nimNidn?.toString() || '';
        const searchLower = searchTerm.toLowerCase();
        
        return bookTitle.includes(searchLower) ||
               borrowerName.includes(searchLower) ||
               borrowerNim.includes(searchTerm);
      })
    : [];

  // Pagination Logic
  const totalPages = Math.max(1, Math.ceil(filteredLoans.length / itemsPerPage));
  const paginatedLoans = filteredLoans.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Hitung statistik dengan pengecekan keamanan
  const stats = {
    pending: Array.isArray(loans) ? loans.filter(l => l?.status === 'pending').length : 0,
    approved: Array.isArray(loans) ? loans.filter(l => (l?.status === 'approved' || l?.status === 'extended') && new Date(l.dueDate).setHours(0,0,0,0) >= new Date().setHours(0,0,0,0)).length : 0,
    overdue: Array.isArray(loans) ? loans.filter(l => (l?.status === 'approved' || l?.status === 'extended') && new Date(l.dueDate).setHours(0,0,0,0) < new Date().setHours(0,0,0,0)).length : 0,
    returned: Array.isArray(loans) ? loans.filter(l => l?.status === 'returned').length : 0,
  };

  return (
    <div className="w-full">
      {/* Main Container */}
      <div className="bg-card rounded-[24px] border border-border shadow-sm overflow-hidden flex flex-col min-h-[600px]">
        
        {/* Header Controls */}
        <div className="p-6 md:px-8 border-b border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <h2 className="text-[20px] font-extrabold text-foreground tracking-tight">Peminjaman & Persetujuan</h2>
          
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Filter Status */}
            <div className="relative">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as "all" | "pending" | "approved" | "returned" | "pending_extension")}
                className="appearance-none bg-background border-none rounded-xl pl-4 pr-10 py-2.5 text-[13px] font-bold text-muted-foreground focus:ring-2 focus:ring-primary/10 cursor-pointer min-w-[200px]"
              >
                <option value="pending">Menunggu Persetujuan</option>
                <option value="pending_extension">Menunggu Perpanjangan</option>
                <option value="approved">Sedang Dipinjam</option>
                <option value="returned">Dikembalikan</option>
                <option value="all">Semua</option>
              </select>
              <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" strokeWidth={3} />
            </div>
            
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
              onClick={fetchLoans}
              className="w-10 h-10 bg-background rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all flex items-center justify-center shrink-0"
              title="Refresh data"
            >
              <RefreshCw size={16} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Stats Cards Row */}
        <div className="p-6 md:px-8 border-b border-border">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Card: Menunggu Persetujuan */}
            <div className="bg-yellow-50 dark:bg-yellow-950 rounded-2xl p-5 flex flex-col justify-between h-[100px]">
              <div className="flex items-start justify-between w-full">
                <Clock className="text-yellow-700 dark:text-yellow-400" size={20} strokeWidth={2.5} />
                <span className="text-[28px] font-black leading-none text-yellow-700 dark:text-yellow-400">
                  {stats.pending}
                </span>
              </div>
              <p className="text-[11px] font-bold text-yellow-700 dark:text-yellow-400">Menunggu Persetujuan</p>
            </div>

            {/* Card: Sedang Dipinjam (Approved & Not Overdue) */}
            <div className="bg-blue-50 dark:bg-blue-950 rounded-2xl p-5 flex flex-col justify-between h-[100px]">
              <div className="flex items-start justify-between w-full">
                <BookOpen className="text-blue-600 dark:text-blue-400" size={20} strokeWidth={2.5} />
                <span className="text-[28px] font-black leading-none text-blue-600 dark:text-blue-400">
                  {stats.approved}
                </span>
              </div>
              <p className="text-[11px] font-bold text-blue-600 dark:text-blue-400">Sedang Dipinjam</p>
            </div>

            {/* Card: Dikembalikan */}
            <div className="bg-muted rounded-2xl p-5 flex flex-col justify-between h-[100px]">
              <div className="flex items-start justify-between w-full">
                <CheckCircle className="text-foreground" size={20} strokeWidth={2.5} />
                <span className="text-[28px] font-black leading-none text-foreground">
                  {stats.returned}
                </span>
              </div>
              <p className="text-[11px] font-bold text-foreground">Dikembalikan</p>
            </div>

            {/* Card: Terlambat */}
            <div className="bg-red-50 dark:bg-red-950 rounded-2xl p-5 flex flex-col justify-between h-[100px]">
              <div className="flex items-start justify-between w-full">
                <XCircle className="text-primary" size={20} strokeWidth={2.5} />
                <span className="text-[28px] font-black leading-none text-primary">
                  {stats.overdue}
                </span>
              </div>
              <p className="text-[11px] font-bold text-primary">Terlambat</p>
            </div>

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
          ) : paginatedLoans.length === 0 ? (
            <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center text-muted-foreground">
              <BookOpen className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-[15px] font-bold text-muted-foreground">
                {searchTerm 
                  ? "Tidak ada hasil pencarian" 
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
                    {loan.purpose && (
                      <div className="md:col-span-2 lg:col-span-1">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Tujuan / Catatan</p>
                        <span className="text-[13px] font-medium text-muted-foreground truncate block">{loan.purpose}</span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons - Pending: Setujui / Tolak */}
                  {loan.status === 'pending' && (
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

                  {/* Action Buttons - Approved / Extended */}
                  {(loan.status === 'approved' || loan.status === 'extended') && (
                    <div className="flex flex-wrap items-center gap-3 pt-5 mt-5 border-t border-border">
                      <button
                        id={`btn-return-${loan.id}`}
                        onClick={() => {
                          setReturnModalLoan(loan);
                          setReturnResult(null);
                        }}
                        disabled={processingId === loan.id}
                        className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-600 hover:text-white transition-all disabled:opacity-50"
                      >
                        <RotateCcw size={14} />
                        {processingId === loan.id ? 'Memproses...' : 'Proses Pengembalian'}
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
        {totalPages > 1 && (
          <div className="p-6 md:px-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground font-medium">
              Menampilkan {Math.min((currentPage - 1) * itemsPerPage + 1, filteredLoans.length)}–
              {Math.min(currentPage * itemsPerPage, filteredLoans.length)} dari {filteredLoans.length} data
            </p>
            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-2 text-sm font-bold text-muted-foreground hover:text-muted-foreground hover:bg-surface-hover rounded-xl transition-all disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ChevronLeft size={16} /> Prev
              </button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .map((p, idx, arr) => {
                  const showDot = idx > 0 && arr[idx - 1] !== p - 1;
                  return (
                    <Fragment key={p}>
                      {showDot && <span className="px-2 text-muted-foreground">...</span>}
                      <button
                        onClick={() => setCurrentPage(p)}
                        className={`w-10 h-10 flex items-center justify-center rounded-xl text-sm font-bold transition-all ${
                          currentPage === p
                            ? "bg-primary text-white shadow-md shadow-red-500/20"
                            : "text-muted-foreground hover:bg-surface-hover hover:text-muted-foreground"
                        }`}
                      >
                        {p}
                      </button>
                    </Fragment>
                  );
                })}

              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-3 py-2 text-sm font-bold text-muted-foreground hover:text-muted-foreground hover:bg-surface-hover rounded-xl transition-all disabled:opacity-30 disabled:hover:bg-transparent"
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal: Approve Loan ── */}
      {selectedLoan && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-card rounded-[24px] p-6 max-w-md w-full shadow-2xl animate-slide-up">
            <h3 className="text-[18px] font-extrabold text-foreground mb-5">Setujui Peminjaman</h3>

            <div className="space-y-4 mb-6">
              <div className="p-4 bg-muted rounded-xl space-y-3 border border-border">
                <p className="text-[13px] text-muted-foreground flex justify-between">
                  <span className="font-bold text-muted-foreground">Buku</span>
                  <span className="font-bold text-foreground text-right">{selectedLoan.item?.bibliography?.title}</span>
                </p>
                <div className="h-px bg-muted"></div>
                <p className="text-[13px] text-muted-foreground flex justify-between">
                  <span className="font-bold text-muted-foreground">Peminjam</span>
                  <span className="font-bold text-foreground text-right">
                    {selectedLoan.member?.user?.name} <span className="text-muted-foreground">({selectedLoan.member?.nimNidn})</span>
                  </span>
                </p>
              </div>

              <div>
                <label className="text-[12px] font-bold text-muted-foreground mb-2 block">Catatan Tambahan (Opsional)</label>
                <textarea
                  placeholder="Opsional, berikan pesan ke mahasiswa..."
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-[13px] text-foreground font-medium focus:ring-2 focus:ring-green-500/20 focus:border-green-500/40 transition-all outline-none"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setSelectedLoan(null); setActionNotes(''); }}
                className="flex-1 px-4 py-3 bg-card border border-border rounded-xl text-[13px] font-bold text-muted-foreground hover:bg-surface-hover transition-all"
              >
                Batal
              </button>
              <button
                onClick={() => handleApprove(selectedLoan.id)}
                disabled={processingId === selectedLoan.id}
                className="flex-1 bg-green-600 text-white px-4 py-3 rounded-xl text-[13px] font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-600/20 disabled:opacity-50"
              >
                {processingId === selectedLoan.id ? 'Memproses...' : 'Setujui Sekarang'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Return Book ── */}
      {returnModalLoan && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-card rounded-[24px] p-6 max-w-md w-full shadow-2xl animate-slide-up">
            {returnResult ? (
              <>
                {/* ── Result State ── */}
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                  returnResult.isLate ? 'bg-orange-100 dark:bg-orange-900' : 'bg-green-100 dark:bg-green-900'
                }`}>
                  {returnResult.isLate
                    ? <AlertTriangle size={28} className="text-orange-500 dark:text-orange-400" />
                    : <CheckCircle size={28} className="text-green-500" />
                  }
                </div>
                <h3 className="text-[18px] font-extrabold text-foreground mb-3 text-center">
                  {returnResult.isLate ? 'Pengembalian Terlambat' : 'Buku Berhasil Dikembalikan!'}
                </h3>
                <p className="text-sm text-muted-foreground font-medium text-center leading-relaxed mb-6">
                  {returnResult.message}
                </p>
                <button
                  onClick={() => { setReturnModalLoan(null); setReturnResult(null); }}
                  className="w-full bg-primary hover:bg-primary/90 text-white px-4 py-3 rounded-xl text-[13px] font-bold transition-all"
                >
                  Tutup
                </button>
              </>
            ) : (
              <>
                {/* ── Confirm State ── */}
                <h3 className="text-[18px] font-extrabold text-foreground mb-5">Konfirmasi Pengembalian Buku</h3>

                <div className="p-4 bg-muted rounded-xl space-y-3 border border-border mb-6">
                  <p className="text-[13px] text-muted-foreground flex justify-between items-center">
                    <span className="font-bold text-muted-foreground">Kode Buku</span>
                    <span className="font-mono font-bold text-primary px-2 py-0.5 bg-primary/10 rounded border border-primary/20 text-xs">
                      {returnModalLoan.item?.itemCode || returnModalLoan.item?.barcode || (returnModalLoan as any).itemCode || "-"}
                    </span>
                  </p>
                  <div className="h-px bg-muted"></div>
                  <p className="text-[13px] text-muted-foreground flex justify-between">
                    <span className="font-bold text-muted-foreground">Judul Buku</span>
                    <span className="font-bold text-foreground text-right max-w-[60%] truncate">{returnModalLoan.item?.bibliography?.title || returnModalLoan.bibliographyTitle || "-"}</span>
                  </p>
                  <div className="h-px bg-muted"></div>
                  <p className="text-[13px] text-muted-foreground flex justify-between">
                    <span className="font-bold text-muted-foreground">Peminjam</span>
                    <span className="font-bold text-foreground">{returnModalLoan.member?.user?.name || returnModalLoan.memberName || "-"}</span>
                  </p>
                  <div className="h-px bg-muted"></div>
                  <p className="text-[13px] text-muted-foreground flex justify-between">
                    <span className="font-bold text-muted-foreground">Batas Kembali</span>
                    <span className={`font-bold ${
                      new Date(returnModalLoan.dueDate).setHours(0,0,0,0) < new Date().setHours(0,0,0,0)
                        ? 'text-destructive' : 'text-foreground'
                    }`}>
                      {new Date(returnModalLoan.dueDate).toLocaleDateString('id-ID', {day:'numeric',month:'long',year:'numeric'})}
                    </span>
                  </p>
                </div>

                <p className="text-[12px] text-muted-foreground font-medium mb-5 text-center">
                  Denda keterlambatan: <strong className="text-primary">Rp 500 / hari</strong> jika melewati batas kembali.
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => setReturnModalLoan(null)}
                    className="flex-1 px-4 py-3 bg-card border border-border rounded-xl text-[13px] font-bold text-muted-foreground hover:bg-surface-hover transition-all"
                  >
                    Batal
                  </button>
                  <button
                    id="btn-confirm-return"
                    onClick={() => handleReturn(returnModalLoan.id)}
                    disabled={processingId === returnModalLoan.id}
                    className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-xl text-[13px] font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <RotateCcw size={14} />
                    {processingId === returnModalLoan.id ? 'Memproses...' : 'Kembalikan Buku'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Modal: Reject Loan (menggantikan prompt() native) ── */}
      {rejectModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-card rounded-[24px] p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-[18px] font-extrabold text-foreground mb-2">Tolak Peminjaman</h3>
            <p className="text-sm text-muted-foreground mb-5">Berikan alasan penolakan yang jelas kepada peminjam.</p>

            <textarea
              autoFocus
              value={rejectModal.reason}
              onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
              placeholder="Contoh: Buku sedang dalam perbaikan, kartu tidak valid, dll."
              className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-[13px] font-medium focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-all outline-none mb-5 resize-none"
              rows={3}
            />

            <div className="flex gap-3">
              <button
                onClick={() => setRejectModal(null)}
                className="flex-1 px-4 py-3 bg-card border border-border rounded-xl text-[13px] font-bold text-muted-foreground hover:bg-surface-hover transition-all"
              >
                Batal
              </button>
              <button
                onClick={handleReject}
                className="flex-1 bg-destructive text-white px-4 py-3 rounded-xl text-[13px] font-bold hover:bg-destructive/90 transition-all shadow-lg shadow-red-600/20"
              >
                Tolak Peminjaman
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
