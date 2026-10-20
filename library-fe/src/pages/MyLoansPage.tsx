// src/pages/MyLoansPage.tsx
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import Navbar from "@/components/ui/navbar";
import Footer from "@/components/Footer";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  RefreshCw,
  BookOpen,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  CalendarDays,
  RotateCcw,
  Barcode,
} from "lucide-react";
import loanService, { type Loan } from "@/services/loanService";
import { authClient } from "@/utils/auth-client";
import { useToast } from "@/hooks/useToast";
import { formatDateID, calcLateDays } from "@/utils/format";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Hitung status visual dari data loan nyata */
function getLoanStatus(loan: Loan): "active" | "warning" | "late" | "returned" | "pending" | "rejected" {
  if (loan.status === "pending") return "pending";
  if (loan.status === "rejected") return "rejected";
  if (loan.status === "returned") return "returned";
  if (loan.status === "approved" || loan.status === "extended") {
    const lateDays = calcLateDays(loan.dueDate);
    if (lateDays > 0) return "late";
    // Segera jatuh tempo: ≤ 7 hari
    const dueDate = new Date(loan.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysLeft = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysLeft <= 7 ? "warning" : "active";
  }
  return "active";
}

const STATUS_CONFIG = {
  active: { label: "Pinjaman Aktif", bg: "bg-green-50", text: "text-green-600", dot: "bg-green-500" },
  warning: { label: "Segera Kembali", bg: "bg-orange-50", text: "text-orange-600", dot: "bg-orange-500" },
  late: { label: "Terlambat", bg: "bg-red-50", text: "text-primary", dot: "bg-red-500" },
  returned: { label: "Dikembalikan", bg: "bg-muted", text: "text-muted-foreground", dot: "bg-muted-foreground" },
  pending: { label: "Menunggu Konfirmasi", bg: "bg-yellow-50", text: "text-yellow-600", dot: "bg-yellow-500" },
  rejected: { label: "Ditolak", bg: "bg-red-50", text: "text-primary", dot: "bg-primary" },
} as const;

type VisualStatus = keyof typeof STATUS_CONFIG;

const FILTER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "all", label: "Semua" },
  { value: "active", label: "Aktif" },
  { value: "warning", label: "Segera Kembali" },
  { value: "late", label: "Terlambat" },
  { value: "pending", label: "Menunggu" },
  { value: "returned", label: "Dikembalikan" },
];

// ─── Sub-component: Status Badge ──────────────────────────────────────────────

function StatusBadge({ status }: { status: VisualStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ─── Sub-component: Booking Countdown Timer ──────────────────────────────────

function BookingCountdownTimer({
  createdAt,
  expiresAt,
  onExpire,
}: {
  createdAt?: string;
  expiresAt?: string;
  onExpire?: () => void;
}) {
  const getRemainingSeconds = useCallback(() => {
    let targetMs: number | null = null;
    if (expiresAt) {
      targetMs = new Date(expiresAt).getTime();
    } else if (createdAt) {
      targetMs = new Date(createdAt).getTime() + 20 * 60 * 1000;
    }
    if (!targetMs || isNaN(targetMs)) return 0;
    const diff = Math.floor((targetMs - Date.now()) / 1000);
    return Math.max(0, diff);
  }, [createdAt, expiresAt]);

  const [remaining, setRemaining] = useState(getRemainingSeconds);

  useEffect(() => {
    setRemaining(getRemainingSeconds());
    const interval = setInterval(() => {
      const sec = getRemainingSeconds();
      setRemaining(sec);
      if (sec <= 0) {
        clearInterval(interval);
        onExpire?.();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [getRemainingSeconds, onExpire]);

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  if (remaining <= 0) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold border border-red-200">
        <Clock size={12} className="text-red-500 shrink-0" />
        <span>Batas Waktu Habis (Expired)</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-900 rounded-full text-xs font-bold border border-amber-300">
      <Clock size={12} className="text-amber-600 shrink-0 animate-pulse" />
      <span>Sisa Waktu: <span className="font-mono text-amber-950 font-extrabold">{mm}:{ss}</span></span>
    </div>
  );
}

// ─── Sub-component: Loan Card ─────────────────────────────────────────────────

interface LoanCardProps {
  loan: Loan;
  status: VisualStatus;
  isExtending: boolean;
  isReturning: boolean;
  isCanceling?: boolean;
  onExtend: (loanId: string) => void;
  onReturn: (loanId: string) => void;
  onCancel: (loanId: string) => void;
  onViewDetail: (loan: Loan) => void;
  onExpire?: () => void;
}

function LoanCard({ loan, status, isExtending, isReturning, isCanceling, onExtend, onReturn, onCancel, onViewDetail, onExpire }: LoanCardProps) {
  const bib = loan.item?.bibliography;
  const title = bib?.title ?? loan.bibliographyTitle ?? "Judul tidak tersedia";
  const author =
    (Array.isArray(bib?.authors) && bib.authors.length > 0
      ? bib.authors.map((a: any) => typeof a === "string" ? a : a.name).filter(Boolean).join(", ")
      : undefined) ||
    (Array.isArray(bib?.bibliographyAuthors) && bib.bibliographyAuthors.length > 0
      ? bib.bibliographyAuthors.map((ba: any) => ba.author?.name || ba.name).filter(Boolean).join(", ")
      : undefined) ||
    bib?.author ||
    bib?.sor ||
    loan.bibliographyAuthor ||
    "Penulis tidak tersedia";

  const itemCode = (loan.item as any)?.itemCode || (loan.item as any)?.barcode || (loan.item as any)?.uniqueCode || (loan as any).itemCode || "-";
  const image = bib?.image;
  const lateDays = calcLateDays(loan.dueDate);

  return (
    <div
      className="bg-card rounded-[24px] p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col"
      onClick={() => onViewDetail(loan)}
    >
      <div className="flex gap-4 mb-5">
        {/* Cover */}
        <div className="w-20 h-28 rounded-xl overflow-hidden shrink-0 bg-linear-to-br from-slate-200 to-slate-300 flex items-center justify-center">
          {image ? (
            <img src={image} alt={title} className="w-full h-full object-cover" />
          ) : (
            <BookOpen className="w-7 h-7 text-slate-400" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-slate-900 leading-snug mb-1 line-clamp-2 text-sm">
            {title}
          </h3>
          <p className="text-[11px] text-slate-500 font-medium mb-1.5 truncate">{author}</p>
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 mb-2">
            <Barcode size={12} className="text-slate-400" />
            <span>Kode: {itemCode}</span>
          </div>
          <div>
            <StatusBadge status={status} />
          </div>
        </div>
      </div>

      {/* Dates */}
      <div className="flex justify-between items-end border-t border-slate-50 pt-4 mb-5 text-[10px]">
        <div>
          <p className="font-bold text-slate-300 uppercase tracking-widest mb-1">Jatuh Tempo</p>
            <p className={`font-bold text-sm ${status === "late" ? "text-primary" : "text-slate-900"}`}>
            {formatDateID(loan.dueDate)}
          </p>
          {loan.loanDate && (
            <p className="text-slate-400 mt-0.5">Dipinjam: {formatDateID(loan.loanDate)}</p>
          )}
        </div>
        {(loan.fine ?? 0) > 0 && (
          <div className="text-right">
            <p className="font-bold text-slate-300 uppercase tracking-widest mb-1">Denda</p>
            <p className="font-bold text-primary text-sm">
              Rp {(loan.fine ?? 0).toLocaleString("id-ID")}
            </p>
            {lateDays > 0 && (
              <p className="text-red-400 mt-0.5">{lateDays} hari terlambat</p>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-auto space-y-2">
        {/* Status Menunggu Konfirmasi Pengembalian */}
        {loan.returnRequests?.some(r => r.status === "pending") ? (
          <div className="w-full bg-yellow-50 text-yellow-700 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2">
            <Clock size={13} />
            MENUNGGU KONFIRMASI PENGEMBALIAN
          </div>
        ) : (status === "active" || status === "warning" || status === "late") ? (
          <div className="flex flex-col gap-2">
            {/* Tombol Perpanjang (jika memenuhi syarat) */}
            {loan.extensionStatus === "pending" ? (
              <div className="w-full bg-purple-50 text-purple-700 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2">
                <Clock size={13} />
                MENUNGGU PERSETUJUAN PERPANJANGAN
              </div>
            ) : loan.extendCount >= 1 ? (
              <div className="w-full bg-slate-100 text-slate-500 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2">
                <CheckCircle size={13} />
                SUDAH DIPERPANJANG (MAKS 1X)
              </div>
            ) : status !== "late" ? (
              <button
                onClick={(e) => { e.stopPropagation(); onExtend(loan.id); }}
                disabled={isExtending || isReturning}
                className="w-full bg-primary hover:bg-primary/90 disabled:bg-slate-200 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <RefreshCw size={13} strokeWidth={3} className={isExtending ? "animate-spin" : ""} />
                {isExtending ? "MEMPROSES..." : "PERPANJANG"}
              </button>
            ) : null}

            {/* Tombol Kembalikan */}
            <button
              onClick={(e) => { e.stopPropagation(); onReturn(loan.id); }}
              disabled={isExtending || isReturning}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <RotateCcw size={13} className={isReturning ? "animate-spin" : ""} />
              {isReturning ? "MEMPROSES..." : "KEMBALIKAN BUKU"}
            </button>
          </div>
        ) : null}

        {status === "pending" && (
          <div className="w-full bg-amber-50/80 border border-amber-200/80 text-amber-900 p-3 rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-2">
            <div className="flex items-center gap-1.5 text-amber-800">
              <Clock size={13} className="text-amber-600" />
              <span>Menunggu Konfirmasi Loket</span>
            </div>
            <BookingCountdownTimer
              createdAt={loan.createdAt}
              expiresAt={loan.verificationExpiresAt}
              onExpire={onExpire}
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCancel(loan.id);
              }}
              disabled={isCanceling}
              className="mt-1 w-full bg-white hover:bg-red-50 text-red-600 border border-red-200 py-1.5 px-3 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all shadow-2xs"
            >
              <XCircle size={12} />
              {isCanceling ? "MEMBATALKAN..." : "Batalkan Pemesanan"}
            </button>
          </div>
        )}

        {status === "returned" && (
          <div className="w-full bg-muted text-muted-foreground py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2">
            <CheckCircle size={13} />
            SUDAH DIKEMBALIKAN
          </div>
        )}

        {status === "rejected" && (
          <div className="w-full bg-red-50 text-primary py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2">
            <XCircle size={13} />
            DITOLAK
          </div>
        )}

        {status === "late" && (
          <div className="w-full bg-red-50 text-primary py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2">
            <AlertCircle size={13} />
            TERLAMBAT — KEMBALIKAN KE PERPUSTAKAAN
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

interface DetailModalProps {
  loan: Loan;
  status: VisualStatus;
  isExtending: boolean;
  isReturning: boolean;
  isCanceling?: boolean;
  onExtend: (id: string) => void;
  onReturn: (id: string) => void;
  onCancel: (id: string) => void;
  onClose: () => void;
  onExpire?: () => void;
}

function DetailModal({ loan, status, isExtending, isReturning, isCanceling, onExtend, onReturn, onCancel, onClose, onExpire }: DetailModalProps) {
  void onExpire;
  const bib = loan.item?.bibliography;
  const title = bib?.title ?? loan.bibliographyTitle ?? "Judul tidak tersedia";
  const author =
    (Array.isArray(bib?.authors) && bib.authors.length > 0
      ? bib.authors.map((a: any) => typeof a === "string" ? a : a.name).filter(Boolean).join(", ")
      : undefined) ||
    (Array.isArray(bib?.bibliographyAuthors) && bib.bibliographyAuthors.length > 0
      ? bib.bibliographyAuthors.map((ba: any) => ba.author?.name || ba.name).filter(Boolean).join(", ")
      : undefined) ||
    bib?.author ||
    bib?.sor ||
    loan.bibliographyAuthor ||
    "Penulis tidak tersedia";

  const itemCode = (loan.item as any)?.itemCode || (loan.item as any)?.barcode || (loan.item as any)?.uniqueCode || (loan as any).itemCode || "-";
  const lateDays = calcLateDays(loan.dueDate);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative min-h-screen flex items-center justify-center p-3 sm:p-4">
        <div className="relative bg-card rounded-3xl w-full max-w-2xl shadow-2xl border border-border overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/80">
            <h2 className="text-base sm:text-lg font-bold text-foreground">Detail Peminjaman</h2>
            <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-xl transition-colors text-muted-foreground hover:text-foreground cursor-pointer">
              <XCircle size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-5 sm:p-6 space-y-4">
            {loan.qrCodeUrl ? (
              <div className="flex flex-col sm:flex-row gap-5 items-stretch">
                {/* Kolom Kiri: Detail Buku & Status */}
                <div className="flex-1 space-y-3.5 flex flex-col justify-between">
                  {/* Info Buku */}
                  <div className="flex items-start gap-3.5">
                    <div className="w-14 h-20 sm:w-16 sm:h-22 rounded-xl overflow-hidden shrink-0 bg-linear-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center border border-border shadow-xs">
                      {loan.item?.bibliography?.image ? (
                        <img src={loan.item.bibliography.image} alt={title} className="w-full h-full object-cover" />
                      ) : (
                        <BookOpen className="w-6 h-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-foreground text-sm sm:text-base leading-snug line-clamp-2">{title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{author}</p>
                      <div className="mt-2">
                        <StatusBadge status={status} />
                      </div>
                    </div>
                  </div>

                  {/* Grid Rincian 2x2 */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/60">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Kode Buku / Item</p>
                      <p className="font-mono font-bold text-foreground text-xs sm:text-sm truncate">{itemCode}</p>
                    </div>
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/60">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Call Number / Rak</p>
                      <p className="font-mono font-bold text-foreground text-xs sm:text-sm truncate">{bib?.callNumber || (loan.item?.location as any)?.rack || "-"}</p>
                    </div>
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/60">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Tanggal Pinjam</p>
                      <p className="font-bold text-foreground text-xs sm:text-sm">{formatDateID(loan.loanDate)}</p>
                    </div>
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/60">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Jatuh Tempo</p>
                      <p className={`font-bold text-xs sm:text-sm ${status === "late" ? "text-primary" : "text-foreground"}`}>
                        {formatDateID(loan.dueDate)}
                      </p>
                    </div>
                  </div>

                  {/* Info Tambahan jika ada */}
                  {loan.returnDate && (
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40 rounded-xl">
                      <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Tanggal Dikembalikan</p>
                      <p className="font-bold text-emerald-700 dark:text-emerald-300 text-xs">{formatDateID(loan.returnDate)}</p>
                    </div>
                  )}

                  {(loan.fine ?? 0) > 0 && (
                    <div className="p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/40 rounded-xl flex items-center gap-2">
                      <AlertCircle className="text-primary w-4 h-4 shrink-0" />
                      <div className="text-xs">
                        <span className="font-bold text-primary">Denda: Rp {(loan.fine ?? 0).toLocaleString("id-ID")}</span>
                        {lateDays > 0 && <span className="text-muted-foreground ml-1">({lateDays} hari × Rp 2.000)</span>}
                      </div>
                    </div>
                  )}

                  {loan.notes && (
                    <div className="p-2 bg-muted/60 rounded-xl text-xs">
                      <span className="font-bold text-muted-foreground uppercase text-[10px] block">Catatan</span>
                      <span className="text-muted-foreground">{loan.notes}</span>
                    </div>
                  )}

                  {loan.rejectReason && (
                    <div className="p-2 bg-red-50 dark:bg-red-950/40 rounded-xl text-xs">
                      <span className="font-bold text-red-500 uppercase text-[10px] block">Alasan Penolakan</span>
                      <span className="text-primary">{loan.rejectReason}</span>
                    </div>
                  )}
                </div>

                {/* Kolom Kanan: Card QR Code Peminjaman */}
                <div className="w-full sm:w-48 md:w-52 shrink-0 flex flex-col items-center justify-center p-3.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/60 rounded-2xl text-center">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">QR Peminjaman</p>
                  <div className="bg-white p-2 rounded-xl border border-slate-200/80 shadow-xs">
                    <img src={loan.qrCodeUrl} alt="QR Code Peminjaman" className="w-32 h-32 sm:w-36 sm:h-36 object-contain" />
                  </div>
                  <p className="text-[11px] font-mono font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full mt-2.5 truncate max-w-full">
                    {itemCode}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">Tunjukkan ke petugas</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Info Buku */}
                <div className="flex items-start gap-3.5">
                  <div className="w-14 h-20 sm:w-16 sm:h-22 rounded-xl overflow-hidden shrink-0 bg-linear-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center border border-border shadow-xs">
                    {loan.item?.bibliography?.image ? (
                      <img src={loan.item.bibliography.image} alt={title} className="w-full h-full object-cover" />
                    ) : (
                      <BookOpen className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-foreground text-sm sm:text-base leading-snug line-clamp-2">{title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{author}</p>
                    <div className="mt-2">
                      <StatusBadge status={status} />
                    </div>
                  </div>
                </div>

                {/* Grid Rincian 4 Kolom */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/60">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Kode Buku / Item</p>
                    <p className="font-mono font-bold text-foreground text-xs sm:text-sm truncate">{itemCode}</p>
                  </div>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/60">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Call Number / Rak</p>
                    <p className="font-mono font-bold text-foreground text-xs sm:text-sm truncate">{bib?.callNumber || (loan.item?.location as any)?.rack || "-"}</p>
                  </div>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/60">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Tanggal Pinjam</p>
                    <p className="font-bold text-foreground text-xs sm:text-sm">{formatDateID(loan.loanDate)}</p>
                  </div>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/60">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Jatuh Tempo</p>
                    <p className={`font-bold text-xs sm:text-sm ${status === "late" ? "text-primary" : "text-foreground"}`}>
                      {formatDateID(loan.dueDate)}
                    </p>
                  </div>
                </div>

                {loan.returnDate && (
                  <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40 rounded-xl">
                    <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Tanggal Dikembalikan</p>
                    <p className="font-bold text-emerald-700 dark:text-emerald-300 text-xs">{formatDateID(loan.returnDate)}</p>
                  </div>
                )}

                {(loan.fine ?? 0) > 0 && (
                  <div className="p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/40 rounded-xl flex items-center gap-2">
                    <AlertCircle className="text-primary w-4 h-4 shrink-0" />
                    <div className="text-xs">
                      <span className="font-bold text-primary">Denda: Rp {(loan.fine ?? 0).toLocaleString("id-ID")}</span>
                      {lateDays > 0 && <span className="text-muted-foreground ml-1">({lateDays} hari × Rp 2.000)</span>}
                    </div>
                  </div>
                )}

                {loan.notes && (
                  <div className="p-2 bg-muted/60 rounded-xl text-xs">
                    <span className="font-bold text-muted-foreground uppercase text-[10px] block">Catatan</span>
                    <span className="text-muted-foreground">{loan.notes}</span>
                  </div>
                )}

                {loan.rejectReason && (
                  <div className="p-2 bg-red-50 dark:bg-red-950/40 rounded-xl text-xs">
                    <span className="font-bold text-red-500 uppercase text-[10px] block">Alasan Penolakan</span>
                    <span className="text-primary">{loan.rejectReason}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer: 1 Baris Sejajar & Pas */}
          <div className="px-5 py-3.5 sm:px-6 sm:py-4 border-t border-border bg-slate-50/50 dark:bg-slate-900/30 flex flex-wrap items-center justify-between gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer"
            >
              Tutup
            </button>

            <div className="flex flex-wrap items-center gap-2 ml-auto">
              {status === "pending" && (
                <button
                  onClick={() => { onCancel(loan.id); onClose(); }}
                  disabled={isCanceling}
                  className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 dark:border-red-900/60 dark:bg-red-950/40 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <XCircle size={15} />
                  <span>{isCanceling ? "Membatalkan..." : "Batalkan Pemesanan"}</span>
                </button>
              )}

              {/* Perpanjang Button / Badge */}
              {!loan.returnRequests?.some(r => r.status === "pending") && (status === "active" || status === "warning" || status === "late") && (
                <>
                  {loan.extensionStatus === "pending" ? (
                    <div className="px-3 py-2 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-900/60 rounded-xl font-bold text-xs flex items-center gap-1.5">
                      <Clock size={14} />
                      <span>Menunggu Perpanjangan</span>
                    </div>
                  ) : loan.extendCount >= 1 ? (
                    <div className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl font-bold text-xs flex items-center gap-1.5">
                      <CheckCircle size={14} />
                      <span>Sudah Diperpanjang</span>
                    </div>
                  ) : status !== "late" ? (
                    <button
                      onClick={() => { onExtend(loan.id); onClose(); }}
                      disabled={isExtending || isReturning}
                      className="px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                    >
                      <RotateCcw size={14} />
                      <span>Perpanjang Buku</span>
                    </button>
                  ) : null}
                </>
              )}

              {/* Kembalikan Button / Badge */}
              {loan.returnRequests?.some(r => r.status === "pending") ? (
                <div className="px-3 py-2 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 rounded-xl font-bold text-xs flex items-center gap-1.5 border border-amber-200 dark:border-amber-900/60">
                  <Clock size={14} />
                  <span>Menunggu Pengembalian</span>
                </div>
              ) : (status === "active" || status === "warning" || status === "late") ? (
                <button
                  onClick={() => { onReturn(loan.id); onClose(); }}
                  disabled={isReturning || isExtending}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                >
                  <RotateCcw size={14} />
                  <span>Kembalikan</span>
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function MyLoansPage() {
  const navigate = useNavigate();
  const { data: session, isPending: sessionLoading } = authClient.useSession();
  const toast = useToast();

  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [extendingId, setExtendingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);

  // ─── Auth guard ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!sessionLoading && !session?.user) {
      navigate("/login");
    }
  }, [sessionLoading, session, navigate]);

  // ─── Fetch loans ─────────────────────────────────────────────────────────────

  const fetchLoans = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const data = await loanService.getMyLoanHistory();
      setLoans(data);
    } catch (err) {
      toast.error(
        "Gagal Memuat Data",
        err instanceof Error ? err.message : "Terjadi kesalahan saat memuat pinjaman"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!sessionLoading && session?.user) {
      fetchLoans();
    }
  }, [sessionLoading, session, fetchLoans]);

  // ─── Perpanjang ──────────────────────────────────────────────────────────────

  const handleExtend = useCallback(async (loanId: string) => {
    setExtendingId(loanId);
    const loadingId = toast.loading("Memproses...", "Sedang mengajukan perpanjangan");
    try {
      // Panggil service perpanjangan baru
      const result = await loanService.extendLoan(loanId);
      
      toast.removeToast(loadingId);
      toast.success("Perpanjangan Berhasil", result.message);
      await fetchLoans(true);
    } catch (err) {

      toast.removeToast(loadingId);
      toast.error(
        "Perpanjangan Gagal",
        err instanceof Error ? err.message : "Terjadi kesalahan"
      );
    } finally {
      setExtendingId(null);
    }
  }, [fetchLoans]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Kembalikan ──────────────────────────────────────────────────────────────

  const [returningId, setReturningId] = useState<string | null>(null);

  const handleReturn = useCallback(async (loanId: string) => {
    setReturningId(loanId);
    const loadingId = toast.loading("Memproses...", "Sedang mengajukan pengembalian buku");
    try {
      const result = await loanService.createReturnRequest(loanId);
      toast.removeToast(loadingId);
      toast.success("Pengembalian Diajukan", result.message || "Menunggu konfirmasi admin");
      await fetchLoans(true);
    } catch (err) {
      toast.removeToast(loadingId);
      toast.error(
        "Pengembalian Gagal",
        err instanceof Error ? err.message : "Terjadi kesalahan"
      );
    } finally {
      setReturningId(null);
    }
  }, [fetchLoans]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Batalkan Pemesanan Pending ───────────────────────────────────────────────

  const [cancelingId, setCancelingId] = useState<string | null>(null);

  const handleCancel = useCallback(async (loanId: string) => {
    setCancelingId(loanId);
    const loadingId = toast.loading("Memproses...", "Sedang membatalkan pemesanan buku");
    try {
      const result = await loanService.cancelLoan(loanId);
      toast.removeToast(loadingId);
      toast.success("Pemesanan Dibatalkan", result.message || "Pemesanan berhasil dibatalkan");
      await fetchLoans(true);
    } catch (err) {
      toast.removeToast(loadingId);
      toast.error(
        "Pembatalan Gagal",
        err instanceof Error ? err.message : "Terjadi kesalahan"
      );
    } finally {
      setCancelingId(null);
    }
  }, [fetchLoans]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Computed data ────────────────────────────────────────────────────────────

  const loansWithStatus = loans.map((loan) => ({
    loan,
    status: getLoanStatus(loan) as VisualStatus,
  }));

  const filteredLoans = loansWithStatus.filter(({ loan, status }) => {
    const title = (loan.item?.bibliography?.title ?? loan.bibliographyTitle ?? "").toLowerCase();
    const author = (loan.item?.bibliography?.author ?? loan.bibliographyAuthor ?? "").toLowerCase();
    const q = searchTerm.toLowerCase();
    const matchesSearch = title.includes(q) || author.includes(q);
    if (filterStatus === "all") return matchesSearch;
    return matchesSearch && status === filterStatus;
  });

  const stats = {
    active: loansWithStatus.filter((l) => l.status === "active").length,
    warning: loansWithStatus.filter((l) => l.status === "warning").length,
    late: loansWithStatus.filter((l) => l.status === "late").length,
    pending: loansWithStatus.filter((l) => l.status === "pending").length,
    returned: loansWithStatus.filter((l) => l.status === "returned").length,
    totalFine: loans.reduce((acc, l) => acc + (l.fine ?? 0), 0),
  };

  const user = session?.user;

  // ─── Loading state ────────────────────────────────────────────────────────────

  if (sessionLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-7xl mx-auto px-4 md:px-6 py-10 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <Skeleton className="lg:col-span-2 h-40 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
          </div>
          <Skeleton className="h-14 rounded-xl mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-[24px]" />
            ))}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 md:px-6 py-10 w-full">

        {/* ── TOP SECTION ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Search */}
          <div className="lg:col-span-2 bg-card p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-slate-800">Cari Pinjaman</h2>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="lg:hidden text-slate-400 hover:text-primary transition-colors"
              >
                <Filter size={18} />
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Ketik judul atau penulis..."
                className="w-full pl-12 pr-4 py-3 bg-card border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary text-sm text-slate-900 placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* User Card */}
          <div className="bg-card p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-14 h-14 bg-linear-to-br from-red-500 to-red-700 rounded-full shrink-0 flex items-center justify-center text-white font-bold text-lg">
              {user?.name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-slate-900 truncate">{user?.name}</h3>
              <p className="text-xs text-slate-400 mb-3 truncate">{user?.email}</p>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-slate-400 uppercase tracking-widest">Pinjaman Aktif</span>
                  <span className="text-primary">{stats.active + stats.warning + stats.late} buku</span>
                </div>
                {stats.totalFine > 0 && (
                  <p className="text-[10px] text-primary font-medium pt-1">
                    ⚠ Denda: Rp {stats.totalFine.toLocaleString("id-ID")}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── FILTER BAR ── */}
        <div className={`mb-6 transition-all duration-300 ${showFilters ? "block" : "hidden lg:block"}`}>
          <div className="bg-card rounded-xl border border-slate-100 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Filter:</span>
              {FILTER_OPTIONS.map((opt) => {
                const count =
                  opt.value === "all"
                    ? loans.length
                    : loansWithStatus.filter((l) => l.status === opt.value).length;
                const isActive = filterStatus === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setFilterStatus(opt.value)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                      isActive
                        ? "bg-primary text-white"
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {opt.label} ({count})
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── HEADER ── */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black text-slate-900">Pinjaman Saya</h1>
          <div className="flex items-center gap-3">
            <p className="text-sm text-slate-400 hidden sm:block">
              {filteredLoans.length} dari {loans.length} pinjaman
            </p>
            <button
              onClick={() => fetchLoans(true)}
              disabled={refreshing}
              className="p-2.5 bg-card border border-slate-200 rounded-xl hover:bg-slate-50 transition-all disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw size={15} className={`text-slate-500 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* ── CONTENT ── */}
        {filteredLoans.length === 0 ? (
          <div className="bg-card rounded-2xl border border-slate-100 p-12 text-center">
            <CalendarDays className="w-14 h-14 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-800 mb-2">Tidak Ada Pinjaman</h3>
            <p className="text-slate-400 text-sm mb-6 max-w-md mx-auto">
              {searchTerm
                ? `Tidak ditemukan pinjaman dengan kata kunci "${searchTerm}"`
                : filterStatus !== "all"
                  ? `Tidak ada pinjaman dengan status "${FILTER_OPTIONS.find((o) => o.value === filterStatus)?.label}"`
                  : "Anda belum memiliki pinjaman buku. Kunjungi katalog untuk meminjam."}
            </p>
            {(searchTerm || filterStatus !== "all") && (
              <button
                onClick={() => { setSearchTerm(""); setFilterStatus("all"); }}
                className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-all"
              >
                Reset Filter
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLoans.map(({ loan, status }) => (
              <LoanCard
                key={loan.id}
                loan={loan}
                status={status}
                isExtending={extendingId === loan.id}
                isReturning={returningId === loan.id}
                isCanceling={cancelingId === loan.id}
                onExtend={handleExtend}
                onReturn={handleReturn}
                onCancel={handleCancel}
                onViewDetail={setSelectedLoan}
                onExpire={() => fetchLoans(true)}
              />
            ))}
          </div>
        )}
      </main>

      {/* ── Detail Modal ── */}
      {selectedLoan && (
        <DetailModal
          loan={selectedLoan}
          status={getLoanStatus(selectedLoan) as VisualStatus}
          isExtending={extendingId === selectedLoan.id}
          isReturning={returningId === selectedLoan.id}
          isCanceling={cancelingId === selectedLoan.id}
          onExtend={handleExtend}
          onReturn={handleReturn}
          onCancel={handleCancel}
          onClose={() => setSelectedLoan(null)}
          onExpire={() => fetchLoans(true)}
        />
      )}

      <Footer />
    </div>
  );
}