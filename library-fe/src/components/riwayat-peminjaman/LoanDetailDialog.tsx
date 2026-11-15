import {
  AlertCircle,
  Barcode,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  FileDown,
  MapPin,
  RefreshCw,
  RotateCcw,
  Tag,
  XCircle,
} from "lucide-react";
import loanService, { type Loan as LoanData } from "@/services/loanService";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, getLoanTitle, getLoanAuthor } from "./helpers";

export interface LoanDetailDialogProps {
  loan: LoanData;
  type: "active" | "history";
  onClose: () => void;
  onReturnClick?: (loan: LoanData) => void;
  onExtendClick?: (loan: LoanData) => void;
}

export function LoanDetailDialog({
  loan,
  type,
  onClose,
  onReturnClick,
  onExtendClick,
}: LoanDetailDialogProps) {
  const title = getLoanTitle(loan);
  const author = getLoanAuthor(loan);
  const returnPending = loan.returnRequests?.some((r) => r.status === "pending");
  const isReturned = loan.status === "returned";
  const isRejected = loan.status === "rejected";
  const isExtended = loan.status === "extended";
  const isPending = loan.status === "pending";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = loan.dueDate ? new Date(loan.dueDate) : null;
  if (dueDate) dueDate.setHours(0, 0, 0, 0);
  const daysLeft = dueDate
    ? Math.round((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const isLate = !isReturned && !isRejected && daysLeft !== null && daysLeft < 0;

  return (
    <Dialog open={Boolean(loan)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <BookOpen size={18} className="text-primary" />
            {type === "active" ? "Detail Peminjaman Aktif" : "Detail Riwayat Peminjaman"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Informasi lengkap transaksi peminjaman buku.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Book Info Card */}
          <div className="flex gap-3.5 bg-muted/30 p-3 rounded-2xl border border-border">
            <div className="w-14 h-20 bg-muted rounded-xl shrink-0 overflow-hidden flex items-center justify-center border border-border shadow-2xs">
              {loan.item?.bibliography?.image ? (
                <img
                  src={loan.item.bibliography.image}
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
              <Badge
                variant="secondary"
                className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 mb-1 inline-flex items-center gap-1 ${
                  returnPending
                    ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-400"
                    : isReturned
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400"
                    : isRejected
                    ? "bg-destructive/10 text-destructive border-destructive/20"
                    : isLate
                    ? "bg-destructive/10 text-destructive border-destructive/20"
                    : isExtended
                    ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-400"
                    : isPending
                    ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-400"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400"
                }`}
              >
                {returnPending ? (
                  <>
                    <Clock size={10} />
                    Pengembalian Diajukan
                  </>
                ) : isReturned ? (
                  <>
                    <CheckCircle2 size={10} />
                    Dikembalikan
                  </>
                ) : isRejected ? (
                  <>
                    <XCircle size={10} />
                    Ditolak
                  </>
                ) : isLate ? (
                  <>
                    <AlertCircle size={10} />
                    Terlambat {Math.abs(daysLeft!)} Hari
                  </>
                ) : isExtended ? (
                  <>
                    <RefreshCw size={10} />
                    Diperpanjang
                  </>
                ) : isPending ? (
                  <>
                    <Clock size={10} />
                    Menunggu Persetujuan
                  </>
                ) : (
                  <>
                    <BookOpen size={10} />
                    Sedang Dipinjam
                  </>
                )}
              </Badge>
              <h4 className="font-bold text-foreground text-sm leading-snug line-clamp-2">
                {title}
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                {author}
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
                {formatDate(loan.loanDate || loan.createdAt)}
              </p>
            </div>

            <div className="bg-card border border-border p-2.5 rounded-xl">
              <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                <RotateCcw size={11} /> {loan.returnDate ? "Tanggal Kembali" : "Batas Kembali"}
              </span>
              <p className="font-bold text-foreground mt-0.5">
                {formatDate(loan.returnDate || loan.dueDate)}
              </p>
            </div>

            {(loan.item?.itemCode ||
              loan.item?.barcode ||
              loan.item?.uniqueCode) && (
              <div className="bg-card border border-border p-2.5 rounded-xl">
                <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                  <Barcode size={11} /> Kode Eksemplar
                </span>
                <p className="font-bold font-mono text-foreground mt-0.5">
                  {loan.item.itemCode ||
                    loan.item.barcode ||
                    loan.item.uniqueCode}
                </p>
              </div>
            )}

            {loan.item?.location && (
              <div className="bg-card border border-border p-2.5 rounded-xl">
                <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                  <MapPin size={11} /> Lokasi Rak
                </span>
                <p className="font-bold text-foreground mt-0.5">
                  {loan.item.location.room
                    ? `${loan.item.location.room} / ${loan.item.location.rack || "-"}`
                    : "-"}
                </p>
              </div>
            )}
          </div>

          {/* Reject Reason Callout (if rejected) */}
          {loan.rejectReason && (
            <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-xl text-xs space-y-1">
              <span className="text-[10px] font-bold text-destructive uppercase tracking-wider flex items-center gap-1">
                <AlertCircle size={12} /> Alasan Penolakan
              </span>
              <p className="text-foreground font-medium">
                {loan.rejectReason}
              </p>
            </div>
          )}

          {/* Notes Callout */}
          {loan.notes && (
            <div className="bg-muted/40 border border-border p-3 rounded-xl text-xs space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Tag size={12} /> Catatan Peminjaman
              </span>
              <p className="text-foreground font-medium">
                {loan.notes}
              </p>
            </div>
          )}

          {/* Berita Acara Pengembalian Resmi */}
          {isReturned && (
            <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 p-3.5 rounded-2xl text-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-600" />
                  Berita Acara Pengembalian Sah
                </span>
                {loan.returnReceiptNo && (
                  <span className="font-mono text-[10px] bg-background/80 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 font-bold text-foreground">
                    {loan.returnReceiptNo}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-muted-foreground block text-[10px]">Kondisi Fisik:</span>
                  <span className="font-semibold text-foreground">
                    {loan.returnCondition === "good"
                      ? "Baik / Utuh"
                      : loan.returnCondition === "damaged"
                      ? "Rusak"
                      : loan.returnCondition === "lost"
                      ? "Hilang"
                      : "Baik"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Petugas Penerima:</span>
                  <span className="font-semibold text-foreground">
                    {loan.returnStaffName || "Petugas Perpustakaan"}
                  </span>
                </div>
              </div>

              {loan.returnStaffSignature && (
                <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Tanda Tangan Petugas:</span>
                    <img
                      src={loan.returnStaffSignature}
                      alt="Tanda Tangan Petugas"
                      className="h-10 object-contain mt-1 bg-white/80 dark:bg-slate-900/80 rounded border p-1"
                    />
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/60 dark:bg-emerald-900/60 px-2 py-0.5 rounded">
                      <CheckCircle2 size={10} /> Sah & Terverifikasi
                    </span>
                  </div>
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full text-xs font-bold border-emerald-300 text-emerald-800 dark:border-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 mt-1 cursor-pointer"
                onClick={async () => {
                  try {
                    await loanService.downloadReturnReceiptPdf(loan.id);
                  } catch (e: unknown) {
                    console.error("Gagal unduh PDF tanda terima:", e);
                  }
                }}
              >
                <FileDown size={13} className="mr-1.5" />
                Unduh Tanda Terima Pengembalian (PDF)
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row items-center gap-2">
          {type === "active" && !returnPending && (
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto flex-1 rounded-xl text-xs font-bold border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950 cursor-pointer"
              onClick={() => onReturnClick?.(loan)}
            >
              <RotateCcw size={12} className="mr-1.5" />
              Kembalikan
            </Button>
          )}
          {type === "active" && !isLate && loan.status !== "extended" && !returnPending && (
            <Button
              type="button"
              className="w-full sm:w-auto flex-1 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
              onClick={() => onExtendClick?.(loan)}
            >
              <RefreshCw size={12} className="mr-1.5" />
              Perpanjang
            </Button>
          )}
          <Button
            variant="outline"
            className="w-full sm:w-auto rounded-xl text-xs font-bold cursor-pointer"
            onClick={onClose}
          >
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default LoanDetailDialog;
