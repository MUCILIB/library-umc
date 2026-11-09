import { useEffect, useState, useCallback } from "react";
import { TablePagination } from "@/components/common/TablePagination";
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
  Download,
  Info,
} from "lucide-react";
import Modal from "@/components/ui/modal";
import { itemApi, bibliographyApi, locationApi, type Item, type Bibliography, type Location } from "@/api/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { API_BASE_URL } from "@/utils/api-config";

interface ItemSectionProps {
  initialSearchTerm?: string;
  initialBibliographyId?: string;
}

export default function ItemSection({
  initialSearchTerm = "",
  initialBibliographyId = "",
}: ItemSectionProps = {}) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchInput, setSearchInput] = useState(initialSearchTerm);
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrModalItem, setQrModalItem] = useState<Item | null>(null);
  const limit = 10;

  useEffect(() => {
    locationApi.list().then((res) => {
      setLocations(res.data || []);
    }).catch(() => {
      // non-blocking fallback
    });
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (searchTerm) params.set("q", searchTerm);
      if (initialBibliographyId) params.set("bibliographyId", initialBibliographyId);
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
      if (locationFilter && locationFilter !== "all") params.set("locationId", locationFilter);

      const url = `${API_BASE_URL}/api/items?${params.toString()}`;
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
  }, [page, searchTerm, initialBibliographyId, statusFilter, locationFilter]);

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
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Item / Eksemplar</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Kelola item fisik dari bibliografi
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
            >
              <Plus className="size-4" />
              Tambah
            </button>
            <button
              onClick={() => setShowBulkForm(true)}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              <Package className="size-4" />
              Bulk
            </button>
          </div>
        </div>

        {/* Filter Bar Antislop */}
        <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-border bg-card p-3">
          <div className="relative flex-1 min-w-[200px] sm:min-w-[260px]">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cari item..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="w-[140px] sm:w-[160px]">
            <Select
              value={statusFilter}
              onValueChange={(val) => {
                setStatusFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-full text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="available">Tersedia</SelectItem>
                <SelectItem value="loaned">Dipinjam</SelectItem>
                <SelectItem value="damaged">Rusak</SelectItem>
                <SelectItem value="lost">Hilang</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-[150px] sm:w-[180px]">
            <Select
              value={locationFilter}
              onValueChange={(val) => {
                setLocationFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-full text-xs">
                <SelectValue placeholder="Lokasi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Lokasi</SelectItem>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={String(loc.id)}>
                    {loc.room} {loc.rack ? `- Rak ${loc.rack}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <button
            onClick={handleSearch}
            className="rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-white hover:bg-primary/90 transition-colors"
          >
            Cari
          </button>

          {(searchTerm || statusFilter !== "all" || locationFilter !== "all") && (
            <button
              onClick={() => {
                setSearchInput("");
                setSearchTerm("");
                setStatusFilter("all");
                setLocationFilter("all");
                setPage(1);
              }}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              title="Reset filter"
            >
              <RotateCcw className="size-3.5" />
              Reset
            </button>
          )}
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
          <TablePagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={limit}
            onPageChange={setPage}
            label="eksemplar"
          />
        </div>
      )}

      {/* Modal QR Code Salinan Buku */}
      <Modal
        isOpen={showQrModal && !!qrModalItem}
        onClose={() => {
          setShowQrModal(false);
          setQrModalItem(null);
        }}
        title="QR Code Salinan (Exemplar)"
        size="md"
      >
        {qrModalItem && (
          <div className="space-y-4 p-4">
            {/* Detail Buku Singkat */}
            <div className="p-3 bg-muted rounded-xl border border-border/50">
              <p className="font-bold text-sm text-foreground line-clamp-1">
                {qrModalItem.bibliography?.title || "Buku"}
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground font-medium">
                <span>
                  Kode Item: <span className="font-mono font-bold text-foreground">{qrModalItem.itemCode}</span>
                </span>
                {qrModalItem.inventoryCode && (
                  <span>
                    No. Inventaris: <span className="font-mono text-foreground">{qrModalItem.inventoryCode}</span>
                  </span>
                )}
                {qrModalItem.callNumber && (
                  <span>
                    No. Panggil: <span className="font-mono text-foreground">{qrModalItem.callNumber}</span>
                  </span>
                )}
              </div>
            </div>

            {/* QR Code Frame */}
            <div className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-muted/30 rounded-2xl border border-border">
              <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-200 dark:border-border">
                <img
                  src={itemApi.getQrSvg(qrModalItem.id)}
                  alt="QR Code"
                  className="w-48 h-48 object-contain"
                />
              </div>
              <span className="mt-4 font-mono font-extrabold text-base text-foreground tracking-wider">
                {qrModalItem.itemCode}
              </span>
              <span
                className={`mt-1.5 px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                  qrModalItem.status === "available"
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                    : "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                }`}
              >
                Status: {qrModalItem.status === "available" ? "Tersedia" : "Dipinjam"}
              </span>
            </div>

            {/* Tombol Aksi */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <a
                  href={itemApi.getQrPng(qrModalItem.id)}
                  target="_blank"
                  rel="noreferrer"
                  download={`QR-${qrModalItem.itemCode}.png`}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                >
                  <Download className="size-3.5" />
                  <span>Unduh PNG</span>
                </a>
                <a
                  href={itemApi.getQrSvg(qrModalItem.id)}
                  target="_blank"
                  rel="noreferrer"
                  download={`QR-${qrModalItem.itemCode}.svg`}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                >
                  <Download className="size-3.5" />
                  <span>Unduh SVG</span>
                </a>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowQrModal(false);
                  setQrModalItem(null);
                }}
                className="h-9 rounded-lg border border-border px-4 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </Modal>
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
            <dt className="text-xs font-medium text-muted-foreground">No. Inventaris</dt>
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
                maxLength={50}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">No. Inventaris</label>
              <input
                type="text"
                placeholder="Otomatis sama dengan kode item jika kosong"
                value={formData.inventoryCode}
                onChange={(e) => setFormData({ ...formData, inventoryCode: e.target.value })}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Call Number / No. Panggil</label>
              <input
                type="text"
                value={formData.callNumber}
                onChange={(e) => setFormData({ ...formData, callNumber: e.target.value })}
                maxLength={100}
                placeholder="Contoh: PND-01 atau 370.1 UMC"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Status</label>
              <Select
                value={formData.status}
                onValueChange={(val) => setFormData({ ...formData, status: val })}
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
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Lokasi *</label>
              <Select
                value={formData.locationId ? String(formData.locationId) : ""}
                onValueChange={(val) => setFormData({ ...formData, locationId: val })}
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
    const cleanPrefix = (prefix.trim() || "PND-01").toUpperCase().replace(/[\s/\\_]+/g, "-");
    for (let i = 1; i <= quantity; i++) {
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
                          if ((bib as any).callNumber) {
                            setPrefix((bib as any).callNumber.trim().toUpperCase().replace(/[\s/\\_]+/g, "-"));
                          }
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
                  Pola: <strong className="text-primary">PND-01</strong> &rarr; <strong>PND-01-01</strong>, <strong>PND-01-02</strong>
                </span>
                <span className="p-1.5 bg-white/80 dark:bg-background/80 rounded border border-blue-100 dark:border-blue-900/60 text-foreground">
                  Pola: <strong className="text-primary">TI-2026-05</strong> &rarr; <strong>TI-2026-05-01</strong>, <strong>TI-2026-05-02</strong>
                </span>
              </div>
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
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Pola Kode Buku (Prefix)</label>
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
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-all"
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
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Kode Item (Eksemplar)</th>
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground">No. Inventaris</th>
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
