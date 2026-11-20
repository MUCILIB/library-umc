import React, { useState, useEffect, useRef } from "react";
import {
  UploadCloud,
  FileText,
  GraduationCap,
  User,
  BookOpen,
  Sliders,
  Loader2,
  X
} from "lucide-react";
import Modal from "@/components/ui/modal";
import { useToast } from "@/hooks/useToast";
import {
  studyProgramApi,
  type StudyProgram
} from "@/api/client";
import {
  repositoryService,
  type RepositoryProposal,
  type CreateProposalPayload
} from "@/services/repositoryService";

interface AdminUploadProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editItem?: RepositoryProposal | null;
}

import {
  CHAPTER_OPTIONS,
  getProgramChapterConfig,
} from "@/utils/thesisChapters";

export { CHAPTER_OPTIONS };

export default function AdminUploadProposalModal({
  isOpen,
  onClose,
  onSuccess,
  editItem = null,
}: AdminUploadProposalModalProps) {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [studyPrograms, setStudyPrograms] = useState<StudyProgram[]>([]);
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [customChapterSettings, setCustomChapterSettings] = useState<Record<string, any>>({});

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    authorName: "",
    authorNim: "",
    studyProgramId: 1,
    documentCategory: "THESIS" as "THESIS" | "PROPOSAL" | "REPORT",
    chapter: "FULL_TEXT",
    chapterTitle: "Naskah Lengkap Skripsi",
    advisorName1: "",
    advisorName2: "",
    abstract: "",
    keywordsString: "",
    status: "APPROVED" as "APPROVED" | "SUBMITTED" | "ARCHIVED" | "UNDER_REVIEW",
    allowedStartPage: 1,
    allowedEndPage: 10,
  });

  // Konfigurasi Bab Berdasarkan Program Studi yang Dipilih
  const activeProgram = studyPrograms.find((p) => p.id === formData.studyProgramId) || null;
  const activeChapterConfig = getProgramChapterConfig(activeProgram, customChapterSettings);
  const currentChapterOptions = activeChapterConfig.chapters;

  // Load Program Studi & Konfigurasi Bab
  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    setLoadingPrograms(true);

    Promise.all([
      studyProgramApi.list(),
      repositoryService.getChapterSettings().catch(() => ({})),
    ])
      .then(([progRes, settingsRes]) => {
        if (!active) return;
        if (settingsRes) {
          setCustomChapterSettings(settingsRes);
        }
        if (progRes.data && progRes.data.length > 0) {
          setStudyPrograms(progRes.data);
          if (!editItem) {
            setFormData((prev) => ({
              ...prev,
              studyProgramId: prev.studyProgramId || progRes.data[0].id,
            }));
          }
        }
      })
      .catch((err) => {
        console.error("Gagal memuat data program studi dan bab:", err);
      })
      .finally(() => {
        if (active) setLoadingPrograms(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, editItem]);

  // Sync Form Data when editItem changes or modal opens
  useEffect(() => {
    if (!isOpen) return;

    if (editItem) {
      const publicRule = editItem.pageRules?.find((r) => r.roleScope === "PUBLIC");
      setFormData({
        title: editItem.title || "",
        authorName: editItem.authorName || "",
        authorNim: editItem.authorNim || "",
        studyProgramId: editItem.studyProgramId || 1,
        documentCategory: editItem.documentCategory || "THESIS",
        chapter: editItem.chapter || "FULL_TEXT",
        chapterTitle: editItem.chapterTitle || "Naskah Lengkap Skripsi",
        advisorName1: editItem.advisorName1 || "",
        advisorName2: editItem.advisorName2 || "",
        abstract: editItem.abstract || "",
        keywordsString: editItem.keywords ? editItem.keywords.join(", ") : "",
        status: (editItem.status as any) || "APPROVED",
        allowedStartPage: publicRule?.allowedStartPage || 1,
        allowedEndPage: publicRule?.allowedEndPage || Math.min(10, editItem.pageCount || 10),
      });
      setSelectedFile(null);
    } else {
      setFormData({
        title: "",
        authorName: "",
        authorNim: "",
        studyProgramId: studyPrograms.length > 0 ? studyPrograms[0].id : 1,
        documentCategory: "THESIS",
        chapter: "FULL_TEXT",
        chapterTitle: "Naskah Lengkap Skripsi",
        advisorName1: "",
        advisorName2: "",
        abstract: "",
        keywordsString: "",
        status: "APPROVED",
        allowedStartPage: 1,
        allowedEndPage: 10,
      });
      setSelectedFile(null);
    }
  }, [isOpen, editItem, studyPrograms]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Format File Salah", "Berkas naskah wajib berformat PDF (.pdf).");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error("Ukuran Berkas Terlalu Besar", "Ukuran maksimal dokumen adalah 50 MB.");
      return;
    }

    setSelectedFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error("Validasi Gagal", "Judul karya ilmiah / skripsi wajib diisi.");
      return;
    }

    if (!formData.authorName.trim()) {
      toast.error("Validasi Gagal", "Nama mahasiswa / penulis naskah wajib diisi.");
      return;
    }

    if (!formData.authorNim.trim()) {
      toast.error("Validasi Gagal", "NIM / NIDN penulis naskah wajib diisi.");
      return;
    }

    if (!formData.advisorName1.trim()) {
      toast.error("Validasi Gagal", "Nama dosen pembimbing utama wajib diisi.");
      return;
    }

    if (!editItem && !selectedFile) {
      toast.error("Berkas Diperlukan", "Silakan pilih berkas PDF naskah untuk diunggah.");
      return;
    }

    try {
      setSubmitting(true);

      const keywords = formData.keywordsString
        ? formData.keywordsString.split(",").map((k) => k.trim()).filter(Boolean)
        : [];

      const payload: CreateProposalPayload = {
        title: formData.title.trim(),
        authorName: formData.authorName.trim(),
        authorNim: formData.authorNim.trim().toUpperCase(),
        studyProgramId: Number(formData.studyProgramId),
        documentCategory: formData.documentCategory,
        chapter: formData.chapter,
        chapterTitle: formData.chapterTitle.trim() || undefined,
        advisorName1: formData.advisorName1.trim(),
        advisorName2: formData.advisorName2.trim() || undefined,
        abstract: formData.abstract.trim() || undefined,
        keywords,
        status: formData.status,
        allowedStartPage: Number(formData.allowedStartPage) || 1,
        allowedEndPage: Number(formData.allowedEndPage) || 10,
      };

      if (editItem) {
        await repositoryService.updateProposal(editItem.id, payload, selectedFile || undefined);
        toast.success(
          "Data Berhasil Diperbarui",
          `Naskah "${payload.title}" berhasil diperbarui di repositori perpustakaan.`
        );
      } else {
        await repositoryService.submitProposal(payload, selectedFile!);
        toast.success(
          "Naskah Berhasil Diunggah",
          `Skripsi/Karya Ilmiah "${payload.title}" telah tersimpan dan terpublikasi di repositori perpustakaan.`
        );
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menyimpan naskah skripsi";
      toast.error("Gagal Menyimpan", msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editItem ? "Edit Data Naskah Repositori" : "Unggah Naskah Skripsi / Karya Ilmiah"}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Banner Info Admin */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs text-foreground flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
            <GraduationCap className="size-5" />
          </div>
          <div className="space-y-0.5">
            <p className="font-semibold text-foreground text-sm">
              Input Langsung Naskah Ilmiah (Admin &amp; Pustakawan)
            </p>
            <p className="text-muted-foreground leading-relaxed text-xs">
              Form ini digunakan untuk memasukkan naskah skripsi mahasiswa terdahulu (arsip/alumni) atau karya ilmiah civitas akademika langsung ke repositori digital. Naskah otomatis berstatus <strong>Disetujui (Approved)</strong> dan siap diakses publik.
            </p>
          </div>
        </div>

        {/* 1. IDENTITAS PENULIS & PROGRAM STUDI */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
            <User className="size-3.5 text-primary" />
            Identitas Penulis &amp; Program Studi
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-foreground">
                Nama Mahasiswa / Penulis *
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Muhammad Rizky Pratama"
                value={formData.authorName}
                onChange={(e) => setFormData({ ...formData, authorName: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-foreground">
                NIM / Nomor Pokok Mahasiswa *
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: 20190810023"
                value={formData.authorNim}
                onChange={(e) => setFormData({ ...formData, authorNim: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary uppercase"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-foreground">
                Program Studi *
              </label>
              <select
                required
                value={formData.studyProgramId}
                onChange={(e) => {
                  const newProgId = Number(e.target.value);
                  const newProg = studyPrograms.find((p) => p.id === newProgId);
                  const newConfig = getProgramChapterConfig(newProg, customChapterSettings);
                  const chapterExists = newConfig.chapters.some((c) => c.value === formData.chapter);

                  let nextChapter = formData.chapter;
                  let nextChapterTitle = formData.chapterTitle;

                  if (!chapterExists) {
                    const defaultOpt = newConfig.chapters.find((c) => c.value === "FULL_TEXT") || newConfig.chapters[0];
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
                disabled={loadingPrograms}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {loadingPrograms ? (
                  <option value="">Memuat program studi...</option>
                ) : (
                  studyPrograms.map((prog) => (
                    <option key={prog.id} value={prog.id}>
                      {prog.name} {prog.faculty?.name ? `(${prog.faculty.name})` : ""}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-foreground">
                Kategori Dokumen *
              </label>
              <select
                value={formData.documentCategory}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    documentCategory: e.target.value as "THESIS" | "PROPOSAL" | "REPORT",
                  })
                }
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="THESIS">Skripsi / Tesis / Tugas Akhir</option>
                <option value="PROPOSAL">Proposal Penelitian Skripsi</option>
                <option value="REPORT">Laporan Praktik Kerja Lapangan (PKL)</option>
              </select>
            </div>
          </div>

          {/* Pilihan Bab Naskah & Judul Bab Sesuai Program Studi */}
          <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/60">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <BookOpen className="size-3.5 text-primary" />
                Pembagian Bab Naskah
              </span>
              <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-md bg-background text-foreground border border-border">
                {activeChapterConfig.badgeLabel}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-0.5">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <BookOpen className="size-3.5 text-primary" />
                  Upload Bab Berapa? *
                </label>
                <select
                  value={formData.chapter}
                  onChange={(e) => {
                    const val = e.target.value;
                    const opt = currentChapterOptions.find((c) => c.value === val);
                    setFormData((prev) => ({
                      ...prev,
                      chapter: val,
                      chapterTitle: opt?.defaultTitle || prev.chapterTitle,
                    }));
                  }}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {currentChapterOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <FileText className="size-3.5 text-primary" />
                  Judul / Keterangan Bab *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Pendahuluan, Landasan Teori, Analisis Sistem..."
                  value={formData.chapterTitle}
                  onChange={(e) => setFormData({ ...formData, chapterTitle: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 2. INFORMASI KARYA ILMIAH */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
            <BookOpen className="size-3.5 text-primary" />
            Informasi Karya Ilmiah
          </h4>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-foreground">
                Judul Lengkap Skripsi / Karya Ilmiah *
              </label>
              <textarea
                required
                rows={2}
                placeholder="Masukkan judul naskah secara lengkap..."
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-y"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-foreground">
                  Dosen Pembimbing 1 (Utama) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nama Pembimbing Utama & Gelar"
                  value={formData.advisorName1}
                  onChange={(e) => setFormData({ ...formData, advisorName1: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-foreground">
                  Dosen Pembimbing 2 (Pendamping)
                </label>
                <input
                  type="text"
                  placeholder="Nama Pembimbing Pendamping (Opsional)"
                  value={formData.advisorName2}
                  onChange={(e) => setFormData({ ...formData, advisorName2: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-foreground">
                Abstrak Naskah
              </label>
              <textarea
                rows={3}
                placeholder="Latar belakang singkat, tujuan penelitian, metodologi, dan kesimpulan..."
                value={formData.abstract}
                onChange={(e) => setFormData({ ...formData, abstract: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs leading-relaxed text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-y"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-foreground">
                Kata Kunci (Keywords)
              </label>
              <input
                type="text"
                placeholder="Pisahkan dengan tanda koma, contoh: Sistem Informasi, Algoritma C4.5, UMC"
                value={formData.keywordsString}
                onChange={(e) => setFormData({ ...formData, keywordsString: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* 3. STATUS & ATURAN AKSES PUBLIK */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
            <Sliders className="size-3.5 text-primary" />
            Status Repositori &amp; Pembatasan Halaman Publik
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-foreground">
                Status Naskah
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    status: e.target.value as "APPROVED" | "SUBMITTED" | "ARCHIVED",
                  })
                }
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="APPROVED">Disetujui / Publikasi Repositori (APPROVED)</option>
                <option value="SUBMITTED">Pengajuan Baru (SUBMITTED)</option>
                <option value="ARCHIVED">Arsip Khusus (ARCHIVED)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-foreground">
                Batas Halaman Akses Tamu Publik (Halaman 1 s/d X)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={formData.allowedStartPage}
                  onChange={(e) =>
                    setFormData({ ...formData, allowedStartPage: Math.max(1, parseInt(e.target.value, 10) || 1) })
                  }
                  className="w-20 rounded-lg border border-border bg-background px-2.5 py-2 text-xs font-mono text-center text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <span className="text-xs text-muted-foreground font-medium">s/d Halaman</span>
                <input
                  type="number"
                  min={1}
                  value={formData.allowedEndPage}
                  onChange={(e) =>
                    setFormData({ ...formData, allowedEndPage: Math.max(1, parseInt(e.target.value, 10) || 10) })
                  }
                  className="w-20 rounded-lg border border-border bg-background px-2.5 py-2 text-xs font-mono text-center text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Tamu umum hanya dapat membaca pratinjau halaman ini; sivitas akademika UMC dapat membaca naskah penuh.
              </p>
            </div>
          </div>
        </div>

        {/* 4. BERKAS PDF */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
            <FileText className="size-3.5 text-primary" />
            Berkas Naskah PDF (Maks. 50 MB)
          </h4>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />

          {selectedFile ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <FileText className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-xs text-foreground truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground font-mono">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Berkas Siap Diunggah
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="shrink-0 p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Ganti Berkas"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : editItem ? (
            <div className="rounded-xl border border-border bg-muted/40 p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <FileText className="size-5 text-muted-foreground" />
                <div>
                  <p className="text-xs font-medium text-foreground">
                    Dokumen PDF sebelumnya sudah tersimpan ({editItem.pageCount} halaman, {(editItem.fileSize / (1024 * 1024)).toFixed(2)} MB)
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Klik tombol di samping jika ingin mengganti dengan berkas PDF baru.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="shrink-0 px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-xs font-semibold text-foreground transition-colors cursor-pointer"
              >
                Ganti Berkas PDF
              </button>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl border-2 border-dashed border-border hover:border-primary/50 bg-muted/20 hover:bg-muted/40 p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors text-center"
            >
              <div className="p-3 rounded-full bg-primary/10 text-primary">
                <UploadCloud className="size-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Pilih atau seret berkas PDF ke sini
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Wajib format .PDF asli (dokumen skripsi lengkap beserta lembar pengesahan). Maksimal 50 MB.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border border-border bg-background px-4 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors cursor-pointer disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Menyimpan ke Repositori...</span>
              </>
            ) : (
              <>
                <UploadCloud className="size-4" />
                <span>{editItem ? "Simpan Perubahan" : "Unggah Naskah Sekarang"}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
