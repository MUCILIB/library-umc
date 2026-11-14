import { Trash2, AlertTriangle, Loader2 } from "lucide-react";
import Modal from "@/components/ui/modal";
import type { Bibliography } from "@/api/client";

export interface DeleteBibliographyDialogProps {
  bib: Bibliography | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

export function DeleteBibliographyDialog({
  bib,
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
}: DeleteBibliographyDialogProps) {
  if (!isOpen || !bib) return null;

  const itemCount = bib.totalItems ?? 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Hapus Bibliografi" size="md">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-foreground">
              Konfirmasi Penghapusan Bibliografi
            </h4>
            <p className="text-xs text-muted-foreground">
              Apakah Anda yakin ingin menghapus data buku{" "}
              <span className="font-semibold text-foreground">"{bib.title}"</span>?
            </p>
          </div>
        </div>

        {itemCount > 0 ? (
          <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3.5 space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-amber-700 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Peringatan Eksemplar Fisik Aktif</span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Bibliografi ini memiliki{" "}
              <strong className="text-foreground">{itemCount} eksemplar fisik aktif</strong>.
              Menghapus bibliografi ini akan{" "}
              <strong className="text-destructive font-semibold">sekaligus menghapus seluruh eksemplar fisik terkait</strong>{" "}
              dari sistem sirkulasi dan katalog perpustakaan.
            </p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground bg-muted/40 p-3 rounded-xl border border-border">
            Bibliografi ini belum memiliki eksemplar fisik. Menghapusnya aman dan tidak memengaruhi sirkulasi.
          </p>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            data-testid="confirm-delete-bib-btn"
            className="rounded-xl bg-destructive px-4 py-2 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90 transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Menghapus...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Bibliografi</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default DeleteBibliographyDialog;
