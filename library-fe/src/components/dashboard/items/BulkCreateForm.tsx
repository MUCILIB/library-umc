import React, { useEffect, useState } from "react";
import { AlertCircle, Info, Loader2, X } from "lucide-react";
import { bibliographyApi, itemApi, type Bibliography } from "@/api/client";

export interface BulkCreateFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function BulkCreateForm({ onClose, onSuccess }: BulkCreateFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [bibliographies, setBibliographies] = useState<Bibliography[]>([]);
  const [selectedBibId, setSelectedBibId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [prefix, setPrefix] = useState("ITEM");
  const [locationId, setLocationId] = useState("");
  const [items, setItems] = useState<
    Array<{ itemCode: string; inventoryCode: string }>
  >([]);
  const [searchBibQuery, setSearchBibQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      try {
        const result = await bibliographyApi.list({
          q: searchBibQuery,
          limit: 50,
        });
        setBibliographies(result.data.items || []);
      } catch {
        // ignore
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchBibQuery]);

  const generateItems = () => {
    const newItems = [];
    const cleanPrefix = (prefix.trim() || "PND-01")
      .toUpperCase()
      .replace(/[\s/\\_]+/g, "-");
    const qtyNum = Math.max(1, Math.min(1000, parseInt(quantity, 10) || 1));
    for (let i = 1; i <= qtyNum; i++) {
      const code = `${cleanPrefix}-${String(i).padStart(2, "0")}`;
      newItems.push({ itemCode: code, inventoryCode: code });
    }
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      setError("Generate item codes terlebih dahulu");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const payload: {
        items: Array<{
          itemCode: string;
          inventoryCode?: string;
          locationId?: number;
        }>;
        defaults?: { locationId?: number };
      } = {
        items: items.map((item) => ({
          itemCode: item.itemCode,
          ...(item.inventoryCode ? { inventoryCode: item.inventoryCode } : {}),
        })),
      };
      if (locationId) {
        payload.defaults = { locationId: parseInt(locationId) };
      }
      const result = await itemApi.bulkCreate(selectedBibId, payload);
      setSuccess(`Berhasil membuat ${result.data.created} item`);
      setTimeout(() => onSuccess(), 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal bulk create");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Bulk Create Item</h2>
        <button
          onClick={onClose}
          className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-muted-foreground cursor-pointer"
        >
          <X className="size-5" />
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-warning-border bg-warning-bg p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950 p-4">
          <p className="text-sm text-emerald-700 dark:text-emerald-400">
            {success}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold text-muted-foreground">
            Konfigurasi
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 relative">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Bibliografi *
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Cari bibliografi..."
                  value={searchBibQuery}
                  onChange={(e) => {
                    setSearchBibQuery(e.target.value);
                    setIsDropdownOpen(true);
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  onBlur={() => {
                    setTimeout(() => setIsDropdownOpen(false), 200);
                  }}
                  required={!selectedBibId}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                {selectedBibId && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBibId("");
                      setSearchBibQuery("");
                    }}
                    className="absolute right-3 top-2.5 text-xs text-red-500 hover:text-red-700 cursor-pointer"
                  >
                    Hapus
                  </button>
                )}
              </div>
              {isDropdownOpen && (
                <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-border bg-card shadow-lg custom-scrollbar">
                  {bibliographies.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      Tidak ditemukan
                    </div>
                  ) : (
                    bibliographies.map((bib) => (
                      <button
                        key={bib.id}
                        type="button"
                        onClick={() => {
                          setSelectedBibId(bib.id);
                          setSearchBibQuery(bib.title);
                          if ((bib as any).callNumber) {
                            setPrefix(
                              (bib as any).callNumber
                                .trim()
                                .toUpperCase()
                                .replace(/[\s/\\_]+/g, "-")
                            );
                          }
                          setIsDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted hover:text-foreground text-foreground transition-colors cursor-pointer"
                      >
                        {bib.title}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Guidance Card for Bulk Item Generation */}
            <div className="sm:col-span-2 rounded-xl border border-blue-200/60 bg-blue-50/50 p-3.5 text-xs text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-300">
              <p className="font-bold flex items-center gap-1.5 mb-1 text-[11px] uppercase tracking-wider text-blue-700 dark:text-blue-300">
                <Info className="size-3.5 shrink-0" />
                Panduan Pola Penomoran Eksemplar
              </p>
              <p className="leading-relaxed text-[11px] text-muted-foreground">
                Kode item akan di-generate berjenjang dua digit dari pola dasar. Contoh:
              </p>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-mono">
                <span className="p-1.5 bg-white/80 dark:bg-background/80 rounded border border-blue-100 dark:border-blue-900/60 text-foreground">
                  Pola: <strong className="text-primary">PND-01</strong> &rarr;{" "}
                  <strong>PND-01-01</strong>, <strong>PND-01-02</strong>
                </span>
                <span className="p-1.5 bg-white/80 dark:bg-background/80 rounded border border-blue-100 dark:border-blue-900/60 text-foreground">
                  Pola: <strong className="text-primary">TI-2026-05</strong> &rarr;{" "}
                  <strong>TI-2026-05-01</strong>, <strong>TI-2026-05-02</strong>
                </span>
              </div>
            </div>

            <div>
              <label
                htmlFor="bulk-item-quantity"
                className="mb-1 block text-xs font-medium text-muted-foreground"
              >
                Jumlah Item *
              </label>
              <input
                id="bulk-item-quantity"
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
                  } else if (parsed > 1000) {
                    setQuantity("1000");
                  }
                }}
                placeholder="Contoh: 10"
                required
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Pola Kode Buku (Prefix)
              </label>
              <input
                type="text"
                placeholder="Contoh: PND-01"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                maxLength={30}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Lokasi (ID)
              </label>
              <input
                type="number"
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                placeholder="Opsional"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={generateItems}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-all cursor-pointer"
              >
                Generate Kode
              </button>
            </div>
          </div>
        </div>

        {items.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="mb-4 text-sm font-semibold text-muted-foreground">
              Preview ({items.length} item)
            </h3>
            <div className="max-h-60 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted">
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground">
                      #
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground">
                      Kode Item (Eksemplar)
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground">
                      No. Inventaris
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.slice(0, 20).map((item, idx) => (
                    <tr key={idx} className="border-b border-border">
                      <td className="px-3 py-2 text-muted-foreground">
                        {idx + 1}
                      </td>
                      <td className="px-3 py-2 font-medium text-foreground">
                        {item.itemCode}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={item.inventoryCode}
                          onChange={(e) => {
                            const updated = [...items];
                            updated[idx] = {
                              ...updated[idx],
                              inventoryCode: e.target.value,
                            };
                            setItems(updated);
                          }}
                          className="w-full rounded border border-border px-2 py-1 text-xs"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {items.length > 20 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  dan {items.length - 20} item lainnya...
                </p>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border bg-card px-6 py-2.5 text-sm font-medium text-muted-foreground hover:bg-surface-hover cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={loading || items.length === 0}
            className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            Bulk Create ({items.length} item)
          </button>
        </div>
      </form>
    </div>
  );
}

export default BulkCreateForm;
