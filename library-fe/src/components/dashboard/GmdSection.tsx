import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Edit, Trash2, Loader, Layers, Search } from "lucide-react";
import Modal from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { TablePagination } from "@/components/common/TablePagination";
import { gmdApi, type Gmd } from "@/api/client";
import { useToast } from "@/hooks/useToast";

export default function GmdSection() {
  const [gmds, setGmds] = useState<Gmd[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Gmd | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Gmd | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { success, error } = useToast();
  const itemsPerPage = 10;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await gmdApi.list();
      setGmds(res.data || []);
    } catch {
      error("Gagal memuat data tipe GMD");
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return gmds;
    return gmds.filter((item) => item.name.toLowerCase().includes(q));
  }, [gmds, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice(
    (safePage - 1) * itemsPerPage,
    safePage * itemsPerPage
  );

  const openAdd = () => {
    setEditing(null);
    setNameInput("");
    setIsModalOpen(true);
  };

  const openEdit = (gmd: Gmd) => {
    setEditing(gmd);
    setNameInput(gmd.name);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nameInput.trim();
    if (!trimmed) {
      error("Nama tipe GMD wajib diisi");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editing) {
        await gmdApi.update(editing.id, { name: trimmed });
        success("Tipe GMD berhasil diperbarui");
      } else {
        await gmdApi.create({ name: trimmed });
        success("Tipe GMD berhasil ditambahkan");
      }
      setIsModalOpen(false);
      await fetchData();
    } catch (err: unknown) {
      error(err instanceof Error ? err.message : "Gagal menyimpan tipe GMD");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await gmdApi.delete(deleteTarget.id);
      success(`Tipe GMD "${deleteTarget.name}" berhasil dihapus`);
      setDeleteTarget(null);
      await fetchData();
    } catch (err: unknown) {
      error(err instanceof Error ? err.message : "Gagal menghapus tipe GMD");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Manajemen Tipe GMD
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Kelola tipe General Material Designation (GMD / spesifikasi isi) yang tampil di form bibliografi
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 cursor-pointer"
        >
          <Plus className="size-4" />
          <span>Tambah Tipe GMD</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          placeholder="Cari tipe GMD..."
          className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-border bg-card">
          <Loader className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Layers}
          title={searchTerm.trim() ? "Tipe GMD tidak ditemukan" : "Belum ada data tipe GMD"}
          description={
            searchTerm.trim()
              ? "Coba kata kunci pencarian lain."
              : "Klik tombol Tambah Tipe GMD untuk menambahkan jenis GMD baru."
          }
          className="rounded-xl border border-dashed border-border bg-card"
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="w-16 px-4 py-3">No</th>
                  <th className="px-4 py-3">Nama Tipe GMD</th>
                  <th className="w-28 px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginated.map((gmd, idx) => (
                  <tr key={gmd.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3.5 text-xs font-mono text-muted-foreground">
                      {(safePage - 1) * itemsPerPage + idx + 1}
                    </td>
                    <td className="px-4 py-3.5 font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        <Layers className="size-4 shrink-0 text-primary" />
                        <span>{gmd.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(gmd)}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                          title="Edit tipe GMD"
                        >
                          <Edit className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(gmd)}
                          className="rounded-md p-1.5 text-destructive hover:bg-destructive/10 cursor-pointer"
                          title="Hapus tipe GMD"
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

          <TablePagination
            currentPage={safePage}
            totalPages={totalPages}
            totalItems={filtered.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            label="tipe GMD"
          />
        </>
      )}

      {/* Floating Modal Tambah / Edit Tipe GMD */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editing ? "Edit Tipe GMD" : "Tambah Tipe GMD"}
        size="sm"
      >
        <form onSubmit={handleSave} className="space-y-4 p-5 text-foreground">
          <div>
            <label
              htmlFor="gmd-name-input"
              className="mb-1 block text-xs font-semibold text-foreground"
            >
              Nama Tipe GMD *
            </label>
            <input
              id="gmd-name-input"
              name="name"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Contoh: Buku Inti, Text, Audio, Video, E-Journal"
              maxLength={100}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-border pt-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
              className="h-9 rounded-lg border border-border px-4 text-sm font-medium text-muted-foreground hover:bg-muted cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting && <Loader className="size-4 animate-spin" />}
              <span>{editing ? "Perbarui" : "Simpan"}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Floating Modal Konfirmasi Hapus Tipe GMD */}
      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => !isDeleting && setDeleteTarget(null)}
        title="Hapus Tipe GMD"
        size="sm"
      >
        <div className="space-y-4 p-5 text-foreground">
          <p className="text-sm text-foreground">
            Apakah Anda yakin ingin menghapus tipe GMD{" "}
            <span className="font-bold">&quot;{deleteTarget?.name}&quot;</span>?
          </p>
          <p className="text-xs text-muted-foreground">
            Data bibliografi yang sudah memakai tipe ini tetap aman, namun tipe GMD yang dihapus tidak akan muncul lagi pada pilihan form baru.
          </p>
          <div className="flex items-center justify-end gap-3 border-t border-border pt-3">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
              className="h-9 rounded-lg border border-border px-4 text-sm font-medium text-muted-foreground hover:bg-muted cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-destructive px-5 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 cursor-pointer"
            >
              {isDeleting && <Loader className="size-4 animate-spin" />}
              <span>Hapus</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
