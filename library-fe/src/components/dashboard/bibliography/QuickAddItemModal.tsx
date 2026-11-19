import { useState, useEffect } from "react";
import { Package, AlertCircle, Loader2, Plus, Tag, Bookmark, Lock, Sparkles } from "lucide-react";
import Modal from "@/components/ui/modal";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";
import { analyzeItemCodeStructure, type CodeStructureAnalysis } from "@/utils/itemCodeHelper";
import {
  locationApi,
  itemApi,
  bibliographyApi,
  collectionTypeApi,
  type Bibliography,
  type Location,
  type CollectionType,
} from "@/api/client";

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
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [fullBib, setFullBib] = useState<Bibliography | null>(bib);
  const [collectionTypes, setCollectionTypes] = useState<CollectionType[]>([]);
  const [selectedColTypeId, setSelectedColTypeId] = useState<number | null>(null);

  const [structureAnalysis, setStructureAnalysis] = useState<CodeStructureAnalysis | null>(null);
  const [standardizing, setStandardizing] = useState<boolean>(false);

  // Helper untuk menentukan apakah buku merupakan koleksi Referensi (R) atau Sirkulasi (S)
  const checkIsReference = (
    targetBib?: Bibliography | null,
    cols?: CollectionType[]
  ): boolean => {
    if (!targetBib) return false;
    // 1. Cek langsung dari relasi collectionType di bib
    const ct =
      targetBib.collectionType ||
      (cols && targetBib.collectionTypeId
        ? cols.find((c) => c.id === targetBib.collectionTypeId)
        : null);

    if (ct) {
      const code = (ct.code || "").trim().toUpperCase();
      const name = (ct.name || "").trim().toLowerCase();
      if (code === "R" || code === "REF" || code.startsWith("R")) return true;
      if (name.includes("referensi") || name.includes("reference")) return true;
      if (ct.canBeBorrowed === false) return true;
    }

    // 2. Fallback cek jika ID = 2 (id default referensi pada database seed)
    if (targetBib.collectionTypeId === 2) return true;

    return false;
  };

  useEffect(() => {
    if (!bib) return;
    setQuantity("1");
    setError(null);
    setFullBib(bib);

    // Initial prefix instan dari prop bib: otomatis R jika Referensi, S jika Sirkulasi
    const initialIsRef = checkIsReference(bib, collectionTypes);
    const initialPrefix = initialIsRef ? "R" : "S";
    const year = bib.publishYear || new Date().getFullYear();
    setCodePrefix(`${initialPrefix}-${year}-10001`);

    let active = true;
    setLoadingLocations(true);
    setLoadingDetails(true);

    Promise.all([
      locationApi.list().catch(() => ({ data: [] as Location[] })),
      collectionTypeApi?.list ? collectionTypeApi.list().catch(() => ({ data: [] as CollectionType[] })) : Promise.resolve({ data: [] as CollectionType[] }),
      bibliographyApi?.getById ? bibliographyApi.getById(bib.id).catch(() => ({ data: bib })) : Promise.resolve({ data: bib }),
    ])
      .then(([locRes, colRes, bibRes]) => {
        if (!active) return;
        const locs: Location[] = locRes.data || [];
        setLocations(locs);
        if (locs.length > 0) {
          setLocationId((prev) => (prev && locs.some((l: Location) => l.id === prev) ? prev : locs[0].id));
        }

        const cols: CollectionType[] = colRes.data || [];
        setCollectionTypes(cols);

        const latestBib = bibRes.data || bib;
        setFullBib(latestBib);

        // Tentukan apakah buku Referensi atau Sirkulasi sesuai data bibliografi
        const isRef = checkIsReference(latestBib, cols);
        const resolvedPrefix = isRef ? "R" : "S";

        const matchedCol =
          latestBib.collectionType ||
          cols.find((c: CollectionType) => c.id === latestBib.collectionTypeId) ||
          cols.find((c: CollectionType) =>
            isRef ? (c.code === "R" || !c.canBeBorrowed) : (c.code === "S" || c.canBeBorrowed)
          ) ||
          null;

        setSelectedColTypeId(matchedCol?.id || latestBib.collectionTypeId || null);

        // Analisis struktur kode eksemplar buku (pola tunggal konsisten)
        const existingItems = (latestBib as any).items || [];
        const finalYear = latestBib.publishYear || new Date().getFullYear();
        const analysis = analyzeItemCodeStructure(existingItems, resolvedPrefix, finalYear, "10001");
        setStructureAnalysis(analysis);
        setCodePrefix(analysis.basePrefix);
      })
      .catch((err) => {
        if (!active) return;
        console.error("Gagal memuat detail eksemplar:", err);
      })
      .finally(() => {
        if (active) {
          setLoadingLocations(false);
          setLoadingDetails(false);
        }
      });

    return () => {
      active = false;
    };
  }, [bib]);

  if (!bib) return null;

  const currentBib = fullBib || bib;
  const isReferenceBook = checkIsReference(currentBib, collectionTypes);

  const handleStandardize = async () => {
    if (!currentBib) return;
    setStandardizing(true);
    try {
      const targetPrefix = structureAnalysis?.basePrefix;
      const res = await itemApi.standardizeCodes(currentBib.id, targetPrefix);
      toastSuccess("Kode Eksemplar Diseragamkan", res.message || "Semua salinan kini seragam.");

      // Refresh data buku
      const refreshed = await bibliographyApi.getById(currentBib.id);
      if (refreshed.data) {
        setFullBib(refreshed.data);
        const isRef = checkIsReference(refreshed.data, collectionTypes);
        const year = refreshed.data.publishYear || new Date().getFullYear();
        const newAnalysis = analyzeItemCodeStructure(
          (refreshed.data as any).items || [],
          isRef ? "R" : "S",
          year,
          "10001"
        );
        setStructureAnalysis(newAnalysis);
        setCodePrefix(newAnalysis.basePrefix);
      }
      onSuccess();
    } catch (err: unknown) {
      toastError("Gagal Menyeragamkan", err instanceof Error ? err.message : "Terjadi kesalahan sistem");
    } finally {
      setStandardizing(false);
    }
  };

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
      const targetBib = currentBib;
      const cleanPrefix =
        (structureAnalysis?.isLocked ? structureAnalysis.basePrefix : codePrefix.trim().replace(/\s+/g, "")) ||
        `${isReferenceBook ? "R" : "S"}-${targetBib.publishYear || new Date().getFullYear()}-10001`;
      const startSeq = structureAnalysis ? structureAnalysis.nextSeq : (targetBib.totalItems || 0) + 1;

      const effectiveColTypeId = selectedColTypeId || targetBib.collectionTypeId || undefined;

      const itemsToCreate = Array.from({ length: qtyNum }, (_, idx) => {
        const seq = startSeq + idx;
        const eksemplarTag = `c${seq}`;
        const code = `${cleanPrefix}-${eksemplarTag}`;
        return {
          itemCode: code,
          inventoryCode: `INV-${code}`,
          callNumber: targetBib.callNumber || undefined,
          locationId,
          collectionTypeId: effectiveColTypeId,
        };
      });

      const res = await itemApi.bulkCreate(targetBib.id, {
        items: itemsToCreate,
        defaults: {
          locationId,
          collectionTypeId: effectiveColTypeId,
        },
      });

      if (res.data?.errors && res.data.errors.length > 0) {
        toastError("Peringatan", "Sebagian kode item bentrok / dilewati.");
      }

      toastSuccess(
        "Eksemplar Ditambahkan",
        `Berhasil menambahkan ${qtyNum} eksemplar fisik untuk "${targetBib.title}".`
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
        <div className="rounded-xl border border-border bg-muted/40 p-3.5 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Buku Induk (Katalog)
          </p>
          <p className="text-sm font-bold text-foreground line-clamp-2">{currentBib.title}</p>
          <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs text-muted-foreground">
            {currentBib.isbnIssn && (
              <span className="rounded bg-background px-2 py-0.5 border border-border font-mono text-[11px]">
                {currentBib.isbnIssn}
              </span>
            )}

            {/* Badge Klasifikasi Otomatis dari Input Bibliografi */}
            <span
              className={`inline-flex items-center gap-1 rounded px-2.5 py-0.5 font-bold text-[11px] ${
                isReferenceBook
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                  : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
              }`}
            >
              <Tag className="size-3" />
              {isReferenceBook ? "Referensi (Prefix R) • Hanya Baca di Tempat" : "Sirkulasi (Prefix S) • Dapat Dipinjam Keluar"}
            </span>

            {currentBib.classification && (
              <span className="inline-flex items-center gap-1 rounded bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 font-mono text-[11px] text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                <Bookmark className="size-3" />
                DDC: {currentBib.classification}
              </span>
            )}

            <span className="inline-flex items-center gap-1 rounded bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 font-medium text-emerald-700 dark:text-emerald-300">
              <Package className="size-3" />
              Stok saat ini: {currentBib.availableItems ?? 0}/{currentBib.totalItems ?? 0}
            </span>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Notifikasi Standarisasi Kode Eksemplar */}
        {structureAnalysis?.hasInconsistentCodes && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5 text-xs text-foreground flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-start sm:items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                <Sparkles className="size-4" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-xs">
                  Format Kode Belum Seragam
                </p>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  {structureAnalysis.inconsistentCount} dari {structureAnalysis.totalItems} eksemplar berformat lama. Standar buku ini:{" "}
                  <span className="font-mono font-semibold text-foreground">{structureAnalysis.basePrefix}</span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleStandardize}
              disabled={standardizing}
              className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-3 py-1.5 text-xs transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            >
              {standardizing ? (
                <>
                  <Loader2 className="size-3 animate-spin" />
                  <span>Menyeragamkan...</span>
                </>
              ) : (
                <>
                  <Sparkles className="size-3" />
                  <span>Seragamkan Kode</span>
                </>
              )}
            </button>
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

        {/* Awalan Barcode / Kode Eksemplar Otomatis Mengikuti Klasifikasi */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-foreground">
              Awalan Barcode / Kode Item
            </label>
            {structureAnalysis?.isLocked && (
              <span className="inline-flex items-center gap-1 rounded-md bg-secondary text-secondary-foreground border border-border px-2 py-0.5 text-[11px] font-medium">
                <Lock className="size-3 text-muted-foreground" />
                Aturan Kode Terkunci
              </span>
            )}
            {loadingDetails && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Loader2 className="size-3 animate-spin text-primary" />
                Memuat data...
              </span>
            )}
          </div>

          <input
            type="text"
            value={codePrefix}
            onChange={(e) => {
              if (!structureAnalysis?.isLocked) {
                setCodePrefix(e.target.value.replace(/\s+/g, ""));
              }
            }}
            readOnly={structureAnalysis?.isLocked}
            placeholder={isReferenceBook ? "Contoh: R-2026-10001" : "Contoh: S-2026-10001"}
            className={cn(
              "w-full rounded-lg border px-3 py-2 text-sm font-mono font-semibold transition-colors",
              structureAnalysis?.isLocked
                ? "bg-muted text-muted-foreground border-border cursor-not-allowed select-none"
                : "bg-background text-foreground border-border focus:outline-none focus:ring-1 focus:ring-primary"
            )}
          />

          <p className="text-[11px] text-muted-foreground">
            Pola salinan baru:{" "}
            <span className="font-mono font-semibold text-foreground">
              {codePrefix || (isReferenceBook ? "R-2026-10001" : "S-2026-10001")}-c{structureAnalysis ? structureAnalysis.nextSeq : 1}
            </span>
            <span className="text-muted-foreground/80"> • Melanjutkan nomor urut eksemplar sebelumnya.</span>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50 cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={submitting || loadingLocations || locations.length === 0}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
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
