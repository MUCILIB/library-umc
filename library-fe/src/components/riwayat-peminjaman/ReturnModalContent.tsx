import { AlertCircle, RefreshCw, RotateCcw } from "lucide-react";
import type { Loan as LoanData } from "@/services/loanService";
import { formatDate, getLoanTitle, getLoanAuthor } from "./helpers";

export interface ActionModalContentProps {
  loan: LoanData;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ReturnModalContent({
  loan,
  loading,
  onClose,
  onConfirm,
}: ActionModalContentProps) {
  const title = getLoanTitle(loan);
  const author = getLoanAuthor(loan);
  const itemCode =
    loan.item?.itemCode ||
    loan.item?.barcode ||
    loan.item?.uniqueCode;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = loan.dueDate ? new Date(loan.dueDate) : null;
  if (dueDate) dueDate.setHours(0, 0, 0, 0);

  const daysLeft = dueDate
    ? Math.round((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const isLate = daysLeft !== null && daysLeft < 0;

  return (
    <div className="space-y-4 p-2">
      <div className="p-4 bg-muted/60 rounded-xl space-y-3 border border-border">
        <div className="text-[13px] text-muted-foreground flex justify-between items-center">
          <span className="font-semibold text-muted-foreground">Judul Buku</span>
          <span className="font-bold text-foreground text-right max-w-[65%] truncate">
            {title}
          </span>
        </div>
        <div className="h-px bg-border"></div>
        <div className="text-[13px] text-muted-foreground flex justify-between items-center">
          <span className="font-semibold text-muted-foreground">Penulis</span>
          <span className="font-bold text-foreground text-right max-w-[65%] truncate">
            {author}
          </span>
        </div>
        {itemCode && (
          <>
            <div className="h-px bg-border"></div>
            <div className="text-[13px] text-muted-foreground flex justify-between items-center">
              <span className="font-semibold text-muted-foreground">Kode Eksemplar</span>
              <span className="font-mono font-bold text-primary px-2 py-0.5 bg-primary/10 rounded border border-primary/20 text-xs">
                {itemCode}
              </span>
            </div>
          </>
        )}
        <div className="h-px bg-border"></div>
        <div className="text-[13px] text-muted-foreground flex justify-between items-center">
          <span className="font-semibold text-muted-foreground">Batas Kembali</span>
          <span
            className={`font-bold ${
              isLate ? "text-destructive" : "text-foreground"
            }`}
          >
            {formatDate(loan.dueDate)}
          </span>
        </div>
      </div>

      {isLate ? (
        <div className="p-3.5 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-3 text-xs text-destructive">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">
              Peminjaman Melewati Batas Waktu ({Math.abs(daysLeft!)} hari)
            </p>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              Denda keterlambatan Rp 500/hari akan tercatat dan dapat Anda selesaikan melalui menu Denda atau langsung ke meja sirkulasi perpustakaan.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl flex items-start gap-3 text-xs text-blue-700 dark:text-blue-300">
          <RotateCcw className="size-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
          <div className="space-y-1">
            <p className="font-bold">Pengajuan Pengembalian</p>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              Setelah konfirmasi ini diajukan, silakan serahkan fisik buku ke meja sirkulasi perpustakaan untuk diverifikasi oleh petugas.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="h-9 rounded-lg border border-border px-4 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
        >
          Batal
        </button>
        <button
          type="button"
          id="btn-confirm-user-return"
          onClick={onConfirm}
          disabled={loading}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {loading ? (
            <RefreshCw className="size-4 animate-spin" />
          ) : (
            <RotateCcw className="size-4" />
          )}
          <span>{loading ? "Memproses..." : "Ajukan Pengembalian"}</span>
        </button>
      </div>
    </div>
  );
}

export default ReturnModalContent;
