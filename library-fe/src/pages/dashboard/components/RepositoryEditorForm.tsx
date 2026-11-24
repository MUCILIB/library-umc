import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  ArrowLeft,
  Save,
  GraduationCap,
  FileText,
  Upload,
  Lock,
  Loader2,
  Trash2,
  CheckCircle2,
  Tag,
  BookOpen,
  User,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  studyProgramApi,
  type StudyProgram,
} from "@/api/client";
import {
  repositoryService,
  type RepositoryProposal,
  type CreateProposalPayload,
} from "@/services/repositoryService";
import {
  getProgramChapterConfig,
} from "@/utils/thesisChapters";
import { useToast } from "@/hooks/useToast";

export interface RepositoryEditorFormProps {
  isEdit?: boolean;
  editId?: string;
  onBack: () => void;
  onSuccess: () => void;
}

export function RepositoryEditorForm({
  isEdit = false,
  editId,
  onBack,
  onSuccess,
}: RepositoryEditorFormProps) {
  const { success, error } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loadingInitial, setLoadingInitial] = useState(isEdit);
  const [studyPrograms, setStudyPrograms] = useState<StudyProgram[]>([]);
  const [customChapterSettings, setCustomChapterSettings] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Form Fields (15 fields)
  const [title, setTitle] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [authorNim, setAuthorNim] = useState("");
  const [studyProgramId, setStudyProgramId] = useState<number>(1);
  const [documentCategory, setDocumentCategory] = useState<"THESIS" | "PROPOSAL" | "REPORT">("THESIS");
  const [chapter, setChapter] = useState("FULL_TEXT");
  const [chapterTitle, setChapterTitle] = useState("Naskah Lengkap Skripsi");
  const [advisorName1, setAdvisorName1] = useState("");
  const [advisorName2, setAdvisorName2] = useState("");
  const [abstractText, setAbstractText] = useState("");
  const [keywordsString, setKeywordsString] = useState("");
  const [status, setStatus] = useState<"APPROVED" | "SUBMITTED" | "ARCHIVED" | "UNDER_REVIEW">("APPROVED");
  const [allowedStartPage, setAllowedStartPage] = useState<number>(1);
  const [allowedEndPage, setAllowedEndPage] = useState<number>(10);

  // Existing Proposal Data if Edit mode
  const [existingProposal, setExistingProposal] = useState<RepositoryProposal | null>(null);

  // Dynamic Chapter Config based on Selected Study Program
  const activeProgram = useMemo(
    () => studyPrograms.find((p) => p.id === studyProgramId) || null,
    [studyPrograms, studyProgramId]
  );
  const activeChapterConfig = useMemo(
    () => getProgramChapterConfig(activeProgram, customChapterSettings),
    [activeProgram, customChapterSettings]
  );
  const currentChapterOptions = activeChapterConfig.chapters;

  // Live Word Count for Abstract
  const abstractWordCount = useMemo(() => {
    if (!abstractText.trim()) return 0;
    return abstractText.trim().split(/\s+/).length;
  }, [abstractText]);

  // Visual Keyword Tags
  const keywordTags = useMemo(() => {
    if (!keywordsString.trim()) return [];
    return keywordsString
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
  }, [keywordsString]);

  // Load Study Programs & Chapter Settings
  useEffect(() => {
    let isMounted = true;

    Promise.all([
      studyProgramApi.list(),
      repositoryService.getChapterSettings().catch(() => ({})),
    ])
      .then(([progRes, settingsRes]) => {
        if (!isMounted) return;
        if (settingsRes) {
          setCustomChapterSettings(settingsRes);
        }
        if (progRes.data && progRes.data.length > 0) {
          setStudyPrograms(progRes.data);
          if (!isEdit) {
            setStudyProgramId(progRes.data[0].id);
          }
        }
      })
      .catch((err) => {
        console.error("Gagal memuat data program studi dan konfigurasi bab:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [isEdit]);

  // Load Existing Proposal if Edit Mode
  useEffect(() => {
    if (!isEdit || !editId) return;

    let isMounted = true;
    setLoadingInitial(true);

    repositoryService
      .getProposalById(editId)
      .then((item) => {
        if (!isMounted) return;
        setExistingProposal(item);
        setTitle(item.title || "");
        setAuthorName(item.authorName || "");
        setAuthorNim(item.authorNim || "");
        setStudyProgramId(item.studyProgramId || 1);
        setDocumentCategory(item.documentCategory || "THESIS");
        setChapter(item.chapter || "FULL_TEXT");
        setChapterTitle(item.chapterTitle || "Naskah Lengkap Skripsi");
        setAdvisorName1(item.advisorName1 || "");
        setAdvisorName2(item.advisorName2 || "");
        setAbstractText(item.abstract || "");
        setKeywordsString(item.keywords ? item.keywords.join(", ") : "");
        setStatus((item.status as any) || "APPROVED");

        const publicRule = item.pageRules?.find((r) => r.roleScope === "PUBLIC");
        setAllowedStartPage(publicRule?.allowedStartPage || 1);
        setAllowedEndPage(publicRule?.allowedEndPage || Math.min(10, item.pageCount || 10));
        setIsDirty(false);
      })
      .catch((err: any) => {
        if (!isMounted) return;
        error(err?.message || "Gagal memuat detail naskah skripsi untuk diedit");
      })
      .finally(() => {
        if (isMounted) setLoadingInitial(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isEdit, editId, error]);

  const handleFieldChange = (setter: (val: any) => void, val: any) => {
    setter(val);
    setIsDirty(true);
  };

  const handleBack = () => {
    if (isDirty) {
      const confirmLeave = window.confirm(
        "Perubahan naskah belum disimpan. Yakin ingin kembali ke daftar repositori?"
      );
      if (!confirmLeave) return;
    }
    onBack();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      error("Format File Tidak Valid: Berkas naskah wajib berformat PDF (.pdf)");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      error("Ukuran Berkas Terlalu Besar: Maksimal kapasitas naskah PDF adalah 50 MB");
      return;
    }

    setSelectedFile(file);
    setIsDirty(true);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setIsDirty(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      error("Judul karya ilmiah / skripsi wajib diisi");
      return;
    }

    if (!authorName.trim()) {
      error("Nama mahasiswa / penulis naskah wajib diisi");
      return;
    }

    if (!authorNim.trim()) {
      error("NIM penulis naskah wajib diisi");
      return;
    }

    if (!advisorName1.trim()) {
      error("Nama dosen pembimbing utama wajib diisi");
      return;
    }

    if (!isEdit && !selectedFile) {
      error("Berkas PDF naskah skripsi wajib dipilih untuk diunggah");
      return;
    }

    if (allowedStartPage > allowedEndPage) {
      error("Rentang Halaman Salah: Halaman mulai tidak boleh lebih besar dari halaman selesai");
      return;
    }

    try {
      setSubmitting(true);

      const keywords = keywordsString
        ? keywordsString
            .split(",")
            .map((k) => k.trim())
            .filter(Boolean)
        : [];

      const payload: CreateProposalPayload = {
        title: title.trim(),
        authorName: authorName.trim(),
        authorNim: authorNim.trim().toUpperCase(),
        studyProgramId: Number(studyProgramId),
        documentCategory,
        chapter,
        chapterTitle: chapterTitle.trim() || undefined,
        advisorName1: advisorName1.trim(),
        advisorName2: advisorName2.trim() || undefined,
        abstract: abstractText.trim() || undefined,
        keywords,
        status,
        allowedStartPage: Number(allowedStartPage) || 1,
        allowedEndPage: Number(allowedEndPage) || 10,
      };

      if (isEdit && editId) {
        await repositoryService.updateProposal(editId, payload, selectedFile || undefined);
        await repositoryService
          .configurePageRule(editId, {
            roleScope: "PUBLIC",
            allowedStartPage: payload.allowedStartPage || 1,
            allowedEndPage: payload.allowedEndPage || 10,
            allowDownloadFull: false,
          })
          .catch(() => {});
        success("Naskah Berhasil Diperbarui: Data karya ilmiah telah disimpan di repositori");
      } else {
        await repositoryService.submitProposal(payload, selectedFile!);
        success("Naskah Berhasil Diunggah: Skripsi telah dipublikasikan di repositori perpustakaan");
      }

      setIsDirty(false);
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menyimpan naskah skripsi";
      error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes || bytes <= 0) return "-";
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  if (loadingInitial) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto pb-12">
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-4">
            <Skeleton className="h-48 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
          <div className="lg:col-span-4 space-y-4">
            <Skeleton className="h-48 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleBack}
            className="gap-2 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Repositori
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary" />
                {isEdit ? "Edit Naskah Skripsi / Karya Ilmiah" : "Unggah Naskah Repositori Baru"}
              </h2>
              <Badge
                variant={isEdit ? "secondary" : "default"}
                className={
                  isEdit
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300"
                    : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300"
                }
              >
                {isEdit ? "Mode Edit" : "Entri Naskah Baru"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Halaman penuh untuk input 15 field naskah repositori, pembagian bab per prodi, live counter abstrak, dan berkas PDF 50 MB.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={handleBack}
            disabled={submitting}
            className="cursor-pointer"
          >
            Batal
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-sm"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {isEdit ? "Perbarui Naskah" : "Unggah & Terbitkan"}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main Form 2-Column Layout */}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Kolom Kiri: Metadata Utama Naskah (8 spans) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Card 1: Identitas Mahasiswa & Program Studi */}
            <div className="p-6 rounded-2xl border border-border bg-card shadow-xs space-y-5">
              <div className="border-b border-border pb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  Identitas Penulis & Program Studi
                </h3>
                <span className="text-xs text-muted-foreground">
                  <span className="text-destructive">*</span> Wajib diisi
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Nama Mahasiswa / Penulis <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={authorName}
                    onChange={(e) => handleFieldChange(setAuthorName, e.target.value)}
                    placeholder="Nama lengkap beserta gelar (jika ada)"
                    className="w-full px-3.5 py-2.5 text-sm bg-background border border-input rounded-xl focus:ring-2 focus:ring-primary focus:outline-none min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    NIM / NIDN <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={authorNim}
                    onChange={(e) => handleFieldChange(setAuthorNim, e.target.value)}
                    placeholder="Contoh: 2021081001"
                    className="w-full px-3.5 py-2.5 text-sm bg-background border border-input rounded-xl focus:ring-2 focus:ring-primary focus:outline-none min-h-[44px] uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Program Studi <span className="text-destructive">*</span>
                  </label>
                  <Select
                    value={String(studyProgramId)}
                    onValueChange={(val) => handleFieldChange(setStudyProgramId, Number(val))}
                  >
                    <SelectTrigger className="w-full h-[44px] bg-background border-input rounded-xl text-sm cursor-pointer shadow-2xs">
                      <SelectValue placeholder="Pilih Program Studi" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {studyPrograms.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)} className="cursor-pointer">
                          {p.name}{p.code ? ` (${p.code})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Kategori Dokumen <span className="text-destructive">*</span>
                  </label>
                  <Select
                    value={documentCategory}
                    onValueChange={(val: any) => handleFieldChange(setDocumentCategory, val)}
                  >
                    <SelectTrigger className="w-full h-[44px] bg-background border-input rounded-xl text-sm cursor-pointer shadow-2xs">
                      <SelectValue placeholder="Pilih Kategori Dokumen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="THESIS" className="cursor-pointer">
                        Skripsi / Tugas Akhir (Thesis)
                      </SelectItem>
                      <SelectItem value="PROPOSAL" className="cursor-pointer">
                        Proposal Skripsi
                      </SelectItem>
                      <SelectItem value="REPORT" className="cursor-pointer">
                        Laporan Magang / PKL (Report)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Card 2: Struktur Bab & Judul Skripsi */}
            <div className="p-6 rounded-2xl border border-border bg-card shadow-xs space-y-5">
              <div className="border-b border-border pb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  Struktur Bab & Judul Naskah
                </h3>
                <span className="text-[11px] text-muted-foreground font-mono">
                  Format: {activeProgram?.name || activeChapterConfig.categoryLabel}
                </span>
              </div>

              {/* Bab Pilihan Dinamis */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Bagian / Bab Dokumen
                  </label>
                  <Select
                    value={chapter}
                    onValueChange={(val) => {
                      handleFieldChange(setChapter, val);
                      const matched = currentChapterOptions.find((c) => c.value === val);
                      if (matched) {
                        setChapterTitle(matched.label);
                      }
                    }}
                  >
                    <SelectTrigger className="w-full h-[44px] bg-background border-input rounded-xl text-sm cursor-pointer shadow-2xs">
                      <SelectValue placeholder="Pilih Bab Naskah" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {currentChapterOptions.map((c) => (
                        <SelectItem key={c.value} value={c.value} className="cursor-pointer">
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Label Judul Bab
                  </label>
                  <input
                    type="text"
                    value={chapterTitle}
                    onChange={(e) => handleFieldChange(setChapterTitle, e.target.value)}
                    placeholder="Contoh: Bab 1 - Pendahuluan"
                    className="w-full px-3.5 py-2.5 text-sm bg-background border border-input rounded-xl focus:ring-2 focus:ring-primary focus:outline-none min-h-[44px]"
                  />
                </div>
              </div>

              {/* Judul Lengkap Skripsi */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Judul Lengkap Karya Ilmiah / Skripsi <span className="text-destructive">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={title}
                  onChange={(e) => handleFieldChange(setTitle, e.target.value)}
                  placeholder="Contoh: Rancang Bangun Sistem Informasi Manajemen Perpustakaan Berbasis Web Menggunakan Node.js dan React"
                  className="w-full px-3.5 py-2.5 text-sm bg-background border border-input rounded-xl focus:ring-2 focus:ring-primary focus:outline-none leading-relaxed shadow-2xs font-medium"
                />
              </div>
            </div>

            {/* Card 3: Dosen Pembimbing */}
            <div className="p-6 rounded-2xl border border-border bg-card shadow-xs space-y-4">
              <div className="border-b border-border pb-3">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Dosen Pembimbing Skripsi
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Cantumkan nama dosen pembimbing utama dan pendamping beserta gelar akademis.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Dosen Pembimbing Utama (Pembimbing 1) <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={advisorName1}
                    onChange={(e) => handleFieldChange(setAdvisorName1, e.target.value)}
                    placeholder="Contoh: Dr. Ir. H. Ahmad Dahlan, M.T."
                    className="w-full px-3.5 py-2.5 text-sm bg-background border border-input rounded-xl focus:ring-2 focus:ring-primary focus:outline-none min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Dosen Pembimbing Pendamping (Pembimbing 2)
                  </label>
                  <input
                    type="text"
                    value={advisorName2}
                    onChange={(e) => handleFieldChange(setAdvisorName2, e.target.value)}
                    placeholder="Contoh: Siti Walidah, S.Kom., M.Cs."
                    className="w-full px-3.5 py-2.5 text-sm bg-background border border-input rounded-xl focus:ring-2 focus:ring-primary focus:outline-none min-h-[44px]"
                  />
                </div>
              </div>
            </div>

            {/* Card 4: Abstrak & Kata Kunci */}
            <div className="p-6 rounded-2xl border border-border bg-card shadow-xs space-y-4">
              <div className="border-b border-border pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Abstrak Naskah & Kata Kunci
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Abstrak naskah skripsi dengan penghitung kata otomatis.
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={
                    abstractWordCount > 500
                      ? "border-destructive text-destructive font-semibold"
                      : abstractWordCount > 450
                      ? "border-amber-400 text-amber-700 bg-amber-50"
                      : "border-border text-muted-foreground"
                  }
                >
                  {abstractWordCount} / 500 Kata
                </Badge>
              </div>

              <div>
                <textarea
                  rows={6}
                  value={abstractText}
                  onChange={(e) => handleFieldChange(setAbstractText, e.target.value)}
                  placeholder="Tuliskan atau tempelkan teks abstrak lengkap di sini (latar belakang, metodologi, hasil penelitian, dan kesimpulan)..."
                  className="w-full px-3.5 py-2.5 text-sm bg-background border border-input rounded-xl focus:ring-2 focus:ring-primary focus:outline-none leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Kata Kunci (Keywords)
                </label>
                <input
                  type="text"
                  value={keywordsString}
                  onChange={(e) => handleFieldChange(setKeywordsString, e.target.value)}
                  placeholder="Pisahkan dengan koma, contoh: Sistem Informasi, React, S3 Dahono, Perpustakaan"
                  className="w-full px-3.5 py-2.5 text-sm bg-background border border-input rounded-xl focus:ring-2 focus:ring-primary focus:outline-none min-h-[44px]"
                />

                {keywordTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {keywordTags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground border border-border"
                      >
                        <Tag className="h-3 w-3 text-muted-foreground" />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Kolom Kanan: Berkas PDF S3 & Kebijakan Hak Akses (4 spans) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Card 5: Upload Berkas Dokumen PDF Naskah */}
            <div className="p-6 rounded-2xl border border-border bg-card shadow-xs space-y-4">
              <div className="border-b border-border pb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Upload className="h-4 w-4 text-primary" />
                  Berkas PDF Naskah
                </h3>
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-primary/10 text-primary font-medium">
                  Maks. 50 MB
                </span>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                accept="application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />

              {/* Status Berkas yang Sudah Ada (Mode Edit) */}
              {isEdit && !!existingProposal && existingProposal.fileSize > 0 && !selectedFile && (
                <div className="p-3.5 rounded-xl border border-border bg-muted/30 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Berkas Naskah PDF Tersimpan di S3
                  </div>
                  <div className="text-[11px] text-muted-foreground space-y-0.5">
                    <p>Ukuran Berkas: {formatFileSize(existingProposal.fileSize)}</p>
                    <p>Total Halaman: {existingProposal.pageCount || "-"} Halaman</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground italic">
                    Biarkan kosong jika tidak mengganti berkas PDF skripsi.
                  </p>
                </div>
              )}

              {/* Upload Dropzone */}
              {selectedFile ? (
                <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {selectedFile.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatFileSize(selectedFile.size)} • Siap diunggah
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveFile}
                      className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 cursor-pointer shrink-0"
                      title="Hapus berkas"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full text-xs h-8 cursor-pointer"
                  >
                    Ganti Berkas PDF
                  </Button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="cursor-pointer p-6 border-2 border-dashed border-border hover:border-primary/50 bg-background hover:bg-muted/40 rounded-xl flex flex-col items-center justify-center text-center gap-2 transition-all group"
                >
                  <div className="p-3 rounded-full bg-primary/10 text-primary group-hover:scale-105 transition-transform">
                    <Upload className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">
                      Pilih atau Seret Dokumen PDF
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      PDF Skripsi hingga 50 MB
                    </p>
                  </div>
                  <span className="text-[10px] px-2.5 py-1 rounded-full bg-muted text-muted-foreground font-mono">
                    Cloud Storage S3 Dahono
                  </span>
                </div>
              )}
            </div>

            {/* Card 6: Status & Batasan Akses Tamu Publik */}
            <div className="p-6 rounded-2xl border border-border bg-card shadow-xs space-y-4">
              <div className="border-b border-border pb-3">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Lock className="h-4 w-4 text-primary" />
                  Status & Batasan Akses Tamu Publik
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Konfigurasi publikasi repositori dan rentang halaman pratinjau tamu non-login.
                </p>
              </div>

              {/* Status Publikasi */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Status Publikasi Naskah
                </label>
                <Select
                  value={status}
                  onValueChange={(val: any) => handleFieldChange(setStatus, val)}
                >
                  <SelectTrigger className="w-full h-[44px] bg-background border-input rounded-xl text-sm cursor-pointer shadow-2xs">
                    <SelectValue placeholder="Pilih Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="APPROVED" className="cursor-pointer">
                      APPROVED (Disetujui & Terbit Publik)
                    </SelectItem>
                    <SelectItem value="SUBMITTED" className="cursor-pointer">
                      SUBMITTED (Diajukan Mahasiswa)
                    </SelectItem>
                    <SelectItem value="UNDER_REVIEW" className="cursor-pointer">
                      UNDER_REVIEW (Sedang Diperiksa)
                    </SelectItem>
                    <SelectItem value="ARCHIVED" className="cursor-pointer">
                      ARCHIVED (Diarsipkan / Non-Aktif)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Rentang Halaman Akses Tamu */}
              <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Lock className="h-3.5 w-3.5 text-primary" />
                  Halaman Pratinjau Tamu Publik (Slicing)
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                      Halaman Mulai
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={allowedStartPage}
                      onChange={(e) =>
                        handleFieldChange(setAllowedStartPage, Math.max(1, Number(e.target.value)))
                      }
                      className="w-full px-3 py-1.5 text-xs bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary min-h-[38px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                      Halaman Selesai
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={allowedEndPage}
                      onChange={(e) =>
                        handleFieldChange(setAllowedEndPage, Math.max(1, Number(e.target.value)))
                      }
                      className="w-full px-3 py-1.5 text-xs bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary min-h-[38px]"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  * Tamu non-login hanya dapat membaca halaman {allowedStartPage} sampai {allowedEndPage}. Mahasiswa dan Dosen UMC yang login tetap dapat mengakses naskah secara penuh sesuai hak akses.
                </p>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

export default RepositoryEditorForm;
