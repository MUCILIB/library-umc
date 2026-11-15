import { Download } from "lucide-react";
import Modal from "@/components/ui/modal";
import { itemApi, type Item } from "@/api/client";

export interface ItemQrModalProps {
  isOpen: boolean;
  item: Item | null;
  onClose: () => void;
}

export function ItemQrModal({ isOpen, item, onClose }: ItemQrModalProps) {
  if (!item) return null;

  return (
    <Modal
      isOpen={isOpen && !!item}
      onClose={onClose}
      title="QR Code Salinan (Exemplar)"
      size="md"
    >
      <div className="space-y-4 p-4">
        {/* Detail Buku Singkat */}
        <div className="p-3 bg-muted rounded-xl border border-border/50">
          <p className="font-bold text-sm text-foreground line-clamp-1">
            {item.bibliography?.title || "Buku"}
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground font-medium">
            <span>
              Kode Item:{" "}
              <span className="font-mono font-bold text-foreground">
                {item.itemCode}
              </span>
            </span>
            {item.inventoryCode && (
              <span>
                No. Inventaris:{" "}
                <span className="font-mono text-foreground">
                  {item.inventoryCode}
                </span>
              </span>
            )}
            {item.callNumber && (
              <span>
                No. Panggil:{" "}
                <span className="font-mono text-foreground">
                  {item.callNumber}
                </span>
              </span>
            )}
          </div>
        </div>

        {/* QR Code Frame */}
        <div className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-muted/30 rounded-2xl border border-border">
          <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-200 dark:border-border">
            <img
              src={itemApi.getQrSvg(item.id)}
              alt="QR Code"
              className="w-48 h-48 object-contain"
            />
          </div>
          <span className="mt-4 font-mono font-extrabold text-base text-foreground tracking-wider">
            {item.itemCode}
          </span>
          <span
            className={`mt-1.5 px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
              item.status === "available"
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                : "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
            }`}
          >
            Status: {item.status === "available" ? "Tersedia" : "Dipinjam"}
          </span>
        </div>

        {/* Tombol Aksi */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            <a
              href={itemApi.getQrPng(item.id)}
              target="_blank"
              rel="noreferrer"
              download={`QR-${item.itemCode}.png`}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <Download className="size-3.5" />
              <span>Unduh PNG</span>
            </a>
            <a
              href={itemApi.getQrSvg(item.id)}
              target="_blank"
              rel="noreferrer"
              download={`QR-${item.itemCode}.svg`}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <Download className="size-3.5" />
              <span>Unduh SVG</span>
            </a>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-lg border border-border px-4 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default ItemQrModal;
