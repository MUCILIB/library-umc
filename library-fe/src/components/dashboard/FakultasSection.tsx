import { useEffect, useState } from "react";
import {
  Plus, Edit, Trash2, Loader, ChevronLeft, ChevronRight
} from "lucide-react";
import Modal from "@/components/ui/modal";
import { facultyApi, type Faculty } from "@/api/client";
import { useToast } from "@/hooks/useToast";

export default function FakultasSection() {
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Faculty | null>(null);
  const [formData, setFormData] = useState({ name: "", code: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { success, error } = useToast();
  const itemsPerPage = 8;

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await facultyApi.list();
      setFaculties(res.data || []);
    } catch (err) {
      error("Gagal memuat data fakultas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const openAdd = () => {
    setEditing(null);
    setFormData({ name: "", code: "" });
    setIsModalOpen(true);
  };

  const openEdit = (fac: Faculty) => {
    setEditing(fac);
    setFormData({ name: fac.name, code: fac.code || "" });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) { error("Nama fakultas wajib diisi"); return; }
    setIsSubmitting(true);
    try {
      if (editing) {
        await facultyApi.update(editing.id, formData);
        success("Fakultas diperbarui");
      } else {
        await facultyApi.create(formData);
        success("Fakultas ditambahkan");
      }
      setIsModalOpen(false);
      await fetchData();
    } catch (err: any) {
      error(err?.message || "Gagal menyimpan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Hapus fakultas "${name}"?`)) return;
    try {
      await facultyApi.delete(id);
      success("Fakultas dihapus");
      await fetchData();
    } catch (err: any) {
      error(err?.message || "Gagal menghapus");
    }
  };

  const totalPages = Math.max(1, Math.ceil(faculties.length / itemsPerPage));
  const paginated = faculties.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Manajemen Fakultas
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Daftar dan konfigurasi fakultas Universitas Muhammadiyah Cirebon
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
        >
          <Plus className="size-4" />
          <span>Tambah Fakultas</span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader className="size-6 animate-spin text-primary" /></div>
      ) : (
        <>
          <div className="border border-border rounded-xl overflow-hidden bg-card">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-muted/50 text-muted-foreground text-xs font-semibold border-b border-border">
                  <th className="px-4 py-3 sm:px-6">Kode</th>
                  <th className="px-4 py-3 sm:px-6">Nama Fakultas</th>
                  <th className="px-4 py-3 text-right sm:px-6">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginated.length === 0 ? (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">Belum ada data fakultas</td></tr>
                ) : paginated.map((fac) => (
                  <tr key={fac.id} className="hover:bg-muted/40">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground sm:px-6">{fac.code || "-"}</td>
                    <td className="px-4 py-3 font-medium text-foreground sm:px-6">{fac.name}</td>
                    <td className="px-4 py-3 text-right sm:px-6">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(fac)}
                          className="inline-flex size-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                          title="Edit fakultas"
                        >
                          <Edit className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(fac.id, fac.name)}
                          className="inline-flex size-8 items-center justify-center rounded-lg border border-border text-destructive hover:bg-destructive/10"
                          title="Hapus fakultas"
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

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-30"><ChevronLeft className="size-4" /></button>
              <span className="text-sm text-muted-foreground">{currentPage} / {totalPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-30"><ChevronRight className="size-4" /></button>
            </div>
          )}
        </>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editing ? "Edit Fakultas" : "Tambah Fakultas"}>
        <div className="space-y-4 p-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-foreground">Nama Fakultas *</label>
            <input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Contoh: Fakultas Teknik"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-foreground">Kode Fakultas</label>
            <input
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              placeholder="Contoh: FT (opsional)"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
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
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
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
