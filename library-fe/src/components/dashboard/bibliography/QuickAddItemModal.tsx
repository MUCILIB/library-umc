import { useState, useEffect } from "react";
import { Package, AlertCircle, Loader2, Plus } from "lucide-react";
import Modal from "@/components/ui/modal";
import { useToast } from "@/hooks/useToast";
import { locationApi, itemApi, type Bibliography, type Location } from "@/api/client";

export interface QuickAddItemModalProps {
  bib: Bibliography | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function QuickAddItemModal({ bib, onClose, onSuccess }: QuickAddItemModalProps) {
  const { success: toastSuccess, error: toastError } = useToast();
  const [quantity, setQuantity] = useState<string>("1");
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationId, setLocationId] = useState<number | null>(null);
  const [codePrefix, setCodePrefix] = useState<string>("");
  const [loadingLocations, setLoadingLocations] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bib) return;
    setQuantity("1");
    setError(null);

    // Awalan kode eksemplar default yang rapi
    const cleanBibShort = bib.id.replace(/-/g, "").slice(0, 6).toUpperCase();
    setCodePrefix(`UMC-${cleanBibShort}`);

    let active = true;
    setLoadingLocations(true);
    locationApi
      .list()
      .then((res) => {
        if (!active) return;
        const locs = res.data || [];
        setLocations(locs);
        if (locs.length > 0) {
          setLocationId(locs[0].id);
        }
      })
      .catch((err) => {
        if (!active) return;
        console.error("Gagal memuat data lokasi:", err);
      })
      .finally(() => {
        if (active) setLoadingLocations(false);
      });

    return () => {
      active = false;
    };
  }, [bib]);

  if (!bib) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qtyNum = Math.max(1, Math.min(50, parseInt(quantity, 10) || 1));
    if (!locationId) {
      setError("Silakan pilih lokasi rak");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const cleanPrefix =
        codePrefix.trim().replace(/\s+/g, "") ||
        `UMC-${bib.id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
      const startSeq = bib.totalItems || 0;

      const itemsToCreate = Array.from({ length: qtyNum }, (_, idx) => {
        const seq = startSeq + idx + 1;
        const code = `${cleanPrefix}-${String(seq).padStart(2, "0")}`;
        return {
          itemCode: code,
          inventoryCode: `INV-${code}`,
          callNumber: bib.callNumber || undefined,
          locationId,
        };
      });

      const res = await itemApi.bulkCreate(bib.id, {
        items: itemsToCreate,
        defaults: { locationId },
      });

      if (res.data?.errors && res.data.errors.length > 0) {
        toastError("Peringatan", "Sebagian kode item bentrok / dilewati.");
      }

      toastSuccess(
        "Eksemplar Ditambahkan",
        `Berhasil menambahkan ${qtyNum} eksemplar fisik untuk "${bib.title}".`
      );
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal menambahkan eksemplar");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={!!bib}
      onClose={onClose}
      title="Tambah Eksemplar Fisik Buku"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 p-1">
        {/* Ringkasan Buku */}
        <div className="rounded-xl border border-border bg-muted/40 p-3.5 space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Buku Induk (Katalog)
          </p>
          <p className="text-sm font-bold text-foreground line-clamp-2">{bib.title}</p>
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
            {bib.isbnIssn && (
              <span className="rounded bg-background px-2 py-0.5 border border-border font-mono text-[11px]">
                {bib.isbnIssn}
              </span>
            )}
            <span className="inline-flex items-center gap-1 rounded bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 font-medium text-emerald-700 dark:text-emerald-300">
              <Package className="size-3" />
              Stok saat ini: {bib.availableItems ?? 0}/{bib.totalItems ?? 0}
            </span>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Input Jumlah Eksemplar */}
        <div className="space-y-1.5">
          <label htmlFor="quick-add-quantity" className="block text-xs font-semibold text-foreground">
            Jumlah Eksemplar Fisik Baru *
          </label>
          <div className="flex items-center gap-2">
            <input
              id="quick-add-quantity"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={quantity}
              onChange={(e) => {
                const onlyDigits = e.target.value.replace(/\D/g, "");
                setQuantity(onlyDigits);
              }}
              onBlur={() => {
                const parsed = parseInt(quantity, 10);
                if (!parsed || parsed < 1) {
                  setQuantity("1");
                } else if (parsed > 50) {
                  setQuantity("50");
                }
              }}
              placeholder="Contoh: 5"
              className="w-24 rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              required
            />
            <div className="flex gap-1.5">
              {[1, 2, 5, 10].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setQuantity(String(num))}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                    quantity === String(num)
                      ? "border-primary bg-primary/10 text-primary font-bold"
                      : "border-border bg-card text-muted-foreground hover:bg-muted"
                  }`}
                >
                  +{num}
                </button>
              ))}
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Jumlah salinan fisik buku yang akan didaftarkan ke rak perpustakaan (1-50 buku).
          </p>
        </div>

        {/* Lokasi Rak */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-foreground">
            Lokasi Rak Penyimpanan *
          </label>
          {loadingLocations ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
              <Loader2 className="size-4 animate-spin text-primary" />
              Memuat data lokasi rak...
            </div>
          ) : locations.length === 0 ? (
            <p className="text-xs text-amber-600">Belum ada data lokasi rak terdaftar.</p>
          ) : (
            <select
              value={locationId || ""}
              onChange={(e) => setLocationId(Number(e.target.value))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              required
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.room} - {loc.rack}
                  {loc.shelf ? ` (${loc.shelf})` : ""}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Awalan Barcode / Kode Eksemplar */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-foreground">
            Awalan Barcode / Kode Item
          </label>
          <input
            type="text"
            value={codePrefix}
            onChange={(e) => setCodePrefix(e.target.value.replace(/\s+/g, ""))}
            placeholder="Contoh: UMC-B001"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <p className="text-[11px] text-muted-foreground font-mono">
            Format: {codePrefix || "UMC-ITEM"}-01, {codePrefix || "UMC-ITEM"}-02 ...
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={submitting || loadingLocations || locations.length === 0}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Plus className="size-4" />
                Simpan Eksemplar
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default QuickAddItemModal;
