import { useEffect, useMemo, useState } from "react";
import { Download, Loader2, Printer, CheckSquare, Square, AlertCircle } from "lucide-react";
import Modal from "@/components/ui/modal";
import { bibliographyApi, type Bibliography, type Item } from "@/api/client";
import { useToast } from "@/hooks/useToast";
import { encodeCode128SvgData } from "@/utils/code128";
import { cn } from "@/lib/utils";

export interface PrintBookLabelsModalProps {
  bib: Bibliography | null;
  onClose: () => void;
}

const LABELS_PER_PAGE_OPTIONS = [
  { value: 4, label: "4 Label / Lembar", grid: "2 × 2" },
  { value: 6, label: "6 Label / Lembar (Standar)", grid: "2 × 3" },
  { value: 8, label: "8 Label / Lembar", grid: "2 × 4" },
  { value: 10, label: "10 Label / Lembar", grid: "2 × 5" },
  { value: 12, label: "12 Label / Lembar", grid: "2 × 6" },
] as const;

export function PrintBookLabelsModal({ bib, onClose }: PrintBookLabelsModalProps) {
  const { success: toastSuccess, error: toastError } = useToast();
  const [fullBib, setFullBib] = useState<Bibliography | null>(bib);
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [perPage, setPerPage] = useState<number>(6);
  const [loading, setLoading] = useState<boolean>(false);
  const [downloading, setDownloading] = useState<"download" | "print" | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!bib) return;
    setFullBib(bib);
    setLoadError(null);
    const initialItems = ((bib as any).items as Item[] | undefined) || [];
    if (initialItems.length > 0) {
      setItems(initialItems);
      setSelectedItemIds(new Set(initialItems.map((i) => i.id)));
    } else {
      setItems([]);
      setSelectedItemIds(new Set());
    }

    let active = true;
    setLoading(true);
    Promise.all([
      bibliographyApi.getById(bib.id).catch(() => ({ data: bib })),
      bibliographyApi.getItems(bib.id).catch(() => ({ data: initialItems })),
    ])
      .then(([bibRes, itemsRes]) => {
        if (!active) return;
        const resolvedBib = bibRes.data || bib;
        const rawItems =
          Array.isArray(itemsRes.data) && itemsRes.data.length > 0
            ? itemsRes.data
            : ((resolvedBib as any).items as Item[] | undefined) || [];
        const resolvedItems = [...rawItems].sort((a, b) =>
          (a.itemCode || "").localeCompare(b.itemCode || "", undefined, {
            numeric: true,
            sensitivity: "base",
          })
        );
        setFullBib(resolvedBib);
        setItems(resolvedItems);
        setSelectedItemIds(new Set(resolvedItems.map((i) => i.id)));
      })
      .catch((err: unknown) => {
        if (!active) return;
        setLoadError(err instanceof Error ? err.message : "Gagal memuat daftar salinan buku");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [bib]);

  const currentBib = fullBib || bib;

  const selectedItems = useMemo(
    () => items.filter((item) => selectedItemIds.has(item.id)),
    [items, selectedItemIds]
  );

  const previewItem = selectedItems[0] || items[0] || null;
  const previewBarcode = useMemo(
    () => encodeCode128SvgData(previewItem?.itemCode || "S-26-10001-c1"),
    [previewItem?.itemCode]
  );

  if (!bib || !currentBib) return null;

  const authorsText = (() => {
    const names = (currentBib.authors || []).map((a) => a.name).filter(Boolean);
    if (names.length === 0) return currentBib.unlistedAuthorsLabel || "-";
    return currentBib.unlistedAuthorsLabel
      ? `${names.join(", ")}, ${currentBib.unlistedAuthorsLabel}`
      : names.join(", ");
  })();

  const classificationLines = (() => {
    const classNo = (currentBib.classification || "").trim();
    const callNo = (previewItem?.callNumber || currentBib.callNumber || "").trim();
    if (callNo) {
      const tokens = callNo.split(/\s+/).filter(Boolean);
      if (classNo && !callNo.toLowerCase().startsWith(classNo.toLowerCase())) {
        return [classNo, ...tokens];
      }
      return tokens.length > 0 ? tokens : [callNo];
    }
    if (classNo) return classNo.split(/\s+/).filter(Boolean);
    return ["-"];
  })();

  const classificationText = classificationLines.join(" ");

  const totalPages = selectedItems.length > 0 ? Math.ceil(selectedItems.length / perPage) : 0;
  const allSelected = items.length > 0 && selectedItemIds.size === items.length;

  const toggleAll = () => {
    if (allSelected) {
      setSelectedItemIds(new Set());
    } else {
      setSelectedItemIds(new Set(items.map((i) => i.id)));
    }
  };

  const toggleItem = (id: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleGeneratePdf = async (mode: "download" | "print") => {
    if (selectedItems.length === 0) {
      toastError("Pilih Salinan", "Pilih minimal 1 salinan buku untuk dicetak.");
      return;
    }

    setDownloading(mode);
    try {
      const itemIdsParam =
        selectedItemIds.size === items.length ? undefined : Array.from(selectedItemIds);
      const { blob, filename } = await bibliographyApi.fetchLabelsPdf(currentBib.id, {
        perPage,
        itemIds: itemIdsParam,
      });

      const blobUrl = URL.createObjectURL(blob);

      if (mode === "print") {
        const opened = window.open(blobUrl, "_blank", "noopener,noreferrer");
        if (!opened) {
          const link = document.createElement("a");
          link.href = blobUrl;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
        toastSuccess(
          "Label Siap Dicetak",
          `${selectedItems.length} label (${totalPages} halaman A4) dibuka dalam PDF.`
        );
      } else {
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toastSuccess(
          "PDF Label Diunduh",
          `${filename} berisi ${selectedItems.length} label salinan buku.`
        );
      }

      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } catch (err: unknown) {
      toastError(
        "Gagal Membuat PDF Label",
        err instanceof Error ? err.message : "Terjadi kesalahan saat membuat PDF label"
      );
    } finally {
      setDownloading(null);
    }
  };

  return (
    <Modal
      isOpen={!!bib}
      onClose={onClose}
      title="Cetak Label & Barcode Buku (PDF)"
      size="lg"
    >
      <div className="space-y-4 p-5 text-foreground">
        {/* Ringkasan Bibliografi */}
        <div className="rounded-xl border border-border bg-muted/40 p-3.5">
          <p className="text-sm font-bold text-foreground line-clamp-2">{currentBib.title}</p>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>Penulis: <strong className="text-foreground">{authorsText}</strong></span>
            <span>No. Klasifikasi: <strong className="font-mono text-foreground">{classificationText}</strong></span>
            <span>Total Salinan: <strong className="text-foreground">{items.length} eks</strong></span>
          </div>
        </div>

        {/* Pilihan Jumlah Label Per Lembar A4 */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Tata Letak Kertas A4 (Jumlah Label per Lembar)
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {LABELS_PER_PAGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPerPage(opt.value)}
                className={cn(
                  "flex flex-col items-center justify-center rounded-xl border px-2.5 py-2 text-center transition-all cursor-pointer",
                  perPage === opt.value
                    ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                    : "border-border bg-card text-muted-foreground hover:bg-muted/50"
                )}
              >
                <span className="text-base font-extrabold leading-tight">{opt.value}</span>
                <span className="text-[10px] leading-tight mt-0.5">Grid {opt.grid}</span>
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Estimasi hasil cetak:{" "}
            <strong className="text-foreground">
              {selectedItems.length} label
            </strong>{" "}
            pada{" "}
            <strong className="text-foreground">
              {totalPages} halaman A4
            </strong>{" "}
            ({perPage} label/lembar, ukuran label tetap ~9,2 × 4,4 cm).
          </p>
        </div>

        {/* Pratinjau 1 Stiker Label + Barcode (Flex Berjejer Samping) */}
        <div className="space-y-1.5">
          <span className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Pratinjau Format Label Buku (Posisi Samping / Punggung di Kanan)
          </span>
          <div className="mx-auto max-w-md rounded-lg border border-dashed border-slate-400 bg-white text-slate-900 shadow-xs overflow-hidden">
            {/* Header Strip */}
            <div className="flex text-white">
              <div className="w-[65%] flex items-center justify-between bg-slate-900 px-3 py-1.5">
                <span className="text-[10px] font-bold tracking-wide">UPT PERPUSTAKAAN UMC</span>
                <span className="text-[10px] text-slate-300">
                  {Math.min(1, selectedItems.length)}/{Math.max(1, selectedItems.length)}
                </span>
              </div>
              <div className="w-[35%] flex items-center justify-center bg-slate-800 px-2 py-1.5 border-l border-slate-700">
                <span className="text-[9px] font-bold tracking-wider uppercase text-slate-100">
                  KLASIFIKASI
                </span>
              </div>
            </div>

            {/* Body Flex Row */}
            <div className="flex items-stretch">
              {/* Kiri: Judul, Penulis, Barcode */}
              <div className="w-[65%] p-3 flex flex-col justify-between gap-2.5">
                <div>
                  <p className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug">
                    {currentBib.title}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-600 line-clamp-1">
                    Penulis: {authorsText}
                  </p>
                </div>
                <div className="border-t border-slate-200 pt-2 flex flex-col items-center">
                  <svg
                    viewBox={`0 0 ${previewBarcode.totalModules} 36`}
                    className="h-9 w-full max-w-[200px]"
                    preserveAspectRatio="none"
                    aria-label={`Barcode ${previewItem?.itemCode || "preview"}`}
                  >
                    <rect x={0} y={0} width={previewBarcode.totalModules} height={36} fill="#FFFFFF" />
                    {previewBarcode.bars.map((bar, idx) => (
                      <rect
                        key={idx}
                        x={bar.x}
                        y={0}
                        width={bar.width}
                        height={36}
                        fill="#000000"
                      />
                    ))}
                  </svg>
                  <span className="mt-1 font-mono text-[11px] font-bold tracking-wider text-slate-900">
                    {previewItem?.itemCode || "Belum ada salinan"}
                  </span>
                </div>
              </div>

              {/* Kanan: No. Klasifikasi (Punggung Buku) */}
              <div className="w-[35%] border-l border-dashed border-slate-400 bg-slate-50 px-2.5 py-3 flex flex-col items-center justify-center text-center">
                {classificationLines.map((line, idx) => (
                  <span
                    key={`${line}-${idx}`}
                    className="text-sm font-extrabold tracking-tight text-slate-900 leading-snug break-all"
                  >
                    {line}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Daftar Salinan yang Akan Dicetak */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Daftar Salinan Buku ({selectedItems.length}/{items.length} dipilih)
            </span>
            {items.length > 0 && (
              <button
                type="button"
                onClick={toggleAll}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline cursor-pointer"
              >
                {allSelected ? (
                  <>
                    <CheckSquare className="size-3.5" />
                    Batal Pilih Semua
                  </>
                ) : (
                  <>
                    <Square className="size-3.5" />
                    Pilih Semua Salinan
                  </>
                )}
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-6 text-xs text-muted-foreground gap-2 rounded-xl border border-border">
              <Loader2 className="size-4 animate-spin text-primary" />
              Memuat salinan buku...
            </div>
          ) : loadError ? (
            <div className="flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              <span>{loadError}</span>
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
              Bibliografi ini belum memiliki salinan/eksemplar fisik. Tambahkan eksemplar terlebih dahulu untuk mencetak label &amp; barcode.
            </div>
          ) : (
            <div className="max-h-40 overflow-y-auto rounded-xl border border-border divide-y divide-border bg-card">
              {items.map((item, idx) => {
                const checked = selectedItemIds.has(item.id);
                return (
                  <label
                    key={item.id}
                    className="flex items-center justify-between gap-3 px-3 py-2 text-xs hover:bg-muted/40 cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleItem(item.id)}
                        className="size-4 rounded border-border accent-primary cursor-pointer"
                      />
                      <span className="font-mono font-semibold text-foreground">
                        {item.itemCode}
                      </span>
                      <span className="text-muted-foreground truncate">
                        {item.location
                          ? `${item.location.room} - Rak ${item.location.rack}`
                          : "Sirkulasi"}
                      </span>
                    </div>
                    <span className="shrink-0 rounded bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      #{idx + 1}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-border pt-3">
          <button
            type="button"
            onClick={onClose}
            disabled={downloading !== null}
            className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50 cursor-pointer"
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={() => handleGeneratePdf("print")}
            disabled={downloading !== null || selectedItems.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/20 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {downloading === "print" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Printer className="size-4" />
            )}
            Pratinjau / Cetak PDF
          </button>
          <button
            type="button"
            onClick={() => handleGeneratePdf("download")}
            disabled={downloading !== null || selectedItems.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
          >
            {downloading === "download" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            Unduh PDF Label
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default PrintBookLabelsModal;
