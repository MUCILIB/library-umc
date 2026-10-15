import { useState, useEffect } from "react";
import { repositoryService, type RepositoryProposal } from "@/services/repositoryService";
import { studyProgramApi, type StudyProgram } from "@/api/client";
import { useToast } from "@/hooks/useToast";
import { API_BASE_URL } from "@/utils/api-config";
import { authClient } from "@/utils/auth-client";
import Modal from "@/components/ui/modal";
import {
  GraduationCap,
  FileText,
  CheckCircle,
  AlertCircle,
  Clock,
  Eye,
  Loader2,
  Download,
  Trash2,
  Edit3,
  Plus,
  FileCheck,
  AlertTriangle,
  Info,
  Maximize2,
  Minimize2
} from "lucide-react";

export default function StudentRepositoryTab() {
  const { data: sessionData } = authClient.useSession();
  const { success, error } = useToast();
  const [proposals, setProposals] = useState<RepositoryProposal[]>([]);
  const [studyPrograms, setStudyPrograms] = useState<StudyProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProposal, setEditingProposal] = useState<RepositoryProposal | null>(null);
  const [previewPdfItem, setPreviewPdfItem] = useState<{ id: string; title: string; blobUrl?: string } | null>(null);
  const [loadingPreviewId, setLoadingPreviewId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [isPdfFullscreen, setIsPdfFullscreen] = useState(false);

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

  const fetchStudyPrograms = async () => {
    try {
      const res = await studyProgramApi.list();
      if (res.data && res.data.length > 0) {
        setStudyPrograms(res.data);
        if (formData.studyProgramId === 1) {
          setFormData((prev) => ({ ...prev, studyProgramId: res.data[0].id }));
        }
      }
    } catch (err) {
      console.error("Gagal memuat program studi:", err);
    }
  };

  useEffect(() => {
    fetchProposals();
    fetchStudyPrograms();
  }, []);

  const openAddModal = () => {
    setEditingProposal(null);
    setSelectedFile(null);
    setFormData({
      title: "",
      abstract: "",
      advisorName1: "",
      advisorName2: "",
      studyProgramId: studyPrograms.length > 0 ? studyPrograms[0].id : 1,
      documentCategory: "PROPOSAL"
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: RepositoryProposal) => {
    setEditingProposal(item);
    setSelectedFile(null);
    setFormData({
      title: item.title,
      abstract: item.abstract || "",
      advisorName1: item.advisorName1,
      advisorName2: item.advisorName2 || "",
      studyProgramId: item.studyProgramId || (studyPrograms.length > 0 ? studyPrograms[0].id : 1),
      documentCategory: item.documentCategory
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mode tambah: file wajib
    if (!editingProposal && !selectedFile) {
      error("File Diperlukan", "Silakan pilih berkas PDF terlebih dahulu");
      return;
    }

    if (selectedFile && !selectedFile.name.toLowerCase().endsWith(".pdf")) {
      error("Format Tidak Sesuai", "Berkas wajib berformat PDF asli");
      return;
    }

    try {
      setSubmitting(true);
      if (editingProposal) {
        // Mode edit / revisi
        await repositoryService.updateProposal(
          editingProposal.id,
          formData,
          selectedFile || undefined
        );
        success(
          "Revisi Terkirim",
          "Naskah proposal / skripsi berhasil diperbarui untuk peninjauan pustakawan"
        );
      } else {
        // Mode tambah
        await repositoryService.submitProposal(formData, selectedFile!);
        success(
          "Pengajuan Berhasil",
          "Proposal / skripsi Anda berhasil diajukan untuk verifikasi pustakawan"
        );
      }
      setIsModalOpen(false);
      setSelectedFile(null);
      setEditingProposal(null);
      await fetchProposals();
    } catch (err: any) {
      error("Gagal Menyimpan", err.message || "Terjadi kesalahan saat mengunggah naskah");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Apakah Anda yakin ingin membatalkan dan menghapus naskah "${title}"?`)) {
      return;
    }

    try {
      setDeletingId(id);
      await repositoryService.deleteProposal(id);
      success("Dihapus", "Dokumen proposal berhasil dihapus");
      await fetchProposals();
    } catch (err: any) {
      error("Gagal Menghapus", err.message || "Terjadi kesalahan saat menghapus");
    } finally {
      setDeletingId(null);
    }
  };

  const handlePreviewPdf = async (item: RepositoryProposal) => {
    try {
      setLoadingPreviewId(item.id);
      const sessionToken = (sessionData as any)?.session?.token || (sessionData as any)?.token;
      const tokenParam = sessionToken ? `&token=${encodeURIComponent(sessionToken)}` : "";
      const authHeaders: Record<string, string> = {};
      if (sessionToken) {
        authHeaders["Authorization"] = `Bearer ${sessionToken}`;
      }

      const res = await fetch(`${API_BASE_URL}/api/repository/proposals/${item.id}/view-pdf?scope=self${tokenParam}`, {
        credentials: "include",
        headers: authHeaders
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.message || "Gagal memuat dokumen PDF");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setPreviewPdfItem({ id: item.id, title: item.title, blobUrl: url });
    } catch (err: any) {
      error("Pratinjau Gagal", err.message || "Tidak dapat memuat berkas naskah PDF");
    } finally {
      setLoadingPreviewId(null);
    }
  };

  const handleDownloadPdf = async (item: RepositoryProposal) => {
    try {
      setDownloadingId(item.id);
      const sessionToken = (sessionData as any)?.session?.token || (sessionData as any)?.token;
      const tokenParam = sessionToken ? `&token=${encodeURIComponent(sessionToken)}` : "";
      const authHeaders: Record<string, string> = {};
      if (sessionToken) {
        authHeaders["Authorization"] = `Bearer ${sessionToken}`;
      }

      const res = await fetch(`${API_BASE_URL}/api/repository/proposals/${item.id}/view-pdf?download=true&scope=self${tokenParam}`, {
        credentials: "include",
        headers: authHeaders
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.message || "Gagal mengunduh dokumen PDF");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const cleanTitle = item.title.replace(/[^a-zA-Z0-9_\- ]/g, "").trim().replace(/\s+/g, "_").substring(0, 50);
      a.download = `${cleanTitle || "naskah"}_${item.proposalNumber || item.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      success("Unduhan Berhasil", `Berkas "${item.title}" berhasil diunduh secara utuh`);
    } catch (err: any) {
      error("Gagal Mengunduh", err.message || "Tidak dapat mengunduh berkas naskah PDF");
    } finally {
      setDownloadingId(null);
    }
  };

  // Status Badge UI
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
            <CheckCircle className="w-3.5 h-3.5" /> Disetujui & Terpublikasi
          </span>
        );
      case "REVISION_REQUIRED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-300">
            <AlertCircle className="w-3.5 h-3.5" /> Perlu Revisi Naskah
          </span>
        );
      case "UNDER_REVIEW":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300">
            <Clock className="w-3.5 h-3.5" /> Sedang Ditinjau Pustakawan
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

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case "PROPOSAL":
        return "Proposal Skripsi / TA";
      case "THESIS":
        return "Laporan Skripsi Penuh";
      case "REPORT":
        return "Laporan PKL / Riset";
      default:
        return cat;
    }
  };

  // Hitungan statistik
  const countApproved = proposals.filter((p) => p.status === "APPROVED").length;
  const countRevision = proposals.filter((p) => p.status === "REVISION_REQUIRED").length;
  const countPending = proposals.filter(
    (p) => p.status === "SUBMITTED" || p.status === "UNDER_REVIEW"
  ).length;

  return (
    <div className="space-y-6">
      {/* Hero Banner Repositori - Pembeda tegas dengan Buku */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-red-950 via-slate-900 to-red-900 p-6 md:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 text-red-200 border border-red-500/30 text-xs font-semibold tracking-wide uppercase">
              <GraduationCap className="w-3.5 h-3.5" />
              Layanan Repositori Digital Mahasiswa
            </div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              Repositori Skripsi & Karya Ilmiah
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Ruang khusus sivitas akademika mahasiswa untuk mengunggah draf proposal skripsi atau naskah akhir, memantau tinjauan pustakawan, serta menerima catatan revisi. Terpisah dari layanan sirkulasi peminjaman buku perpustakaan.
            </p>
          </div>

          <div className="shrink-0">
            <button
              onClick={openAddModal}
              className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl font-bold text-sm text-slate-950 bg-white hover:bg-slate-100 transition-all shadow-lg hover:shadow-xl active:scale-95"
            >
              <Plus className="w-4 h-4 text-red-700" />
              Ajukan Naskah Baru
            </button>
          </div>
        </div>

        {/* Background decorative glow */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Info Callout: Perbedaan Fitur Buku vs Repositori */}
      <div className="rounded-2xl border border-red-200/60 bg-red-50/50 dark:bg-red-950/20 dark:border-red-900/40 p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-red-700 dark:text-red-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          <strong className="font-semibold text-red-800 dark:text-red-300">
            Pemberitahuan Khusus Repositori:
          </strong>{" "}
          Semua naskah yang diajukan di halaman ini akan diverifikasi oleh pustakawan kampus. Naskah yang disetujui (APPROVED) akan langsung terdaftar di katalog digital repositori perpustakaan UMC dan dapat dibaca sesuai batas halaman yang dikonfigurasi.
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl border border-border bg-card shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Naskah</span>
            <FileText className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-black text-foreground">{proposals.length}</p>
        </div>

        <div className="p-4 rounded-2xl border border-border bg-card shadow-xs">
          <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Menunggu Review</span>
            <Clock className="w-4 h-4" />
          </div>
          <p className="text-2xl font-black text-foreground">{countPending}</p>
        </div>

        <div className="p-4 rounded-2xl border border-border bg-card shadow-xs">
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Perlu Revisi</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <p className="text-2xl font-black text-foreground">{countRevision}</p>
        </div>

        <div className="p-4 rounded-2xl border border-border bg-card shadow-xs">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Disetujui</span>
            <FileCheck className="w-4 h-4" />
          </div>
          <p className="text-2xl font-black text-foreground">{countApproved}</p>
        </div>
      </div>

      {/* Daftar Pengajuan Mahasiswa */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-red-700 dark:text-red-500" />
            Riwayat Naskah Karya Ilmiah Mahasiswa
          </h3>
          <span className="text-xs text-muted-foreground">
            {proposals.length} Dokumen Diajukan
          </span>
        </div>

        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-red-700" />
            <p className="text-sm font-medium">Memuat data repositori karya ilmiah...</p>
          </div>
        ) : proposals.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 rounded-3xl bg-muted/60 flex items-center justify-center mx-auto mb-4 text-muted-foreground">
              <FileText className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Belum Ada Naskah Diajukan</h3>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-md mx-auto">
              Anda belum pernah mengunggah naskah proposal skripsi atau karya ilmiah. Klik tombol di bawah untuk mengajukan draf naskah perdana Anda.
            </p>
            <button
              onClick={openAddModal}
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-red-700 hover:bg-red-800 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Ajukan Naskah Sekarang
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {proposals.map((item) => (
              <div key={item.id} className="p-6 space-y-4 hover:bg-muted/20 transition-colors">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-muted text-foreground border border-border">
                        {item.proposalNumber}
                      </span>
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300">
                        {getCategoryLabel(item.documentCategory)}
                      </span>
                      {getStatusBadge(item.status)}
                    </div>

                    <h4 className="text-base font-bold text-foreground pt-1 leading-snug">
                      {item.title}
                    </h4>

                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-muted-foreground">
                      <span>
                        Pembimbing 1: <strong className="text-foreground">{item.advisorName1}</strong>
                      </span>
                      {item.advisorName2 && (
                        <span>
                          Pembimbing 2: <strong className="text-foreground">{item.advisorName2}</strong>
                        </span>
                      )}
                      <span>
                        Total: <strong className="text-foreground">{item.pageCount} Hal</strong>
                      </span>
                      <span>
                        Ukuran: <strong className="text-foreground">{(item.fileSize / (1024 * 1024)).toFixed(2)} MB</strong>
                      </span>
                      <span>
                        Diajukan: {new Date(item.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric"
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handlePreviewPdf(item)}
                      disabled={loadingPreviewId === item.id}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-muted hover:bg-muted/80 text-foreground border border-border transition-colors cursor-pointer disabled:opacity-50"
                      title="Lihat dan periksa dokumen PDF naskah Anda"
                    >
                      {loadingPreviewId === item.id ? (
                         <Loader2 className="w-3.5 h-3.5 animate-spin text-red-700" />
                      ) : (
                        <Eye className="w-3.5 h-3.5 text-red-700" />
                      )}
                      Baca PDF
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownloadPdf(item)}
                      disabled={downloadingId === item.id}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-muted hover:bg-muted/80 text-foreground border border-border transition-colors cursor-pointer disabled:opacity-50"
                      title="Unduh langsung berkas naskah PDF"
                    >
                      {downloadingId === item.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-red-700" />
                      ) : (
                        <Download className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                      Unduh
                    </button>

                    {item.status === "REVISION_REQUIRED" && (
                      <button
                        onClick={() => openEditModal(item)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-sm transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Unggah Revisi
                      </button>
                    )}

                    {item.status === "SUBMITTED" && (
                      <>
                        <button
                          onClick={() => openEditModal(item)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border transition-colors"
                          title="Edit informasi naskah"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(item.id, item.title)}
                          disabled={deletingId === item.id}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-destructive hover:bg-destructive/10 border border-border transition-colors disabled:opacity-40"
                          title="Batalkan dan hapus pengajuan"
                        >
                          {deletingId === item.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                          Hapus
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Abstrak */}
                {item.abstract && (
                  <div className="p-3.5 rounded-xl bg-muted/40 border border-border text-xs text-muted-foreground leading-relaxed">
                    <strong className="text-foreground block mb-1">Abstrak / Ringkasan:</strong>
                    <p className="line-clamp-3">{item.abstract}</p>
                  </div>
                )}

                {/* Catatan Review dari Pustakawan */}
                {item.reviewNotes && (
                  <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60">
                    <div className="flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <h5 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                          Catatan dari Tim Pustakawan:
                        </h5>
                        <p className="text-xs text-amber-800 dark:text-amber-300 whitespace-pre-line leading-relaxed">
                          {item.reviewNotes}
                        </p>
                        {item.status === "REVISION_REQUIRED" && (
                          <div className="pt-2">
                            <button
                              onClick={() => openEditModal(item)}
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-200 underline hover:no-underline"
                            >
                              Klik di sini untuk mengirim berkas revisi perbaikan &rarr;
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL POPUP DIALOG - Menggunakan @/components/ui/modal yang menutupi layar sepenuhnya via Portal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          editingProposal
            ? editingProposal.status === "REVISION_REQUIRED"
              ? "Unggah Revisi Naskah Skripsi Mahasiswa"
              : "Edit Informasi Naskah Skripsi"
            : "Ajukan Proposal / Skripsi Mahasiswa Baru"
        }
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Banner catatan revisi di dalam modal jika sedang merevisi */}
          {editingProposal?.reviewNotes && editingProposal.status === "REVISION_REQUIRED" && (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-xs">
              <strong className="text-amber-900 dark:text-amber-200 block font-bold mb-1">
                Catatan Evaluasi Pustakawan:
              </strong>
              <p className="text-amber-800 dark:text-amber-300 leading-relaxed whitespace-pre-line">
                {editingProposal.reviewNotes}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                Kategori Dokumen *
              </label>
              <select
                value={formData.documentCategory}
                onChange={(e) =>
                  setFormData({ ...formData, documentCategory: e.target.value as any })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-red-600 transition-all"
              >
                <option value="PROPOSAL">Proposal Skripsi / Tugas Akhir</option>
                <option value="THESIS">Laporan Skripsi Penuh</option>
                <option value="REPORT">Laporan Praktik Kerja / Riset</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                Program Studi *
              </label>
              <select
                value={formData.studyProgramId}
                onChange={(e) =>
                  setFormData({ ...formData, studyProgramId: Number(e.target.value) })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-red-600 transition-all"
              >
                {studyPrograms.length > 0 ? (
                  studyPrograms.map((prog) => (
                    <option key={prog.id} value={prog.id}>
                      {prog.name} ({prog.code})
                    </option>
                  ))
                ) : (
                  <>
                    <option value={1}>Teknik Informatika</option>
                    <option value={2}>Ilmu Komunikasi</option>
                    <option value={3}>Manajemen</option>
                    <option value={4}>Akuntansi</option>
                  </>
                )}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground mb-1.5">
              Judul Karya Ilmiah / Skripsi *
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Rancang Bangun Sistem Informasi Perpustakaan Digital..."
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-red-600 transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                Dosen Pembimbing 1 *
              </label>
              <input
                type="text"
                required
                placeholder="Nama Dosen Pembimbing Utama & Gelar"
                value={formData.advisorName1}
                onChange={(e) => setFormData({ ...formData, advisorName1: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-red-600 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                Dosen Pembimbing 2 (Opsional)
              </label>
              <input
                type="text"
                placeholder="Nama Dosen Pembimbing Pendamping"
                value={formData.advisorName2}
                onChange={(e) => setFormData({ ...formData, advisorName2: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-red-600 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground mb-1.5">
              Abstrak / Ringkasan Penelitian
            </label>
            <textarea
              rows={3}
              placeholder="Tuliskan latar belakang singkat, tujuan penelitian, dan metodologi..."
              value={formData.abstract}
              onChange={(e) => setFormData({ ...formData, abstract: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-red-600 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground mb-1.5">
              Berkas PDF Naskah {editingProposal ? "(Pilih jika ingin mengganti file)" : "* (Maks. 25 MB)"}
            </label>
            <div className="border-2 border-dashed border-border hover:border-red-600 rounded-2xl p-5 text-center transition-colors bg-muted/20">
              <input
                type="file"
                accept=".pdf,application/pdf"
                required={!editingProposal}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setSelectedFile(e.target.files[0]);
                  }
                }}
                className="w-full text-xs text-muted-foreground file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-red-700 file:text-white hover:file:bg-red-800 cursor-pointer"
              />
              {selectedFile ? (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 font-bold flex items-center justify-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Berkas Terpilih: {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                </p>
              ) : editingProposal ? (
                <p className="text-xs text-muted-foreground mt-2">
                  Berkas sebelumnya: {editingProposal.pageCount} Halaman ({(editingProposal.fileSize / (1024 * 1024)).toFixed(2)} MB)
                </p>
              ) : null}
            </div>
          </div>

          <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-border hover:bg-muted text-foreground transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-red-700 hover:bg-red-800 transition-colors shadow-sm disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingProposal ? "Simpan Perubahan & Ajukan" : "Unggah Naskah Sekarang"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Pratinjau Naskah PDF Mahasiswa */}
      <Modal
        isOpen={!!previewPdfItem}
        onClose={() => {
          if (previewPdfItem?.blobUrl) {
            URL.revokeObjectURL(previewPdfItem.blobUrl);
          }
          setPreviewPdfItem(null);
          setIsPdfFullscreen(false);
        }}
        title={previewPdfItem ? `Naskah PDF Lengkap: ${previewPdfItem.title}` : "Pratinjau Naskah PDF"}
        size={isPdfFullscreen ? "fullscreen" : "full"}
      >
        {previewPdfItem && (
          <div className="flex flex-col h-full min-h-0 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-border shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 shrink-0">
                  Naskah Milik Anda (Akses Penuh Bebas)
                </span>
                <span className="text-xs font-medium text-muted-foreground line-clamp-1">
                  {previewPdfItem.title}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsPdfFullscreen(!isPdfFullscreen)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
                  title={isPdfFullscreen ? "Keluar Layar Penuh" : "Layar Penuh"}
                >
                  {isPdfFullscreen ? (
                    <Minimize2 className="w-3.5 h-3.5" />
                  ) : (
                    <Maximize2 className="w-3.5 h-3.5" />
                  )}
                  <span>{isPdfFullscreen ? "Perkecil" : "Layar Penuh"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const matched = proposals.find((p) => p.id === previewPdfItem.id);
                    if (matched) handleDownloadPdf(matched);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Unduh Berkas
                </button>
                <a
                  href={previewPdfItem.blobUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-700 hover:bg-red-800 text-white text-xs font-semibold transition-colors shrink-0"
                >
                  Buka di Tab Baru
                </a>
              </div>
            </div>

            <div className="flex-1 w-full min-h-0 rounded-xl overflow-hidden border border-border bg-slate-900 shadow-inner">
              <iframe
                src={`${previewPdfItem.blobUrl}#toolbar=1&navpanes=1`}
                title={previewPdfItem.title}
                className="w-full h-full border-0"
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
