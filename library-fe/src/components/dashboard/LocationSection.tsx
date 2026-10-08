import React, { useState, useEffect } from "react";
import { locationApi, type Location } from "@/api/client";
import {
  MapPin, Plus, Trash2, Edit2, Search,
  AlertCircle, CheckCircle2, Loader2, RefreshCw
} from "lucide-react";

export function LocationSection() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [formData, setFormData] = useState({ room: "", rack: "", shelf: "" });
  const [submitting, setSubmitting] = useState(false);

  // Delete Dialog state
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await locationApi.list();
      setLocations(res.data || []);
    } catch (err: any) {
      setError(err?.message || "Gagal memuat data lokasi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchLocations();
  }, []);

  const handleOpenAdd = () => {
    setEditingLocation(null);
    setFormData({ room: "", rack: "", shelf: "" });
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (loc: Location) => {
    setEditingLocation(loc);
    setFormData({ room: loc.room, rack: loc.rack, shelf: loc.shelf });
    setError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.room.trim() || !formData.rack.trim() || !formData.shelf.trim()) {
      setError("Semua bidang (Ruangan, Rak, Baris/Ambalan) wajib diisi");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      if (editingLocation) {
        await locationApi.update(editingLocation.id, formData);
        setSuccess("Lokasi berhasil diperbarui");
      } else {
        await locationApi.create(formData);
        setSuccess("Lokasi baru berhasil ditambahkan");
      }
      setIsModalOpen(false);
      await fetchLocations();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.message || "Gagal menyimpan data lokasi");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      setIsDeleting(true);
      setError(null);
      await locationApi.delete(id);
      setSuccess("Lokasi berhasil dihapus");
      setDeletingId(null);
      await fetchLocations();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.message || "Gagal menghapus lokasi. Pastikan tidak ada buku yang menempati lokasi ini.");
      setDeletingId(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredLocations = locations.filter((loc) => {
    const term = search.toLowerCase();
    return (
      loc.room?.toLowerCase().includes(term) ||
      loc.rack?.toLowerCase().includes(term) ||
      loc.shelf?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Lokasi Rak Buku
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Kelola master penempatan fisik buku (ruangan, rak, dan ambalan/baris)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void fetchLocations()}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground hover:bg-muted"
            title="Muat ulang data"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            <Plus className="size-4" />
            <span>Tambah Lokasi</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="size-5 shrink-0" />
          <p className="flex-1">{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-5 shrink-0" />
          <p className="flex-1">{success}</p>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari ruangan, nomor rak, atau ambalan..."
          className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Table / List */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Memuat data lokasi...</span>
          </div>
        ) : filteredLocations.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center p-6 text-center">
            <MapPin className="size-8 text-muted-foreground/60" />
            <p className="mt-2 text-sm font-medium text-foreground">Tidak ada data lokasi</p>
            <p className="text-xs text-muted-foreground">
              {search ? "Tidak ditemukan lokasi yang cocok dengan kata kunci pencarian" : "Belum ada lokasi rak buku yang didaftarkan"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/50 text-xs font-semibold text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 sm:px-6">No</th>
                  <th className="px-4 py-3 sm:px-6">Ruangan</th>
                  <th className="px-4 py-3 sm:px-6">Rak</th>
                  <th className="px-4 py-3 sm:px-6">Ambalan / Baris</th>
                  <th className="px-4 py-3 text-right sm:px-6">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredLocations.map((loc, idx) => (
                  <tr key={loc.id} className="hover:bg-muted/40">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground sm:px-6">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground sm:px-6">
                      {loc.room}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground sm:px-6">
                      {loc.rack}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground sm:px-6">
                      {loc.shelf}
                    </td>
                    <td className="px-4 py-3 text-right sm:px-6">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(loc)}
                          className="inline-flex size-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                          title="Edit lokasi"
                        >
                          <Edit2 className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingId(loc.id)}
                          className="inline-flex size-8 items-center justify-center rounded-lg border border-border text-destructive hover:bg-destructive/10"
                          title="Hapus lokasi"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Add / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
            <h3 className="text-lg font-bold text-foreground">
              {editingLocation ? "Edit Lokasi Rak" : "Tambah Lokasi Rak Baru"}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Tentukan posisi fisik buku di perpustakaan
            </p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground">Ruangan</label>
                <input
                  type="text"
                  required
                  value={formData.room}
                  onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                  placeholder="Contoh: Lantai 2 / Ruang Sirkulasi"
                  className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Nomor / Nama Rak</label>
                <input
                  type="text"
                  required
                  value={formData.rack}
                  onChange={(e) => setFormData({ ...formData, rack: e.target.value })}
                  placeholder="Contoh: Rak 04 / Rak Sains"
                  className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Ambalan / Baris (Shelf)</label>
                <input
                  type="text"
                  required
                  value={formData.shelf}
                  onChange={(e) => setFormData({ ...formData, shelf: e.target.value })}
                  placeholder="Contoh: Baris 3 / Tingkat B"
                  className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                  className="h-9 rounded-lg border border-border px-4 text-sm font-medium text-muted-foreground hover:bg-muted"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="size-4 animate-spin" />}
                  <span>{editingLocation ? "Simpan Perubahan" : "Tambah Lokasi"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl">
            <h3 className="text-base font-bold text-foreground">Hapus Lokasi Rak?</h3>
            <p className="mt-2 text-xs text-muted-foreground">
              Lokasi hanya dapat dihapus jika tidak ada eksemplar buku aktif yang menempatinya.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                disabled={isDeleting}
                className="h-9 rounded-lg border border-border px-4 text-sm font-medium text-muted-foreground hover:bg-muted"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => void handleDelete(deletingId)}
                disabled={isDeleting}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-destructive px-4 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
              >
                {isDeleting && <Loader2 className="size-4 animate-spin" />}
                <span>Hapus</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default LocationSection;
