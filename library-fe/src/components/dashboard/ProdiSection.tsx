import { useEffect, useState } from "react";
import {
  Plus, Edit, Trash2, Save, Loader, ChevronLeft, ChevronRight, GraduationCap
} from "lucide-react";
import Modal from "@/components/ui/modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { facultyApi, studyProgramApi, type Faculty, type StudyProgram } from "@/api/client";
import { useToast } from "@/hooks/useToast";

export default function ProdiSection() {
  const [programs, setPrograms] = useState<StudyProgram[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<StudyProgram | null>(null);
  const [formData, setFormData] = useState({ name: "", code: "", facultyId: 0 });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { success, error } = useToast();
  const itemsPerPage = 8;

  const fetchData = async () => {
    setLoading(true);
    try {
      const [progRes, facRes] = await Promise.all([
        studyProgramApi.list(),
        facultyApi.list(),
      ]);
      setPrograms(progRes.data || []);
      setFaculties(facRes.data || []);
    } catch (err) {
      error("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const getFacultyName = (facultyId: number) => {
    const f = faculties.find((f) => f.id === facultyId);
    return f?.name || "-";
  };

  const openAdd = () => {
    setEditing(null);
    setFormData({ name: "", code: "", facultyId: faculties[0]?.id || 0 });
    setIsModalOpen(true);
  };

  const openEdit = (prog: StudyProgram) => {
    setEditing(prog);
    setFormData({ name: prog.name, code: prog.code || "", facultyId: prog.facultyId });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) { error("Nama program studi wajib diisi"); return; }
    if (!formData.facultyId) { error("Pilih fakultas"); return; }
    setIsSubmitting(true);
    try {
      if (editing) {
        await studyProgramApi.update(editing.id, formData);
        success("Program studi diperbarui");
      } else {
        await studyProgramApi.create(formData);
        success("Program studi ditambahkan");
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
    if (!confirm(`Hapus program studi "${name}"?`)) return;
    try {
      await studyProgramApi.delete(id);
      success("Program studi dihapus");
      await fetchData();
    } catch (err: any) {
      error(err?.message || "Gagal menghapus");
    }
  };

  const totalPages = Math.max(1, Math.ceil(programs.length / itemsPerPage));
  const paginated = programs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <GraduationCap className="size-5 text-primary" /> Manajemen Program Studi
        </h2>
        <button onClick={openAdd} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/95 transition-all flex items-center gap-2">
          <Plus className="size-4" /> Tambah Prodi
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader className="size-6 animate-spin text-primary" /></div>
      ) : (
        <>
          <div className="border border-border rounded-xl overflow-hidden bg-card">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-muted/70 text-muted-foreground text-xs uppercase font-bold border-b border-border">
                  <th className="px-4 py-3">Kode</th>
                  <th className="px-4 py-3">Nama Prodi</th>
                  <th className="px-4 py-3">Fakultas</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Belum ada data</td></tr>
                ) : paginated.map((prog) => (
                  <tr key={prog.id} className="border-b border-border hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{prog.code || "-"}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{prog.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{getFacultyName(prog.facultyId)}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openEdit(prog)} className="p-1.5 text-muted-foreground hover:text-primary transition-colors"><Edit className="size-4" /></button>
                      <button onClick={() => handleDelete(prog.id, prog.name)} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="size-4" /></button>
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

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editing ? "Edit Program Studi" : "Tambah Program Studi"}>
        <div className="space-y-4 p-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Nama Program Studi *</label>
            <input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full rounded-lg border border-border px-3 py-2 text-sm bg-background" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Kode</label>
            <input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="Opsional" className="w-full rounded-lg border border-border px-3 py-2 text-sm bg-background" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Fakultas *</label>
            <Select
              value={formData.facultyId ? String(formData.facultyId) : ""}
              onValueChange={(val) => setFormData({ ...formData, facultyId: Number(val) })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pilih Fakultas" />
              </SelectTrigger>
              <SelectContent>
                {faculties.map((f) => (
                  <SelectItem key={f.id} value={String(f.id)}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <button onClick={handleSave} disabled={isSubmitting} className="w-full rounded-lg bg-primary py-2 text-sm font-semibold text-white hover:bg-primary/95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {isSubmitting && <Loader className="size-4 animate-spin" />}
            <Save className="size-4" /> {editing ? "Perbarui" : "Simpan"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
