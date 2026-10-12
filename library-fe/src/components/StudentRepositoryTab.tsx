import { useState, useEffect } from "react";
import { repositoryService, type RepositoryProposal } from "@/services/repositoryService";
import { useToast } from "@/hooks/useToast";
import { API_BASE_URL } from "@/utils/api-config";
import {
  FileText,
  Upload,
  CheckCircle,
  AlertCircle,
  Clock,
  Eye,
  Loader2,
  BookOpen
} from "lucide-react";

export default function StudentRepositoryTab() {
  const { success, error } = useToast();
  const [proposals, setProposals] = useState<RepositoryProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    abstract: "",
    advisorName1: "",
    advisorName2: "",
    studyProgramId: 1,
    documentCategory: "PROPOSAL" as "PROPOSAL" | "THESIS" | "REPORT"
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const fetchProposals = async () => {
    try {
      setLoading(true);
      const data = await repositoryService.getMyProposals();
      setProposals(data);
    } catch (err: any) {
      console.error("Gagal memuat proposal mahasiswa:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProposals();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      error("File Diperlukan", "Silakan pilih berkas PDF terlebih dahulu");
      return;
    }

    if (!selectedFile.name.toLowerCase().endsWith(".pdf")) {
      error("Format Tidak Sesuai", "Berkas wajib berformat PDF");
      return;
    }

    try {
      setSubmitting(true);
      await repositoryService.submitProposal(formData, selectedFile);
      success("Berhasil", "Proposal / Skripsi berhasil diajukan untuk verifikasi pustakawan");
      setShowModal(false);
      setSelectedFile(null);
      setFormData({
        title: "",
        abstract: "",
        advisorName1: "",
        advisorName2: "",
        studyProgramId: 1,
        documentCategory: "PROPOSAL"
      });
      fetchProposals();
    } catch (err: any) {
      error("Pengajuan Gagal", err.message || "Terjadi kesalahan saat mengunggah");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            <CheckCircle className="w-3.5 h-3.5" /> Disetujui
          </span>
        );
      case "REVISION_REQUIRED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            <AlertCircle className="w-3.5 h-3.5" /> Perlu Revisi
          </span>
        );
      case "UNDER_REVIEW":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
            <Clock className="w-3.5 h-3.5" /> Sedang Direview
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <Clock className="w-3.5 h-3.5" /> Menunggu Verifikasi
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 rounded-2xl bg-card border border-border">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-red-700 dark:text-red-500" />
            Repositori Karya Ilmiah & Skripsi
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Unggah draf proposal atau laporan skripsi untuk ditinjau oleh pustakawan kampus.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm text-white bg-red-700 hover:bg-red-800 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2"
        >
          <Upload className="w-4 h-4" />
          Ajukan Proposal / Skripsi
        </button>
      </div>

      {/* List Submissions */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-red-700" />
            <p className="text-sm">Memuat riwayat pengajuan...</p>
          </div>
        ) : proposals.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
            <h3 className="text-base font-semibold text-foreground">Belum ada pengajuan karya ilmiah</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              Anda belum pernah mengunggah proposal atau skripsi. Klik tombol di atas untuk mengajukan berkas perdana Anda.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {proposals.map((item) => (
              <div key={item.id} className="p-6 space-y-4 hover:bg-muted/30 transition-colors">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-muted-foreground font-semibold">
                        {item.proposalNumber}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                        {item.documentCategory}
                      </span>
                      {getStatusBadge(item.status)}
                    </div>
                    <h3 className="text-base font-bold text-foreground pt-1">{item.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      Pembimbing 1: <strong className="text-foreground">{item.advisorName1}</strong>
                      {item.advisorName2 ? ` • Pembimbing 2: ${item.advisorName2}` : ""} • Total: {item.pageCount} Halaman
                    </p>
                  </div>

                  <a
                    href={`${API_BASE_URL}/api/repository/proposals/${item.id}/view-pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold border border-border hover:bg-muted text-foreground transition-colors shrink-0"
                  >
                    <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                    Lihat Dokumen
                  </a>
                </div>

                {item.abstract && (
                  <p className="text-sm text-muted-foreground line-clamp-2 bg-muted/40 p-3 rounded-xl border border-border/50">
                    {item.abstract}
                  </p>
                )}

                {item.reviewNotes && (
                  <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                          Catatan dari Pustakawan:
                        </h4>
                        <p className="text-xs text-amber-800 dark:text-amber-300 mt-1 whitespace-pre-line">
                          {item.reviewNotes}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Upload */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">Ajukan Proposal / Skripsi Mahasiswa</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Kategori Dokumen
                </label>
                <select
                  value={formData.documentCategory}
                  onChange={(e) =>
                    setFormData({ ...formData, documentCategory: e.target.value as any })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-red-600"
                >
                  <option value="PROPOSAL">Proposal Skripsi / Tugas Akhir</option>
                  <option value="THESIS">Laporan Skripsi Penuh</option>
                  <option value="REPORT">Laporan Praktik Kerja / Riset</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Judul Karya Ilmiah *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Masukkan judul lengkap karya ilmiah..."
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Dosen Pembimbing 1 *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nama Dosen Pembimbing Utama"
                    value={formData.advisorName1}
                    onChange={(e) => setFormData({ ...formData, advisorName1: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Dosen Pembimbing 2 (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Nama Dosen Pembimbing Pendamping"
                    value={formData.advisorName2}
                    onChange={(e) => setFormData({ ...formData, advisorName2: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Abstrak / Ringkasan Penelitian
                </label>
                <textarea
                  rows={3}
                  placeholder="Ringkasan latar belakang, metode, dan tujuan riset..."
                  value={formData.abstract}
                  onChange={(e) => setFormData({ ...formData, abstract: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Berkas File PDF (Maks. 25 MB) *
                </label>
                <div className="border-2 border-dashed border-border rounded-xl p-5 text-center hover:border-red-600 transition-colors cursor-pointer bg-muted/20">
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    required
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSelectedFile(e.target.files[0]);
                      }
                    }}
                    className="w-full text-xs text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-red-700 file:text-white hover:file:bg-red-800"
                  />
                  {selectedFile && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 font-medium">
                      ✓ Terpilih: {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-border flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium border border-border hover:bg-muted text-foreground transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium text-white bg-red-700 hover:bg-red-800 transition-colors disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Unggah Sekarang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
