import { useEffect, useState, useCallback } from "react";
import {
  Package,
  Search,
  Eye,
  Loader2,
  AlertCircle,
  RefreshCw,
  QrCode,
  ArrowLeft,
  Pencil,
  Trash2,
  Plus,
  X,
  RotateCcw,
  Ban,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { itemApi, bibliographyApi, locationApi, type Item, type Bibliography, type Location } from "@/api/client";
import { API_BASE_URL } from "@/utils/api-config";

export default function ItemSection() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrModalItem, setQrModalItem] = useState<Item | null>(null);
  const limit = 10;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `${API_BASE_URL}/api/items?page=${page}&limit=${limit}${searchTerm ? `&q=${encodeURIComponent(searchTerm)}` : ""}`;
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) throw new Error("Gagal memuat data");
      const result = await response.json();
      setItems(result.data?.items || []);
      setTotalPages(result.data?.pagination?.totalPages || 1);
      setTotalItems(result.data?.pagination?.total || 0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);


  const handleSearch = () => {
    setPage(1);
    setSearchTerm(searchInput);
  };

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const result = await itemApi.getById(id);
      setSelectedItem(result.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal memuat detail");
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => setSelectedItem(null);

  const handleCreate = () => {
    setEditingItem(null);
    setShowForm(true);
  };

  const handleEdit = (item: Item) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const handleDelete = async (item: Item) => {
    if (!confirm(`Arsipkan item "${item.itemCode}"?`)) return;
    try {
      await itemApi.delete(item.id);
      await fetchData();
      if (selectedItem?.id === item.id) setSelectedItem(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal mengarsipkan");   
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingItem(null);
  };

  const handleBulkClose = () => {
    setShowBulkForm(false);
  };

  const handleBulkSuccess = async () => {
    setShowBulkForm(false);
    await fetchData();
  };

  const handleFormSuccess = async () => {
    setShowForm(false);
    setEditingItem(null);
    await fetchData();
  };

  // Detail View
  if (selectedItem) {
    return (
      <ItemDetail
        item={selectedItem}
        loading={detailLoading}
        onBack={closeDetail}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onRefresh={async () => {
          const result = await itemApi.getById(selectedItem.id);
          setSelectedItem(result.data);
        }}
      />
    );
  }

  // Form View
  if (showForm) {
    return (
      <ItemForm
        item={editingItem}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
      />
    );
  }

  // Bulk Form View
  if (showBulkForm) {
    return (
      <BulkCreateForm
        onClose={handleBulkClose}
        onSuccess={handleBulkSuccess}
      />
    );
  }

  // List View
  if (loading && items.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-warning-border bg-warning-bg p-8 text-center">
        <AlertCircle className="mx-auto mb-4 size-12 text-red-400" />
        <h3 className="text-lg font-semibold text-destructive">Error</h3>
        <p className="mt-2 text-sm text-destructive">{error}</p>
        <button
          onClick={fetchData}
          className="mt-4 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-white hover:bg-destructive/90"
        >
          <RefreshCw className="mr-2 inline size-4" />
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Item / Eksemplar</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Kelola item fisik dari bibliografi
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cari item..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="w-full rounded-lg border border-border bg-card py-2 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <button
            onClick={handleSearch}
            className="rounded-lg bg-primary px-4 py-2 text-base font-bold text-white hover:bg-primary/90"
          >
            Cari
          </button>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-base font-bold text-white hover:bg-emerald-700"
          >
            <Plus className="size-4" />
            Tambah
          </button>
          <button
            onClick={() => setShowBulkForm(true)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-base font-bold text-white hover:bg-blue-700"
          >
            <Package className="size-4" />
            Bulk
          </button>
        </div>
      </div>

      {/* Table */}
      {items.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <Package className="mx-auto mb-4 size-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-muted-foreground">Belum ada item</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Item akan muncul di sini setelah ditambahkan ke bibliografi
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted">
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Kode Item</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Bibliografi</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Lokasi</th>
                  <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-center font-semibold text-muted-foreground">QR</th>
                  <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-border hover:bg-surface-hover/50">
                    <td className="px-4 py-3 font-medium text-foreground">
                      {item.itemCode}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {item.bibliography?.title || "-"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {item.location
                        ? `${item.location.room}, ${item.location.rack}`
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          item.status === "available"
                            ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400"
                            : item.status === "loaned"
                              ? "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {item.qrToken ? (
                        <button
                          type="button"
                          onClick={() => {
                            setQrModalItem(item);
                            setShowQrModal(true);
                          }}
                          className="rounded-lg p-1 hover:bg-muted text-emerald-500 hover:text-emerald-700 transition-colors"
                          title="Lihat QR Code"
                        >
                          <QrCode className="mx-auto size-4" />
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openDetail(item.id)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-muted-foreground"
                          title="Lihat detail"
                        >
                          <Eye className="size-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(item)}
                          className="rounded-lg p-1.5 text-blue-400 hover:bg-blue-50 dark:bg-blue-950 hover:text-blue-600 dark:text-blue-400"
                          title="Edit"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="rounded-lg p-1.5 text-red-400 hover:bg-warning-bg hover:text-destructive"
                          title="Arsipkan"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3 bg-muted/20">
              <p className="text-sm text-muted-foreground">
                Halaman {page} dari {totalPages} ({totalItems} total)
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-surface-hover disabled:opacity-50"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-surface-hover disabled:opacity-50"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal QR Code Salinan Buku */}
      {showQrModal && qrModalItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-xs">
          <div className="bg-card rounded-3xl p-6 max-w-md w-full border border-border shadow-2xl animate-in fade-in-0 zoom-in-95 duration-150 animate-out fade-out-0 zoom-out-95">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-md font-extrabold text-foreground tracking-tight">
                QR Code Salinan (Exemplar)
              </h3>
              <button
                onClick={() => {
                  setShowQrModal(false);
                  setQrModalItem(null);
                }}
                className="p-1.5 rounded-full hover:bg-muted text-muted-foreground transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-5">
              {/* Detail Buku Singkat */}
              <div className="p-3 bg-muted rounded-2xl">
                <p className="font-bold text-xs text-foreground line-clamp-1">
                  {qrModalItem.bibliography?.title || "Buku"}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">
                  Kode Item: {qrModalItem.itemCode}
                </p>
              </div>

              {/* QR Code Frame */}
              <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-2xl border border-slate-100 dark:bg-muted/30">
                <img
                  src={itemApi.getQrSvg(qrModalItem.id)}
                  alt="QR Code"
                  className="w-48 h-48 bg-white p-2 rounded-2xl shadow-md border border-slate-200"
                />
                <span className="mt-4 font-mono font-extrabold text-sm text-slate-800 tracking-wider dark:text-white">
                  {qrModalItem.itemCode}
                </span>
                <span className={`mt-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                  qrModalItem.status === "available"
                    ? "bg-green-50 text-green-700"
                    : "bg-red-50 text-red-700"
                }`}>
                  Status: {qrModalItem.status === "available" ? "Tersedia" : "Dipinjam"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// ITEM DETAIL COMPONENT
// ==========================================

function ItemDetail({
  item,
  loading,
  onBack,
  onEdit,
  onDelete,
  onRefresh,
}: {
  item: Item;
  loading: boolean;
  onBack: () => void;
  onEdit: (item: Item) => void;
  onDelete: (item: Item) => void;
  onRefresh: () => Promise<void>;
}) {
  const [qrLoading, setQrLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegenerateQr = async () => {
    if (!confirm("Regenerate QR? QR lama akan invalid.")) return;
    setQrLoading(true);
    try {
      await itemApi.regenerateQr(item.id);
      await onRefresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal regenerate QR");
    } finally {
      setQrLoading(false);
    }
  };

  const handleRevokeQr = async () => {
    if (!confirm("Revoke QR? Scan tidak akan bisa resolve item ini.")) return;
    setQrLoading(true);
    try {
      await itemApi.revokeQr(item.id);
      await onRefresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal revoke QR");
    } finally {
      setQrLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-warning-border bg-warning-bg p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-muted-foreground"
        >
          <ArrowLeft className="size-4" />
          Kembali ke daftar
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(item)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Pencil className="size-4" />
            Edit
          </button>
          <button
            onClick={() => onDelete(item)}
            className="flex items-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-white hover:bg-destructive/90"
          >
            <Trash2 className="size-4" />
            Arsipkan
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-2xl font-bold text-foreground">{item.itemCode}</h2>
        {item.bibliography && (
          <p className="mt-1 text-sm text-muted-foreground">{item.bibliography.title}</p>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Kode Inventaris</dt>
            <dd className="mt-0.5 text-sm text-foreground">{item.inventoryCode || "-"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Call Number</dt>
            <dd className="mt-0.5 text-sm text-foreground">{item.callNumber || "-"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Status</dt>
            <dd className="mt-0.5">
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                  item.status === "available"
                    ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400"
                    : item.status === "loaned"
                      ? "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {item.status}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Lokasi</dt>
            <dd className="mt-0.5 text-sm text-foreground">
              {item.location
                ? `${item.location.room}, ${item.location.rack}, ${item.location.shelf}`
                : "-"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Sumber</dt>
            <dd className="mt-0.5 text-sm text-foreground">{item.source || "-"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Harga</dt>
            <dd className="mt-0.5 text-sm text-foreground">
              {item.price ? `${item.priceCurrency || "IDR"} ${item.price}` : "-"}
            </dd>
          </div>
        </div>
      </div>

      {/* QR Section */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <QrCode className="size-4" />
          QR Code
        </h3>
        {item.qrToken ? (
          <div className="flex items-start gap-6">
            <div className="rounded-lg border border-border p-4">
              <img
                src={itemApi.getQrSvg(item.id)}
                alt="QR Code"
                className="size-32"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Versi: {item.qrVersion || 1}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleRegenerateQr}
                  disabled={qrLoading}
                  className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  <RotateCcw className="size-4" />
                  Regenerate
                </button>
                <button
                  onClick={handleRevokeQr}
                  disabled={qrLoading}
                  className="flex items-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-white hover:bg-destructive/90 disabled:opacity-50"
                >
                  <Ban className="size-4" />
                  Revoke
                </button>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">QR code belum dibuat</p>
        )}
      </div>
    </div>
  );
}

// ==========================================
// ITEM FORM COMPONENT
// ==========================================

function ItemForm({
  item,
  onClose,
  onSuccess,
}: {
  item: Item | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
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
  const [searchBibQuery, setSearchBibQuery] = useState(item?.bibliography?.title || "");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    if (!!item) return;

    const delayDebounceFn = setTimeout(async () => {
      try {
        const result = await bibliographyApi.list({ q: searchBibQuery, limit: 50 });
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
        locationId: formData.locationId ? parseInt(formData.locationId) : undefined,
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
          className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-muted-foreground"
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
          <h3 className="mb-4 text-xl font-semibold text-muted-foreground">Informasi Item</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 relative">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Bibliografi *</label>
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
                    className="absolute right-3 top-2.5 text-xs text-red-500 hover:text-red-700"
                  >
                    Hapus
                  </button>
                )}
              </div>
              {isDropdownOpen && !item && (
                <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-border bg-card shadow-lg custom-scrollbar">
                  {bibliographies.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">Tidak ditemukan</div>
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
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted hover:text-foreground text-foreground transition-colors"
                      >
                        {bib.title}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Kode Item *</label>
              <input
                type="text"
                value={formData.itemCode}
                onChange={(e) => {
                  const val = e.target.value.replace(/\s/g, "");
                  setFormData({ ...formData, itemCode: val });
                }}
                required
                maxLength={15}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Kode Inventaris</label>
              <input
                type="text"
                value={formData.inventoryCode}
                onChange={(e) => setFormData({ ...formData, inventoryCode: e.target.value })}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Call Number</label>
              <input
                type="text"
                value={formData.callNumber}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  setFormData({ ...formData, callNumber: val });
                }}
                maxLength={13}
                placeholder="Maksimal 13 angka"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="available">Tersedia</option>
                <option value="loaned">Dipinjam</option>
                <option value="reserved">Direservasi</option>
                <option value="maintenance">Maintenance</option>
                <option value="lost">Hilang</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Lokasi *</label>
              <select
                value={formData.locationId}
                onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                required
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Pilih lokasi</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.room} - {loc.rack} - {loc.shelf}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="mb-4 text-xl font-semibold text-muted-foreground">Akuisisi</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Sumber</label>
              <input
                type="text"
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Harga</label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
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
            className="rounded-lg border border-border bg-card px-6 py-2.5 text-sm font-medium text-muted-foreground hover:bg-surface-hover"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            {item ? "Simpan Perubahan" : "Tambah Item"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ==========================================
// BULK CREATE FORM COMPONENT
// ==========================================

function BulkCreateForm({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [bibliographies, setBibliographies] = useState<Bibliography[]>([]);
  const [selectedBibId, setSelectedBibId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [prefix, setPrefix] = useState("ITEM");
  const [locationId, setLocationId] = useState("");
  const [items, setItems] = useState<Array<{ itemCode: string; inventoryCode: string }>>([]);
  const [searchBibQuery, setSearchBibQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      try {
        const result = await bibliographyApi.list({ q: searchBibQuery, limit: 50 });
        setBibliographies(result.data.items || []);
      } catch {
        // ignore
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchBibQuery]);

  const generateItems = () => {
    const newItems = [];
    for (let i = 1; i <= quantity; i++) {
      const code = `${prefix}-${String(i).padStart(4, "0")}`;
      newItems.push({ itemCode: code, inventoryCode: "" });
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
      const payload: { items: Array<{ itemCode: string; inventoryCode?: string; locationId?: number }>; defaults?: { locationId?: number } } = {
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
        <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-muted-foreground">
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
          <p className="text-sm text-emerald-700 dark:text-emerald-400">{success}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold text-muted-foreground">Konfigurasi</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 relative">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Bibliografi *</label>
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
                    className="absolute right-3 top-2.5 text-xs text-red-500 hover:text-red-700"
                  >
                    Hapus
                  </button>
                )}
              </div>
              {isDropdownOpen && (
                <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-border bg-card shadow-lg custom-scrollbar">
                  {bibliographies.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">Tidak ditemukan</div>
                  ) : (
                    bibliographies.map((bib) => (
                      <button
                        key={bib.id}
                        type="button"
                        onClick={() => {
                          setSelectedBibId(bib.id);
                          setSearchBibQuery(bib.title);
                          setIsDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted hover:text-foreground text-foreground transition-colors"
                      >
                        {bib.title}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Jumlah Item *</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Math.min(1000, parseInt(e.target.value) || 1)))}
                min="1"
                max="1000"
                required
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Prefix Kode Item (Maks 10 Karakter)</label>
              <input
                type="text"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                maxLength={10}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Lokasi (ID)</label>
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
                className="rounded-lg bg-slate-600 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
              >
                Generate Kode
              </button>
            </div>
          </div>
        </div>

        {items.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="mb-4 text-sm font-semibold text-muted-foreground">Preview ({items.length} item)</h3>
            <div className="max-h-60 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted">
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground">#</th>
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Item Code</th>
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Inventory Code</th>
                  </tr>
                </thead>
                <tbody>
                  {items.slice(0, 20).map((item, idx) => (
                    <tr key={idx} className="border-b border-border">
                      <td className="px-3 py-2 text-muted-foreground">{idx + 1}</td>
                      <td className="px-3 py-2 font-medium text-foreground">{item.itemCode}</td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={item.inventoryCode}
                          onChange={(e) => {
                            const updated = [...items];
                            updated[idx] = { ...updated[idx], inventoryCode: e.target.value };
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
                <p className="mt-2 text-xs text-muted-foreground">dan {items.length - 20} item lainnya...</p>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border bg-card px-6 py-2.5 text-sm font-medium text-muted-foreground hover:bg-surface-hover"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={loading || items.length === 0}
            className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            Bulk Create ({items.length} item)
          </button>
        </div>
      </form>
    </div>
  );
}
