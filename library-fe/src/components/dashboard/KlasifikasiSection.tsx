import { useEffect, useState } from "react";
import { TablePagination } from "@/components/common/TablePagination";
import {
  Plus,
  Edit,
  Trash2,
  Loader,
  Layers,
  BookOpen,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import Modal from "@/components/ui/modal";
import { collectionTypeApi, type CollectionType } from "@/api/client";
import { useToast } from "@/hooks/useToast";

export default function KlasifikasiSection() {
  const [collectionTypes, setCollectionTypes] = useState<CollectionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<CollectionType | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    code: string;
    canBeBorrowed: boolean;
    description: string;
    colorTag: string;
  }>({
    name: "",
    code: "S",
    canBeBorrowed: true,
    description: "",
    colorTag: "emerald",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { success, error } = useToast();
  const itemsPerPage = 8;

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await collectionTypeApi.list();
      setCollectionTypes(res.data || []);
    } catch {
      error("Gagal memuat data klasifikasi koleksi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAdd = () => {
    setEditing(null);
    setFormData({
      name: "",
      code: "",
      canBeBorrowed: true,
      description: "",
      colorTag: "emerald",
    });
    setIsModalOpen(true);
  };

  const openEdit = (ct: CollectionType) => {
    setEditing(ct);
    setFormData({
      name: ct.name,
      code: ct.code || "",
      canBeBorrowed: ct.canBeBorrowed ?? true,
      description: ct.description || "",
      colorTag: ct.colorTag || "emerald",
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      error("Nama klasifikasi wajib diisi");
      return;
    }
    if (!formData.code.trim()) {
      error("Kode prefix barcode wajib diisi");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editing) {
        await collectionTypeApi.update(editing.id, {
          name: formData.name.trim(),
          code: formData.code.toUpperCase().trim(),
          canBeBorrowed: formData.canBeBorrowed,
          description: formData.description.trim() || undefined,
          colorTag: formData.colorTag || undefined,
        });
        success("Klasifikasi berhasil diperbarui");
      } else {
        await collectionTypeApi.create({
          name: formData.name.trim(),
          code: formData.code.toUpperCase().trim(),
          canBeBorrowed: formData.canBeBorrowed,
          description: formData.description.trim() || undefined,
          colorTag: formData.colorTag || undefined,
        });
        success("Klasifikasi baru berhasil ditambahkan");
      }
      setIsModalOpen(false);
      await fetchData();
    } catch (err: unknown) {
      error(err instanceof Error ? err.message : "Gagal menyimpan klasifikasi");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Hapus klasifikasi buku "${name}"?`)) return;
    try {
      await collectionTypeApi.delete(id);
      success("Klasifikasi berhasil dihapus");
      await fetchData();
    } catch (err: unknown) {
      error(err instanceof Error ? err.message : "Gagal menghapus klasifikasi");
    }
  };

  const totalPages = Math.max(1, Math.ceil(collectionTypes.length / itemsPerPage));
  const paginated = collectionTypes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Manajemen Klasifikasi Buku
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Konfigurasi tipe koleksi, kode prefix barcode (S/R), dan aturan sirkulasi perpustakaan
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
        >
          <Plus className="size-4" />
          <span>Tambah Klasifikasi</span>
        </button>
      </div>

      {/* Info Cards Standar S & R */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200/70 bg-emerald-50/50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-sm font-bold text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
            S
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground">Sirkulasi (Prefix S)</h4>
            <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
              Buku koleksi umum yang dapat dipinjam keluar oleh mahasiswa & dosen. Format Barcode:{" "}
              <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                S-2026-10001-c1
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-2xl border border-amber-200/70 bg-amber-50/50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-sm font-bold text-amber-700 dark:bg-amber-900/60 dark:text-amber-300">
            R
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground">Referensi (Prefix R)</h4>
            <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
              Koleksi rujukan (kamus, ensiklopedia, guidebook, buku langka).{" "}
              <strong className="text-amber-700 dark:text-amber-300 font-semibold">Hanya dibaca di tempat</strong>.
              Format:{" "}
              <span className="font-mono font-semibold text-amber-600 dark:text-amber-400">
                R-2026-10002-c1
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Content Table */}
      {loading ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-border bg-card">
          <Loader className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : collectionTypes.length === 0 ? (
        <div className="flex h-40 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card p-6 text-center">
          <Layers className="mb-2 size-8 text-muted-foreground/60" />
          <p className="text-sm font-semibold text-foreground">Belum ada data klasifikasi</p>
          <p className="text-xs text-muted-foreground mt-1">
            Klik tombol Tambah Klasifikasi untuk mendefinisikan tipe koleksi baru
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Nama Klasifikasi</th>
                  <th className="px-4 py-3">Kode Prefix</th>
                  <th className="px-4 py-3">Aturan Sirkulasi</th>
                  <th className="px-4 py-3">Deskripsi</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginated.map((ct) => {
                  const isRef = !ct.canBeBorrowed || ct.code?.toUpperCase() === "R";
                  return (
                    <tr key={ct.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3.5 font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          <BookOpen className="size-4 text-primary shrink-0" />
                          <span>{ct.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-mono font-bold text-foreground">
                        <span className="inline-flex items-center justify-center rounded-md border border-border bg-muted px-2 py-0.5 text-xs">
                          {ct.code || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        {isRef ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-400">
                            <AlertCircle className="size-3" />
                            Hanya Baca di Tempat
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                            <CheckCircle2 className="size-3" />
                            Dapat Dipinjam (Sirkulasi)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground max-w-xs truncate">
                        {ct.description || "-"}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(ct)}
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                            title="Edit Klasifikasi"
                          >
                            <Edit className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(ct.id, ct.name)}
                            className="rounded-md p-1.5 text-destructive hover:bg-destructive/10"
                            title="Hapus Klasifikasi"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={collectionTypes.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            label="klasifikasi"
          />
        </>
      )}

      {/* Floating Modal Tambah / Edit Klasifikasi Sesuai GEMINI.md */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editing ? "Edit Klasifikasi Buku" : "Tambah Klasifikasi Buku"}
        size="md"
      >
        <div className="space-y-4 p-5 text-foreground">
          <div>
            <label className="mb-1 block text-xs font-semibold text-foreground">
              Nama Klasifikasi *
            </label>
            <input
              name="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Contoh: Umum, Referensi, Matematika, Muatan Lokal, dll."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-foreground">
              Kode Prefix Barcode / Eksemplar *
            </label>
            <input
              name="code"
              value={formData.code}
              onChange={(e) =>
                setFormData({ ...formData, code: e.target.value.toUpperCase().slice(0, 10) })
              }
              placeholder="Contoh: UM, REF, MAT, S, R, dll."
              maxLength={10}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono font-bold text-foreground uppercase focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Kode prefix yang digunakan sebagai awalan barcode fisik eksemplar.
            </p>
          </div>

          {/* Toggle Boleh Dipinjam Pulang */}
          <div className="rounded-xl border border-border bg-muted/20 p-3.5">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.canBeBorrowed}
                onChange={(e) =>
                  setFormData({ ...formData, canBeBorrowed: e.target.checked })
                }
                className="mt-0.5 size-4 accent-primary rounded cursor-pointer"
              />
              <div>
                <span className="text-xs font-bold text-foreground block">
                  Boleh Dipinjam Pulang oleh Pemustaka
                </span>
                <span className="text-[11px] text-muted-foreground block mt-0.5">
                  {formData.canBeBorrowed
                    ? "Koleksi dapat dipinjam keluar perpustakaan oleh pemustaka (mahasiswa & dosen)."
                    : "Koleksi HANYA BACA DI TEMPAT (tidak diperkenankan untuk dipinjam keluar)."}
                </span>
              </div>
            </label>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-foreground">
              Deskripsi / Keterangan
            </label>
            <textarea
              name="description"
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Contoh: Koleksi umum, koleksi rujukan, atau koleksi terbatas."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
              className="h-9 rounded-lg border border-border px-4 text-sm font-medium text-muted-foreground hover:bg-muted"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSubmitting}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting && <Loader className="size-4 animate-spin" />}
              <span>{editing ? "Perbarui" : "Simpan"}</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
