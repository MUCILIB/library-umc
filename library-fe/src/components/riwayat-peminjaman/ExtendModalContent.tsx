import { Clock, RefreshCw } from "lucide-react";
import { formatDate, getLoanTitle, getLoanAuthor } from "./helpers";
import type { ActionModalContentProps } from "./ReturnModalContent";

export function ExtendModalContent({
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
          <span className="font-semibold text-muted-foreground">Batas Kembali Saat Ini</span>
          <span className="font-bold text-foreground">
            {formatDate(loan.dueDate)}
          </span>
        </div>
      </div>

      <div className="p-3.5 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl flex items-start gap-3 text-xs text-purple-700 dark:text-purple-300">
        <Clock className="size-4 shrink-0 mt-0.5 text-purple-600 dark:text-purple-400" />
        <div className="space-y-1">
          <p className="font-bold">Ketentuan Perpanjangan</p>
          <p className="text-muted-foreground text-[11px] leading-relaxed">
            Masa peminjaman buku akan diperpanjang sesuai ketentuan perpustakaan. Pastikan buku tidak melewati batas waktu dan tidak dalam antrean reservasi anggota lain.
          </p>
        </div>
      </div>

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
          id="btn-confirm-user-extend"
          onClick={onConfirm}
          disabled={loading}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {loading ? (
            <RefreshCw className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          <span>{loading ? "Memproses..." : "Perpanjang Sekarang"}</span>
        </button>
      </div>
    </div>
  );
}

export default ExtendModalContent;
