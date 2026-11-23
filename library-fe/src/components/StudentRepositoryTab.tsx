import { useState, useEffect, useMemo } from "react";
import {
  repositoryService,
  type RepositoryProposal
} from "@/services/repositoryService";
import { studyProgramApi, type StudyProgram } from "@/api/client";
import { useToast } from "@/hooks/useToast";
import { API_BASE_URL } from "@/utils/api-config";
import { authClient } from "@/utils/auth-client";
import Modal from "@/components/ui/modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
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
  Maximize2,
  Minimize2,
  Search,
  X,
  Filter,
  Calendar,
  User,
  ArrowRight,
  BookOpen
} from "lucide-react";
import {
  CHAPTER_OPTIONS,
  getChapterBadge,
  getProgramChapterConfig,
} from "@/utils/thesisChapters";

export { CHAPTER_OPTIONS, getChapterBadge };

export default function StudentRepositoryTab() {
  const { data: sessionData } = authClient.useSession();
  const { success, error } = useToast();
  const [proposals, setProposals] = useState<RepositoryProposal[]>([]);
  const [studyPrograms, setStudyPrograms] = useState<StudyProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProposal, setEditingProposal] = useState<RepositoryProposal | null>(
    null
  );
  const [previewPdfItem, setPreviewPdfItem] = useState<{
    id: string;
    title: string;
    blobUrl?: string;
  } | null>(null);
  const [loadingPreviewId, setLoadingPreviewId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [isPdfFullscreen, setIsPdfFullscreen] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    abstract: "",
    advisorName1: "",
    advisorName2: "",
    studyProgramId: 1,
    documentCategory: "THESIS" as "PROPOSAL" | "THESIS" | "REPORT",
    chapter: "BAB_1",
    chapterTitle: "Pendahuluan"
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [customChapterSettings, setCustomChapterSettings] = useState<Record<string, any>>({});

  const fetchProposals = async () => {
    try {
      setLoading(true);
      const data = await repositoryService.getMyProposals();
      setProposals(data);
    } catch (err: unknown) {
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

  const fetchChapterSettings = async () => {
    try {
      const data = await repositoryService.getChapterSettings();
      setCustomChapterSettings(data || {});
    } catch (err) {
      console.warn("Gagal memuat konfigurasi bab kustom:", err);
    }
  };

  useEffect(() => {
    fetchProposals();
    fetchStudyPrograms();
    fetchChapterSettings();
  }, []);

  // Filtered Proposals
  const filteredProposals = useMemo(() => {
    return proposals.filter((p) => {
      const query = searchQuery.trim().toLowerCase();
      const matchSearch =
        !query ||
        p.title.toLowerCase().includes(query) ||
        (p.proposalNumber && p.proposalNumber.toLowerCase().includes(query)) ||
        (p.advisorName1 && p.advisorName1.toLowerCase().includes(query)) ||
        (p.advisorName2 && p.advisorName2.toLowerCase().includes(query));

      const matchStatus =
        statusFilter === "all" || p.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [proposals, searchQuery, statusFilter]);

  // Konfigurasi Bab Berdasarkan Program Studi yang Sedang Dipilih
  const activeProgram = useMemo(() => {
    return studyPrograms.find((p) => p.id === formData.studyProgramId) || null;
  }, [studyPrograms, formData.studyProgramId]);

  const activeChapterConfig = useMemo(() => {
    return getProgramChapterConfig(activeProgram, customChapterSettings);
  }, [activeProgram, customChapterSettings]);

  const currentChapterOptions = activeChapterConfig.chapters;

  const openAddModal = () => {
    setEditingProposal(null);
    setSelectedFile(null);
    const latestProp = proposals[0];
    const targetProgId = latestProp?.studyProgramId || (studyPrograms.length > 0 ? studyPrograms[0].id : 1);
    const targetProg = studyPrograms.find((p) => p.id === targetProgId);
    const config = getProgramChapterConfig(targetProg, customChapterSettings);
    const defaultOpt = config.chapters.find((c) => c.value === "BAB_1") || config.chapters[0];

    setFormData({
      title: latestProp?.title || "",
      abstract: latestProp?.abstract || "",
      advisorName1: latestProp?.advisorName1 || "",
      advisorName2: latestProp?.advisorName2 || "",
      studyProgramId: targetProgId,
      documentCategory: latestProp?.documentCategory || "THESIS",
      chapter: defaultOpt.value,
      chapterTitle: defaultOpt.defaultTitle,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: RepositoryProposal) => {
    setEditingProposal(item);
    setSelectedFile(null);
    const progId = item.studyProgramId || (studyPrograms.length > 0 ? studyPrograms[0].id : 1);
    const prog = studyPrograms.find((p) => p.id === progId);
    const config = getProgramChapterConfig(prog, customChapterSettings);
    const chapterMatch = config.chapters.find((c) => c.value === item.chapter);

    setFormData({
      title: item.title,
      abstract: item.abstract || "",
      advisorName1: item.advisorName1,
      advisorName2: item.advisorName2 || "",
      studyProgramId: progId,
      documentCategory: item.documentCategory,
      chapter: item.chapter || (config.chapters[0]?.value || "BAB_1"),
      chapterTitle: item.chapterTitle || chapterMatch?.defaultTitle || "Pendahuluan",
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan saat mengunggah naskah";
      error("Gagal Menyimpan", msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (
      !confirm(
        `Apakah Anda yakin ingin membatalkan dan menghapus naskah "${title}"?`
      )
    ) {
      return;
    }

    try {
      setDeletingId(id);
      await repositoryService.deleteProposal(id);
      success("Dihapus", "Dokumen proposal berhasil dihapus");
      await fetchProposals();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan saat menghapus";
      error("Gagal Menghapus", msg);
    } finally {
      setDeletingId(null);
    }
  };

  const handlePreviewPdf = async (item: RepositoryProposal) => {
    try {
      setLoadingPreviewId(item.id);
      const sessionObj = sessionData as Record<string, unknown> | undefined;
      const sessionToken =
        (sessionObj?.session as { token?: string })?.token ||
        (sessionObj?.token as string);
      const authHeaders: Record<string, string> = {};
      if (sessionToken) {
        authHeaders["Authorization"] = `Bearer ${sessionToken}`;
      }

      const res = await fetch(
        `${API_BASE_URL}/api/repository/proposals/${item.id}/view-pdf?scope=self`,
        {
          credentials: "include",
          headers: authHeaders
        }
      );
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.message || "Gagal memuat dokumen PDF");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setPreviewPdfItem({ id: item.id, title: item.title, blobUrl: url });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Tidak dapat memuat berkas naskah PDF";
      error("Pratinjau Gagal", msg);
    } finally {
      setLoadingPreviewId(null);
    }
  };

  const handleDownloadPdf = async (item: RepositoryProposal) => {
    try {
      setDownloadingId(item.id);
      const sessionObj = sessionData as Record<string, unknown> | undefined;
      const sessionToken =
        (sessionObj?.session as { token?: string })?.token ||
        (sessionObj?.token as string);
      const authHeaders: Record<string, string> = {};
      if (sessionToken) {
        authHeaders["Authorization"] = `Bearer ${sessionToken}`;
      }

      const res = await fetch(
        `${API_BASE_URL}/api/repository/proposals/${item.id}/view-pdf?download=true&scope=self`,
        {
          credentials: "include",
          headers: authHeaders
        }
      );
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.message || "Gagal mengunduh dokumen PDF");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const cleanTitle = item.title
        .replace(/[^a-zA-Z0-9_\- ]/g, "")
        .trim()
        .replace(/\s+/g, "_")
        .substring(0, 50);
      a.download = `${cleanTitle || "naskah"}_${
        item.proposalNumber || item.id
      }.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      success(
        "Unduhan Berhasil",
        `Berkas "${item.title}" berhasil diunduh secara utuh`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Tidak dapat mengunduh berkas naskah PDF";
      error("Gagal Mengunduh", msg);
    } finally {
      setDownloadingId(null);
    }
  };

  // Status Badge UI
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle className="w-3.5 h-3.5 shrink-0" /> Disetujui & Terpublikasi
          </span>
        );
      case "REVISION_REQUIRED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" /> Perlu Revisi
          </span>
        );
      case "UNDER_REVIEW":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
            <Clock className="w-3.5 h-3.5 shrink-0" /> Ditinjau Pustakawan
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-muted text-muted-foreground border border-border">
            <Clock className="w-3.5 h-3.5 shrink-0" /> Menunggu Verifikasi
          </span>
        );
    }
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case "PROPOSAL":
        return "Proposal Skripsi";
      case "THESIS":
        return "Laporan Skripsi";
      case "REPORT":
        return "Laporan Riset / PKL";
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
    <div className="space-y-3.5 animate-fade-in">
      {/* Header Repositori Karya Ilmiah Mahasiswa (Compact) */}
      <div className="bg-card border border-border rounded-xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary shrink-0" />
              Karya Ilmiah & Skripsi
            </h2>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              Repositori Mahasiswa
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Unggah dan pantau draf naskah skripsi, proposal, atau laporan riset untuk dikurasi pustakawan kampus.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl font-semibold text-xs text-white bg-primary hover:bg-primary/90 transition-all shadow-xs active:scale-98 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>Ajukan Naskah Baru</span>
        </button>
      </div>

      {/* Mini Stats Bar (Compact) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="px-3.5 py-2 rounded-xl border border-border bg-card shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
              Total Naskah
            </span>
            <span className="text-base sm:text-lg font-bold text-foreground">{proposals.length}</span>
          </div>
          <FileText className="w-4 h-4 text-muted-foreground" />
        </div>

        <div className="px-3.5 py-2 rounded-xl border border-border bg-card shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
              Dalam Review
            </span>
            <span className="text-base sm:text-lg font-bold text-foreground">{countPending}</span>
          </div>
          <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        </div>

        <div className="px-3.5 py-2 rounded-xl border border-border bg-card shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
              Perlu Revisi
            </span>
            <span className="text-base sm:text-lg font-bold text-foreground">{countRevision}</span>
          </div>
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        </div>

        <div className="px-3.5 py-2 rounded-xl border border-border bg-card shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
              Disetujui
            </span>
            <span className="text-base sm:text-lg font-bold text-foreground">{countApproved}</span>
          </div>
          <FileCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        </div>
      </div>

      {/* Toolbar: Search & Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-card p-2.5 sm:p-3 rounded-xl border border-border shadow-2xs">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari judul, nomor dokumen, pembimbing..."
            className="w-full pl-9 pr-8 py-2 bg-muted/40 border border-border rounded-xl text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-md"
              title="Hapus pencarian"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter: Dropdown Shadcn UI pada HP (< sm) */}
        <div className="sm:hidden w-full">
          <Select
            value={statusFilter}
            onValueChange={(val) => setStatusFilter(val)}
          >
            <SelectTrigger className="w-full bg-muted/60 border-border rounded-xl text-xs font-bold text-foreground h-9 shadow-2xs">
              <div className="flex items-center gap-2 truncate">
                <Filter size={12} className="text-primary shrink-0" />
                <SelectValue placeholder="Filter status..." />
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-xl border border-border bg-card shadow-lg z-50">
              <SelectItem value="all" className="text-xs font-bold py-2 cursor-pointer">
                Semua Status ({proposals.length})
              </SelectItem>
              <SelectItem value="APPROVED" className="text-xs font-bold py-2 cursor-pointer">
                Disetujui ({countApproved})
              </SelectItem>
              <SelectItem value="REVISION_REQUIRED" className="text-xs font-bold py-2 cursor-pointer">
                Perlu Revisi ({countRevision})
              </SelectItem>
              <SelectItem value="UNDER_REVIEW" className="text-xs font-bold py-2 cursor-pointer">
                Review / Menunggu ({countPending})
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Filter: Chips Horizontal pada Desktop (>= sm) */}
        <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              statusFilter === "all"
                ? "bg-primary text-white shadow-2xs"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            Semua ({proposals.length})
          </button>
          <button
            onClick={() => setStatusFilter("APPROVED")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              statusFilter === "APPROVED"
                ? "bg-emerald-600 text-white shadow-2xs"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <CheckCircle size={12} />
            Disetujui ({countApproved})
          </button>
          <button
            onClick={() => setStatusFilter("REVISION_REQUIRED")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              statusFilter === "REVISION_REQUIRED"
                ? "bg-amber-600 text-white shadow-2xs"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <AlertTriangle size={12} />
            Revisi ({countRevision})
          </button>
          <button
            onClick={() => setStatusFilter("UNDER_REVIEW")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              statusFilter === "UNDER_REVIEW"
                ? "bg-blue-600 text-white shadow-2xs"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Clock size={12} />
            Review ({countPending})
          </button>
        </div>
      </div>

      {/* Daftar Pengajuan Mahasiswa */}
      <div className="rounded-xl sm:rounded-2xl border border-border bg-card overflow-hidden shadow-2xs">
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between">
          <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
            <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5 text-red-700 dark:text-red-500" />
            Naskah Karya Ilmiah Mahasiswa
          </h3>
          <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">
            {filteredProposals.length} dari {proposals.length} Dokumen
          </span>
        </div>

        {loading ? (
          <div className="p-12 sm:p-16 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-red-700" />
            <p className="text-xs sm:text-sm font-medium">Memuat data repositori karya ilmiah...</p>
          </div>
        ) : filteredProposals.length === 0 ? (
          <div className="p-10 sm:p-16 text-center">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-3 text-muted-foreground">
              <FileText className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <h4 className="text-base sm:text-lg font-bold text-foreground">
              {searchQuery || statusFilter !== "all"
                ? "Tidak Ada Naskah yang Cocok"
                : "Belum Ada Naskah Diajukan"}
            </h4>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-sm mx-auto leading-relaxed">
              {searchQuery || statusFilter !== "all"
                ? "Coba ubah kata kunci pencarian atau reset filter untuk menampilkan kembali semua naskah."
                : "Anda belum pernah mengunggah naskah proposal skripsi. Klik tombol di bawah untuk mengajukan draf naskah perdana Anda."}
            </p>
            {searchQuery || statusFilter !== "all" ? (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                }}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-foreground bg-muted hover:bg-muted/80 transition-colors"
              >
                Reset Filter
              </button>
            ) : (
              <button
                onClick={openAddModal}
                className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-red-700 hover:bg-red-800 transition-colors shadow-xs"
              >
                <Plus className="w-4 h-4" />
                Ajukan Naskah Sekarang
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredProposals.map((item) => (
              <div
                key={item.id}
                className="p-3.5 sm:p-5 space-y-2.5 sm:space-y-3.5 hover:bg-muted/15 transition-colors"
              >
                {/* Header Card: Nomor Dokumen + Kategori + Status Badge */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {item.proposalNumber && (
                      <span className="text-[10px] sm:text-xs font-mono font-bold px-2 py-0.5 rounded bg-muted text-foreground border border-border">
                        {item.proposalNumber}
                      </span>
                    )}
                    <span className="text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300">
                      {getCategoryLabel(item.documentCategory)}
                    </span>
                    {/* Badge Bab / Bagian Naskah */}
                    {item.chapter && (
                      <span className="text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                        {getChapterBadge(item.chapter)}
                      </span>
                    )}
                  </div>
                  <div className="shrink-0 self-start sm:self-auto">
                    {getStatusBadge(item.status)}
                  </div>
                </div>

                {/* Judul Naskah & Keterangan Bab */}
                <div>
                  <h4 className="text-sm sm:text-base font-bold text-foreground leading-snug">
                    {item.title}
                  </h4>
                  {item.chapterTitle && (
                    <p className="text-xs font-semibold text-primary mt-1 flex items-center gap-1.5">
                      <BookOpen className="size-3.5 shrink-0" />
                      <span>{getChapterBadge(item.chapter)}: {item.chapterTitle}</span>
                    </p>
                  )}
                </div>

                {/* Structured Metadata Box (Mobile-friendly Grid) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-muted/25 border border-border/60 rounded-xl p-2.5 sm:p-3 text-xs">
                  <div className="space-y-0.5 min-w-0">
                    <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1 uppercase tracking-wider">
                      <User size={10} className="text-primary shrink-0" />
                      Pembimbing 1
                    </span>
                    <p className="font-bold text-foreground text-[11px] sm:text-xs truncate">
                      {item.advisorName1}
                    </p>
                  </div>

                  <div className="space-y-0.5 min-w-0">
                    <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1 uppercase tracking-wider">
                      <User size={10} className="text-muted-foreground shrink-0" />
                      Pembimbing 2
                    </span>
                    <p className="font-bold text-foreground text-[11px] sm:text-xs truncate">
                      {item.advisorName2 || "-"}
                    </p>
                  </div>

                  <div className="space-y-0.5 min-w-0">
                    <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1 uppercase tracking-wider">
                      <FileText size={10} className="text-muted-foreground shrink-0" />
                      Dokumen
                    </span>
                    <p className="font-bold text-foreground text-[11px] sm:text-xs truncate">
                      {item.pageCount} Hal ({(item.fileSize / (1024 * 1024)).toFixed(1)} MB)
                    </p>
                  </div>

                  <div className="space-y-0.5 min-w-0">
                    <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1 uppercase tracking-wider">
                      <Calendar size={10} className="text-muted-foreground shrink-0" />
                      Diajukan
                    </span>
                    <p className="font-bold text-foreground text-[11px] sm:text-xs truncate">
                      {new Date(item.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric"
                      })}
                    </p>
                  </div>
                </div>

                {/* Abstrak / Ringkasan (jika ada) */}
                {item.abstract && (
                  <div className="p-3 rounded-xl bg-muted/40 border border-border text-xs text-muted-foreground leading-relaxed">
                    <strong className="text-foreground block mb-0.5 text-[10px] sm:text-[11px] uppercase tracking-wider font-bold">
                      Abstrak / Ringkasan:
                    </strong>
                    <p className="line-clamp-2 sm:line-clamp-3 text-xs">{item.abstract}</p>
                  </div>
                )}

                {/* Catatan Review dari Pustakawan (jika ada) */}
                {item.reviewNotes && (
                  <div className="p-3 sm:p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60">
                    <div className="flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div className="space-y-1 min-w-0 flex-1">
                        <h5 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                          Catatan dari Tim Pustakawan:
                        </h5>
                        <p className="text-xs text-amber-800 dark:text-amber-300 whitespace-pre-line leading-relaxed">
                          {item.reviewNotes}
                        </p>
                        {item.status === "REVISION_REQUIRED" && (
                          <div className="pt-1.5">
                            <button
                              onClick={() => openEditModal(item)}
                              className="inline-flex items-center gap-1 text-xs font-bold text-amber-900 dark:text-amber-200 underline hover:no-underline"
                            >
                              Klik di sini untuk mengirim berkas revisi perbaikan &rarr;
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons: Rapi dan responsif di HP (span lebar) dan desktop */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50">
                  <button
                    type="button"
                    onClick={() => handlePreviewPdf(item)}
                    disabled={loadingPreviewId === item.id}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-muted hover:bg-muted/80 text-foreground border border-border transition-colors cursor-pointer disabled:opacity-50"
                    title="Lihat dokumen PDF naskah Anda"
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
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-muted hover:bg-muted/80 text-foreground border border-border transition-colors cursor-pointer disabled:opacity-50"
                    title="Unduh berkas naskah PDF"
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
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-2xs transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Unggah Revisi
                    </button>
                  )}

                  {item.status === "SUBMITTED" && (
                    <>
                      <button
                        onClick={() => openEditModal(item)}
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border transition-colors"
                        title="Edit informasi naskah"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(item.id, item.title)}
                        disabled={deletingId === item.id}
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-destructive hover:bg-destructive/10 border border-border transition-colors disabled:opacity-40"
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
            ))}
          </div>
        )}
      </div>

      {/* MODAL POPUP DIALOG - Menggunakan Shadcn UI Select untuk Dropdown */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          editingProposal
            ? editingProposal.status === "REVISION_REQUIRED"
              ? "Unggah Revisi Naskah Skripsi"
              : "Edit Informasi Naskah Skripsi"
            : "Ajukan Naskah Skripsi / Karya Ilmiah"
        }
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Banner catatan revisi di dalam modal jika sedang merevisi */}
          {editingProposal?.reviewNotes &&
            editingProposal.status === "REVISION_REQUIRED" && (
              <div className="p-3 sm:p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-xs">
                <strong className="text-amber-900 dark:text-amber-200 block font-bold mb-1">
                  Catatan Evaluasi Pustakawan:
                </strong>
                <p className="text-amber-800 dark:text-amber-300 leading-relaxed whitespace-pre-line text-[11px] sm:text-xs">
                  {editingProposal.reviewNotes}
                </p>
              </div>
            )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                Kategori Dokumen *
              </label>
              <Select
                value={formData.documentCategory}
                onValueChange={(val: "PROPOSAL" | "THESIS" | "REPORT") =>
                  setFormData({ ...formData, documentCategory: val })
                }
              >
                <SelectTrigger className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs sm:text-sm font-semibold">
                  <SelectValue placeholder="Pilih Kategori Dokumen" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border border-border bg-card shadow-lg z-[10005]">
                  <SelectItem
                    value="PROPOSAL"
                    className="text-xs sm:text-sm py-2 cursor-pointer"
                  >
                    Proposal Skripsi / Tugas Akhir
                  </SelectItem>
                  <SelectItem
                    value="THESIS"
                    className="text-xs sm:text-sm py-2 cursor-pointer"
                  >
                    Laporan Skripsi Penuh
                  </SelectItem>
                  <SelectItem
                    value="REPORT"
                    className="text-xs sm:text-sm py-2 cursor-pointer"
                  >
                    Laporan Praktik Kerja / Riset
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                Program Studi *
              </label>
              <Select
                value={String(formData.studyProgramId)}
                onValueChange={(val) => {
                  const newProgId = Number(val);
                  const newProg = studyPrograms.find((p) => p.id === newProgId);
                  const newConfig = getProgramChapterConfig(newProg, customChapterSettings);
                  const chapterExists = newConfig.chapters.some((c) => c.value === formData.chapter);

                  let nextChapter = formData.chapter;
                  let nextChapterTitle = formData.chapterTitle;

                  if (!chapterExists) {
                    const defaultOpt = newConfig.chapters.find((c) => c.value === "BAB_1") || newConfig.chapters[0];
                    nextChapter = defaultOpt.value;
                    nextChapterTitle = defaultOpt.defaultTitle;
                  } else {
                    const oldOpt = activeChapterConfig.chapters.find((c) => c.value === formData.chapter);
                    const newOpt = newConfig.chapters.find((c) => c.value === formData.chapter);
                    if (oldOpt && newOpt && formData.chapterTitle === oldOpt.defaultTitle) {
                      nextChapterTitle = newOpt.defaultTitle;
                    }
                  }

                  setFormData((prev) => ({
                    ...prev,
                    studyProgramId: newProgId,
                    chapter: nextChapter,
                    chapterTitle: nextChapterTitle,
                  }));
                }}
              >
                <SelectTrigger className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs sm:text-sm font-semibold">
                  <SelectValue placeholder="Pilih Program Studi" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border border-border bg-card shadow-lg z-[10005]">
                  {studyPrograms.length > 0 ? (
                    studyPrograms.map((prog) => (
                      <SelectItem
                        key={prog.id}
                        value={String(prog.id)}
                        className="text-xs sm:text-sm py-2 cursor-pointer"
                      >
                        {prog.name} ({prog.code})
                      </SelectItem>
                    ))
                  ) : (
                    <>
                      <SelectItem
                        value="1"
                        className="text-xs sm:text-sm py-2 cursor-pointer"
                      >
                        Teknik Informatika
                      </SelectItem>
                      <SelectItem
                        value="2"
                        className="text-xs sm:text-sm py-2 cursor-pointer"
                      >
                        Ilmu Komunikasi
                      </SelectItem>
                      <SelectItem
                        value="3"
                        className="text-xs sm:text-sm py-2 cursor-pointer"
                      >
                        Manajemen
                      </SelectItem>
                      <SelectItem
                        value="4"
                        className="text-xs sm:text-sm py-2 cursor-pointer"
                      >
                        Akuntansi
                      </SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Pilihan Bab yang Diunggah & Judul Bab Sesuai Program Studi */}
          <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/60">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-primary" />
                Pembagian Bab Naskah
              </span>
              <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-md bg-background text-foreground border border-border">
                {activeChapterConfig.badgeLabel}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 pt-0.5">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-primary" />
                  Upload Bab Berapa? *
                </label>
                <Select
                  value={formData.chapter}
                  onValueChange={(val) => {
                    const opt = currentChapterOptions.find((c) => c.value === val);
                    setFormData((prev) => ({
                      ...prev,
                      chapter: val,
                      chapterTitle: opt?.defaultTitle || prev.chapterTitle,
                    }));
                  }}
                >
                  <SelectTrigger className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs sm:text-sm font-semibold">
                    <SelectValue placeholder="Pilih Bab Naskah" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border border-border bg-card shadow-lg z-[10005]">
                    {currentChapterOptions.map((opt) => (
                      <SelectItem
                        key={opt.value}
                        value={opt.value}
                        className="text-xs sm:text-sm py-2 cursor-pointer font-medium"
                      >
                        <div className="flex flex-col text-left">
                          <span className="font-semibold text-foreground">{opt.label}</span>
                          {opt.description && (
                            <span className="text-[10px] text-muted-foreground line-clamp-1">
                              {opt.description}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-primary" />
                  Judul / Keterangan Bab *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Pendahuluan, Landasan Teori, Analisis Sistem..."
                  value={formData.chapterTitle}
                  onChange={(e) => setFormData({ ...formData, chapterTitle: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-border bg-background text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-medium"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground mb-1.5">
              Judul Karya Ilmiah / Skripsi *
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Rancang Bangun Sistem Informasi Perpustakaan..."
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-red-600 transition-all font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                Dosen Pembimbing 1 *
              </label>
              <input
                type="text"
                required
                placeholder="Nama Dosen Pembimbing Utama & Gelar"
                value={formData.advisorName1}
                onChange={(e) =>
                  setFormData({ ...formData, advisorName1: e.target.value })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-red-600 transition-all font-medium"
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
                onChange={(e) =>
                  setFormData({ ...formData, advisorName2: e.target.value })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-red-600 transition-all font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground mb-1.5">
              Abstrak / Ringkasan Penelitian
            </label>
            {(() => {
              const ABSTRACT_MAX_WORDS = 500;
              const abstractWordCount = formData.abstract?.trim()
                ? formData.abstract.trim().split(/\s+/).filter(Boolean).length
                : 0;
              const abstractOverLimit = abstractWordCount > ABSTRACT_MAX_WORDS;
              return (
                <>
                  <textarea
                    rows={3}
                    placeholder="Tuliskan latar belakang singkat, tujuan penelitian, dan metodologi..."
                    value={formData.abstract}
                    onChange={(e) =>
                      setFormData({ ...formData, abstract: e.target.value })
                    }
                    className={`w-full px-3.5 py-2.5 rounded-xl border bg-background text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 transition-all font-medium ${
                      abstractOverLimit
                        ? "border-red-500 focus:ring-red-500"
                        : "border-border focus:ring-red-600"
                    }`}
                  />
                  <div className="flex justify-between items-center mt-1">
                    {abstractOverLimit && (
                      <span className="text-xs text-red-500 font-medium">
                        Melebihi batas {ABSTRACT_MAX_WORDS} kata
                      </span>
                    )}
                    <span
                      className={`text-xs ml-auto ${
                        abstractOverLimit
                          ? "text-red-500 font-semibold"
                          : "text-muted-foreground"
                      }`}
                    >
                      {abstractWordCount} / {ABSTRACT_MAX_WORDS} kata
                    </span>
                  </div>
                </>
              );
            })()}
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground mb-1.5">
              Berkas PDF Naskah{" "}
              {editingProposal
                ? "(Pilih jika ingin mengganti file)"
                : "* (Maks. 25 MB)"}
            </label>
            <div className="border-2 border-dashed border-border hover:border-red-600 rounded-2xl p-4 sm:p-5 text-center transition-colors bg-muted/20">
              <input
                type="file"
                accept=".pdf,application/pdf"
                required={!editingProposal}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setSelectedFile(e.target.files[0]);
                  }
                }}
                className="w-full text-xs text-muted-foreground file:mr-3 sm:file:mr-4 file:py-2 sm:file:py-2.5 file:px-3 sm:file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-red-700 file:text-white hover:file:bg-red-800 cursor-pointer"
              />
              {selectedFile ? (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 font-bold flex items-center justify-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                  Berkas Terpilih: {selectedFile.name} (
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                </p>
              ) : editingProposal ? (
                <p className="text-xs text-muted-foreground mt-2">
                  Berkas sebelumnya: {editingProposal.pageCount} Halaman (
                  {(editingProposal.fileSize / (1024 * 1024)).toFixed(2)} MB)
                </p>
              ) : null}
            </div>
          </div>

          <div className="pt-3 border-t border-border flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              disabled={submitting}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border border-border hover:bg-muted text-foreground transition-colors text-center"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting || (formData.abstract?.trim()
                ? formData.abstract.trim().split(/\s+/).filter(Boolean).length > 500
                : false)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-red-700 hover:bg-red-800 transition-colors shadow-xs disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
              {editingProposal ? "Simpan Perubahan" : "Unggah Naskah Sekarang"}
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
        title={
          previewPdfItem
            ? `Pratinjau PDF: ${previewPdfItem.title}`
            : "Pratinjau Naskah PDF"
        }
        size={isPdfFullscreen ? "fullscreen" : "full"}
      >
        {previewPdfItem && (
          <div className="flex flex-col h-full min-h-0 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pb-2 border-b border-border shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 shrink-0">
                  Naskah Terverifikasi
                </span>
                <span className="text-xs font-semibold text-foreground line-clamp-1">
                  {previewPdfItem.title}
                </span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-wrap">
                <button
                  type="button"
                  onClick={() => setIsPdfFullscreen(!isPdfFullscreen)}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
                  title={isPdfFullscreen ? "Keluar Layar Penuh" : "Layar Penuh"}
                >
                  {isPdfFullscreen ? (
                    <Minimize2 className="w-3.5 h-3.5" />
                  ) : (
                    <Maximize2 className="w-3.5 h-3.5" />
                  )}
                  <span>{isPdfFullscreen ? "Kecilkan" : "Layar Penuh"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const matched = proposals.find(
                      (p) => p.id === previewPdfItem.id
                    );
                    if (matched) handleDownloadPdf(matched);
                  }}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Unduh
                </button>
                <a
                  href={previewPdfItem.blobUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-700 hover:bg-red-800 text-white text-xs font-bold transition-colors shrink-0"
                >
                  Tab Baru
                  <ArrowRight className="w-3 h-3" />
                </a>
              </div>
            </div>

            <div className="flex-1 w-full min-h-[60vh] sm:min-h-0 rounded-xl overflow-hidden border border-border bg-slate-900 shadow-inner">
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
