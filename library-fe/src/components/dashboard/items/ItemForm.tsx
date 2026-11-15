import React, { useEffect, useState } from "react";
import { AlertCircle, Loader2, X } from "lucide-react";
import {
  itemApi,
  bibliographyApi,
  locationApi,
  type Item,
  type Bibliography,
  type Location,
} from "@/api/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface ItemFormProps {
  item: Item | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function ItemForm({ item, onClose, onSuccess }: ItemFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bibliographies, setBibliographies] = useState<Bibliography[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [formData, setFormData] = useState({
    bibliographyId: item?.bibliographyId || "",
    itemCode: item?.itemCode || "",
    inventoryCode: item?.inventoryCode || "",
    callNumber: item?.callNumber || "",
    locationId: item?.locationId?.toString() || "",
    status: item?.status || "available",
    source: item?.source || "",
    price: item?.price || "",
    priceCurrency: item?.priceCurrency || "IDR",
  });
  const [searchBibQuery, setSearchBibQuery] = useState(
    item?.bibliography?.title || ""
  );
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    if (item) return;

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
  }, [searchBibQuery, item]);

  useEffect(() => {
    const loadLocations = async () => {
      try {
        const result = await locationApi.list();
        setLocations(result.data || []);
      } catch {
        // ignore
      }
    };
    loadLocations();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        ...formData,
        locationId: formData.locationId
          ? parseInt(formData.locationId)
          : undefined,
        price: formData.price ? parseFloat(formData.price) : undefined,
      };
      if (item) {
        await itemApi.update(item.id, payload);
      } else {
        await itemApi.create(formData.bibliographyId, payload);
      }
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">
          {item ? "Edit Item" : "Tambah Item"}
        </h2>
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

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="mb-4 text-xl font-semibold text-muted-foreground">
            Informasi Item
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
                  disabled={!!item}
                  required={!formData.bibliographyId}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-muted"
                />
                {formData.bibliographyId && !item && (
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, bibliographyId: "" });
                      setSearchBibQuery("");
                    }}
                    className="absolute right-3 top-2.5 text-xs text-red-500 hover:text-red-700 cursor-pointer"
                  >
                    Hapus
                  </button>
                )}
              </div>
              {isDropdownOpen && !item && (
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
                          setFormData({ ...formData, bibliographyId: bib.id });
                          setSearchBibQuery(bib.title);
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
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Kode Item *
              </label>
              <input
                type="text"
                value={formData.itemCode}
                onChange={(e) => {
                  const val = e.target.value.replace(/\s/g, "");
                  setFormData({ ...formData, itemCode: val });
                }}
                required
                maxLength={50}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                No. Inventaris
              </label>
              <input
                type="text"
                placeholder="Otomatis sama dengan kode item jika kosong"
                value={formData.inventoryCode}
                onChange={(e) =>
                  setFormData({ ...formData, inventoryCode: e.target.value })
                }
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Call Number / No. Panggil
              </label>
              <input
                type="text"
                value={formData.callNumber}
                onChange={(e) =>
                  setFormData({ ...formData, callNumber: e.target.value })
                }
                maxLength={100}
                placeholder="Contoh: PND-01 atau 370.1 UMC"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Status
              </label>
              <Select
                value={formData.status}
                onValueChange={(val) =>
                  setFormData({ ...formData, status: val })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Tersedia</SelectItem>
                  <SelectItem value="loaned">Dipinjam</SelectItem>
                  <SelectItem value="reserved">Direservasi</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="lost">Hilang</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Lokasi *
              </label>
              <Select
                value={formData.locationId ? String(formData.locationId) : ""}
                onValueChange={(val) =>
                  setFormData({ ...formData, locationId: val })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih lokasi" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={String(loc.id)}>
                      {loc.room} - {loc.rack} - {loc.shelf}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="mb-4 text-xl font-semibold text-muted-foreground">
            Akuisisi
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Sumber
              </label>
              <input
                type="text"
                value={formData.source}
                onChange={(e) =>
                  setFormData({ ...formData, source: e.target.value })
                }
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Harga
              </label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) =>
                  setFormData({ ...formData, price: e.target.value })
                }
                min="0"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </div>

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
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            {item ? "Simpan Perubahan" : "Tambah Item"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ItemForm;
