import { useEffect, useState, useCallback } from "react";
import { AlertCircle, Loader2, Package, Plus, RefreshCw } from "lucide-react";
import { itemApi, locationApi, type Item, type Location } from "@/api/client";
import { API_BASE_URL } from "@/utils/api-config";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { ItemDetail } from "./items/ItemDetail";
import { ItemForm } from "./items/ItemForm";
import { BulkCreateForm } from "./items/BulkCreateForm";
import { ItemQrModal } from "./items/ItemQrModal";
import { ItemFilterBar } from "./items/ItemFilterBar";
import { ItemTable } from "./items/ItemTable";

export interface ItemSectionProps {
  initialSearchTerm?: string;
  initialBibliographyId?: string;
}

export default function ItemSection({
  initialSearchTerm = "",
  initialBibliographyId = "",
}: ItemSectionProps = {}) {
  const { canAdd, canEdit, canDelete } = useRolePermissions();
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
  const [sortBy, setSortBy] = useState<string>("itemCode");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const limit = 10;

  useEffect(() => {
    locationApi
      .list()
      .then((res) => {
        setLocations(res.data || []);
      })
      .catch(() => {
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
      params.set("sortBy", sortBy);
      params.set("sortOrder", sortOrder);
      if (searchTerm) params.set("q", searchTerm);
      if (initialBibliographyId)
        params.set("bibliographyId", initialBibliographyId);
      if (statusFilter && statusFilter !== "all")
        params.set("status", statusFilter);
      if (locationFilter && locationFilter !== "all")
        params.set("locationId", locationFilter);

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
  }, [
    page,
    searchTerm,
    initialBibliographyId,
    statusFilter,
    locationFilter,
    sortBy,
    sortOrder,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = () => {
    setPage(1);
    setSearchTerm(searchInput);
  };

  const handleResetFilters = () => {
    setSearchInput("");
    setSearchTerm("");
    setStatusFilter("all");
    setLocationFilter("all");
    setSortBy("itemCode");
    setSortOrder("asc");
    setPage(1);
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

  const handleToggleSort = () => {
    if (sortBy === "itemCode") {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy("itemCode");
      setSortOrder("asc");
    }
    setPage(1);
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
          className="mt-4 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-white hover:bg-destructive/90 cursor-pointer"
        >
          <RefreshCw className="mr-2 inline size-4" />
          Coba Lagi
        </button>
      </div>
    );
  }

  const isFiltered =
    !!searchTerm ||
    statusFilter !== "all" ||
    locationFilter !== "all" ||
    sortBy !== "itemCode" ||
    sortOrder !== "asc";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-3xl font-bold text-foreground">
              Item / Eksemplar
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Kelola item fisik dari bibliografi
            </p>
          </div>
          {canAdd("items") && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCreate}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors cursor-pointer"
              >
                <Plus className="size-4" />
                Tambah
              </button>
              <button
                type="button"
                onClick={() => setShowBulkForm(true)}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors cursor-pointer"
              >
                <Package className="size-4" />
                Bulk
              </button>
            </div>
          )}
        </div>

        {/* Filter Bar */}
        <ItemFilterBar
          searchInput={searchInput}
          onSearchInputChange={setSearchInput}
          onSearch={handleSearch}
          statusFilter={statusFilter}
          onStatusFilterChange={(val) => {
            setStatusFilter(val);
            setPage(1);
          }}
          locationFilter={locationFilter}
          onLocationFilterChange={(val) => {
            setLocationFilter(val);
            setPage(1);
          }}
          locations={locations}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={(sb, so) => {
            setSortBy(sb);
            setSortOrder(so);
            setPage(1);
          }}
          onReset={handleResetFilters}
          isFiltered={isFiltered}
        />
      </div>

      {/* Table & Pagination */}
      <ItemTable
        items={items}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onToggleSort={handleToggleSort}
        onOpenDetail={openDetail}
        onOpenQrModal={(item) => {
          setQrModalItem(item);
          setShowQrModal(true);
        }}
        onEdit={handleEdit}
        onDelete={handleDelete}
        canEdit={canEdit}
        canDelete={canDelete}
        page={page}
        totalPages={totalPages}
        totalItems={totalItems}
        limit={limit}
        onPageChange={setPage}
      />

      {/* Modal QR Code Salinan Buku */}
      <ItemQrModal
        isOpen={showQrModal}
        item={qrModalItem}
        onClose={() => {
          setShowQrModal(false);
          setQrModalItem(null);
        }}
      />
    </div>
  );
}
