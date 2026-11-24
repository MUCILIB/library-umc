import React, { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Save,
  BookOpen,
  FileText,
  Upload,
  Lock,
  Loader2,
  Trash2,
  ImageIcon,
  CheckCircle2,
  Download,
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
import { ebookService, type EbookItem } from "@/services/ebookService";
import { dashboardDataService, type CategoryItem } from "@/services/dashboard/dashboardDataService";
import { useToast } from "@/hooks/useToast";

export interface EbookEditorFormProps {
  isEdit?: boolean;
  editId?: string;
  onBack: () => void;
  onSuccess: () => void;
}

export function EbookEditorForm({
  isEdit = false,
  editId,
  onBack,
  onSuccess,
}: EbookEditorFormProps) {
  const { success, error } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loadingInitial, setLoadingInitial] = useState(isEdit);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Form Fields
  const [formTitle, setFormTitle] = useState("");
  const [formAuthor, setFormAuthor] = useState("");
  const [formPublisher, setFormPublisher] = useState("");
  const [formYear, setFormYear] = useState("");
  const [formIsbn, setFormIsbn] = useState("");
  const [formCategoryId, setFormCategoryId] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formImage, setFormImage] = useState("");
  const [formPdfFile, setFormPdfFile] = useState<File | null>(null);
  const [formIsFullAccess, setFormIsFullAccess] = useState(true);
  const [formStartPage, setFormStartPage] = useState<number>(1);
  const [formEndPage, setFormEndPage] = useState<number>(10);
  const [formAllowDownload, setFormAllowDownload] = useState(false);

  // Existing Ebook Data if in Edit mode
  const [existingEbook, setExistingEbook] = useState<EbookItem | null>(null);

  // Load Categories
  useEffect(() => {
    dashboardDataService
      .getCategories()
      .then(setCategories)
      .catch((err) => console.error("Gagal memuat kategori:", err));
  }, []);

  // Load Existing Data if Edit
  useEffect(() => {
    if (!isEdit || !editId) return;

    let isMounted = true;
    setLoadingInitial(true);

    ebookService
      .getEbookById(editId)
      .then((item) => {
        if (!isMounted) return;
        setExistingEbook(item);
        setFormTitle(item.title || "");
        setFormAuthor(item.authors?.[0]?.name || "");
        setFormPublisher(item.publisher?.name || "");
        setFormYear(item.publishYear ? String(item.publishYear) : "");
        setFormIsbn(item.isbn || "");
        setFormCategoryId(item.category?.id ? String(item.category.id) : "");
        setFormDescription(item.description || "");
        setFormImage(item.image || "");
        setFormIsFullAccess(item.content?.isFullAccess ?? true);
        setFormStartPage(item.content?.previewStartPage ?? 1);
        setFormEndPage(item.content?.previewEndPage ?? 10);
        setFormAllowDownload(item.content?.allowDownload ?? false);
        setIsDirty(false);
      })
      .catch((err: any) => {
        if (!isMounted) return;
        error(err?.message || "Gagal memuat data e-book untuk diedit");
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
        "Perubahan belum disimpan. Yakin ingin kembali ke daftar e-book?"
      );
      if (!confirmLeave) return;
    }
    onBack();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      error("Format File Tidak Valid: Berkas e-book wajib berupa PDF (.pdf)");
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      error("Ukuran Berkas Terlalu Besar: Maksimal ukuran PDF adalah 100 MB");
      return;
    }

    setFormPdfFile(file);
    setIsDirty(true);
  };

  const handleRemoveFile = () => {
    setFormPdfFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setIsDirty(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formTitle.trim()) {
      error("Judul e-book wajib diisi");
      return;
    }

    if (!isEdit && !formPdfFile) {
      error("Berkas PDF e-book wajib diunggah saat menambahkan koleksi baru");
      return;
    }

    if (!formIsFullAccess && formStartPage > formEndPage) {
      error("Konfigurasi Pratinjau Salah: Halaman awal tidak boleh lebih besar dari halaman akhir");
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append("title", formTitle.trim());
      if (formAuthor.trim()) formData.append("authorName", formAuthor.trim());
      if (formPublisher.trim()) formData.append("publisherName", formPublisher.trim());
      if (formYear) formData.append("publishYear", formYear);
      if (formIsbn.trim()) formData.append("isbn", formIsbn.trim());
      if (formCategoryId) formData.append("categoryId", formCategoryId);
      if (formDescription.trim()) formData.append("description", formDescription.trim());
      if (formImage.trim()) formData.append("image", formImage.trim());
      formData.append("isFullAccess", String(formIsFullAccess));
      formData.append("previewStartPage", String(formStartPage));
      formData.append("previewEndPage", String(formEndPage));
      formData.append("allowDownload", String(formAllowDownload));

      if (formPdfFile) {
        formData.append("file", formPdfFile);
      }

      if (isEdit && editId) {
        await ebookService.updateEbook(editId, formData);
        success("E-Book Berhasil Diperbarui: Metadata buku digital telah tersimpan");
      } else {
        await ebookService.createEbook(formData);
        success("E-Book Berhasil Ditambahkan: Koleksi buku digital baru siap diakses");
      }

      setIsDirty(false);
      onSuccess();
    } catch (err: any) {
      error(err?.message || "Gagal menyimpan e-book");
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
            <Skeleton className="h-40 w-full rounded-2xl" />
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
            Kembali ke Daftar
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                {isEdit ? "Edit Metadata E-Book" : "Tambah Koleksi E-Book Baru"}
              </h2>
              <Badge
                variant={isEdit ? "secondary" : "default"}
                className={
                  isEdit
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300"
                    : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300"
                }
              >
                {isEdit ? "Mode Edit" : "Entri Baru"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Halaman penuh untuk input 13 field metadata dan berkas PDF berkapasitas besar (S3 Dahono Cloud Storage).
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
                {isEdit ? "Perbarui E-Book" : "Simpan Koleksi"}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main 2-Column Form Layout */}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Kolom Kiri: Metadata Utama Buku (8 spans) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Card 1: Informasi Bibliografi E-Book */}
            <div className="p-6 rounded-2xl border border-border bg-card shadow-xs space-y-5">
              <div className="border-b border-border pb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  Informasi Bibliografi E-Book
                </h3>
                <span className="text-xs text-muted-foreground">
                  <span className="text-destructive">*</span> Wajib diisi
                </span>
              </div>

              {/* Judul Buku */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Judul E-Book <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => handleFieldChange(setFormTitle, e.target.value)}
                  placeholder="Contoh: Pemrograman Web Modern dengan React dan TypeScript"
                  className="w-full px-3.5 py-2.5 text-sm bg-background border border-input rounded-xl focus:ring-2 focus:ring-primary focus:outline-none min-h-[46px] shadow-2xs"
                />
              </div>

              {/* Penulis & Penerbit */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Nama Penulis Utama
                  </label>
                  <input
                    type="text"
                    value={formAuthor}
                    onChange={(e) => handleFieldChange(setFormAuthor, e.target.value)}
                    placeholder="Nama pengarang / penulis buku"
                    className="w-full px-3.5 py-2.5 text-sm bg-background border border-input rounded-xl focus:ring-2 focus:ring-primary focus:outline-none min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Penerbit
                  </label>
                  <input
                    type="text"
                    value={formPublisher}
                    onChange={(e) => handleFieldChange(setFormPublisher, e.target.value)}
                    placeholder="Nama penerbit buku"
                    className="w-full px-3.5 py-2.5 text-sm bg-background border border-input rounded-xl focus:ring-2 focus:ring-primary focus:outline-none min-h-[44px]"
                  />
                </div>
              </div>

              {/* Tahun, ISBN, Kategori */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Tahun Terbit
                  </label>
                  <input
                    type="number"
                    min="1900"
                    max="2100"
                    value={formYear}
                    onChange={(e) => handleFieldChange(setFormYear, e.target.value)}
                    placeholder="2024"
                    className="w-full px-3.5 py-2.5 text-sm bg-background border border-input rounded-xl focus:ring-2 focus:ring-primary focus:outline-none min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    ISBN
                  </label>
                  <input
                    type="text"
                    value={formIsbn}
                    onChange={(e) => handleFieldChange(setFormIsbn, e.target.value)}
                    placeholder="978-..."
                    className="w-full px-3.5 py-2.5 text-sm bg-background border border-input rounded-xl focus:ring-2 focus:ring-primary focus:outline-none min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Kategori Koleksi
                  </label>
                  <Select
                    value={formCategoryId ? String(formCategoryId) : "none"}
                    onValueChange={(val) =>
                      handleFieldChange(setFormCategoryId, val === "none" ? "" : val)
                    }
                  >
                    <SelectTrigger className="w-full h-[44px] bg-background border-input rounded-xl text-sm cursor-pointer shadow-2xs">
                      <SelectValue placeholder="Pilih Kategori" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      <SelectItem value="none" className="cursor-pointer text-muted-foreground">
                        Pilih Kategori
                      </SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)} className="cursor-pointer">
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Deskripsi / Sinopsis */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Sinopsis / Deskripsi Isi
                  </label>
                  <span className="text-[11px] text-muted-foreground">
                    {formDescription.length} karakter
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={formDescription}
                  onChange={(e) => handleFieldChange(setFormDescription, e.target.value)}
                  placeholder="Tuliskan ringkasan isi buku, topik bahasan utama, atau catatan katalog..."
                  className="w-full px-3.5 py-2.5 text-sm bg-background border border-input rounded-xl focus:ring-2 focus:ring-primary focus:outline-none leading-relaxed"
                />
              </div>
            </div>

            {/* Card 2: Visual Gambar Sampul (Cover Image) */}
            <div className="p-6 rounded-2xl border border-border bg-card shadow-xs space-y-4">
              <div className="border-b border-border pb-3">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-primary" />
                  Gambar Sampul E-Book (Cover Image)
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Tautan gambar sampul buku untuk ditampilkan di katalog digital perpustakaan.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 items-start">
                <div className="flex-1 w-full space-y-2">
                  <label className="block text-xs font-semibold text-foreground">
                    URL Gambar Sampul (Opsional)
                  </label>
                  <input
                    type="url"
                    value={formImage}
                    onChange={(e) => handleFieldChange(setFormImage, e.target.value)}
                    placeholder="https://images.unsplash.com/... atau tautan CDN"
                    className="w-full px-3.5 py-2.5 text-sm bg-background border border-input rounded-xl focus:ring-2 focus:ring-primary focus:outline-none min-h-[44px]"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Gunakan tautan gambar HTTPS langsung berformat JPG, PNG, atau WebP.
                  </p>
                </div>

                {/* Pratinjau Sampul */}
                <div className="w-28 h-36 rounded-xl border border-border bg-muted/40 overflow-hidden flex flex-col items-center justify-center relative shrink-0">
                  {formImage ? (
                    <img
                      src={formImage}
                      alt="Pratinjau Sampul"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://placehold.co/112x144?text=Invalid+URL";
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-2 text-center text-muted-foreground">
                      <ImageIcon className="h-6 w-6 mb-1 opacity-50" />
                      <span className="text-[10px]">Tanpa Sampul</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Kolom Kanan: Berkas PDF S3 & Kebijakan Akses (4 spans) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Card 3: Upload Berkas Dokumen PDF */}
            <div className="p-6 rounded-2xl border border-border bg-card shadow-xs space-y-4">
              <div className="border-b border-border pb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Upload className="h-4 w-4 text-primary" />
                  Berkas PDF E-Book
                </h3>
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-primary/10 text-primary font-medium">
                  Maks. 100 MB
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
              {isEdit && existingEbook?.content && !formPdfFile && (
                <div className="p-3.5 rounded-xl border border-border bg-muted/30 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Berkas PDF Tersimpan di S3
                  </div>
                  <div className="text-[11px] text-muted-foreground space-y-0.5">
                    <p>Ukuran Berkas: {formatFileSize(existingEbook.content.fileSize)}</p>
                    <p>Jumlah Halaman: {existingEbook.content.pageCount || "-"} Halaman</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground italic">
                    Biarkan kosong jika tidak ingin mengganti file PDF saat ini.
                  </p>
                </div>
              )}

              {/* Upload Dropzone */}
              {formPdfFile ? (
                <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {formPdfFile.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatFileSize(formPdfFile.size)} • Siap diunggah
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveFile}
                      className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 cursor-pointer shrink-0"
                      title="Hapus pilihan berkas"
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
                      Pilih atau Seret Berkas PDF
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      PDF Dokumen hingga kapasitas 100 MB
                    </p>
                  </div>
                  <span className="text-[10px] px-2.5 py-1 rounded-full bg-muted text-muted-foreground font-mono">
                    Cloud Storage S3 Dahono
                  </span>
                </div>
              )}
            </div>

            {/* Card 4: Kebijakan Akses Baca & Download */}
            <div className="p-6 rounded-2xl border border-border bg-card shadow-xs space-y-4">
              <div className="border-b border-border pb-3">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Lock className="h-4 w-4 text-primary" />
                  Kebijakan Akses Baca Pemustaka
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Atur hak akses baca pratinjau dan izin download berkas.
                </p>
              </div>

              {/* Mode Akses */}
              <div className="space-y-2.5">
                <label className="flex items-start gap-3 p-3 rounded-xl border border-border bg-background hover:bg-muted/30 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="accessMode"
                    checked={formIsFullAccess}
                    onChange={() => handleFieldChange(setFormIsFullAccess, true)}
                    className="mt-0.5 text-primary focus:ring-primary"
                  />
                  <div>
                    <span className="block text-xs font-semibold text-foreground">
                      Akses Penuh (Full Access)
                    </span>
                    <span className="block text-[11px] text-muted-foreground">
                      Pemustaka dapat membaca seluruh halaman e-book tanpa batasan.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-xl border border-border bg-background hover:bg-muted/30 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="accessMode"
                    checked={!formIsFullAccess}
                    onChange={() => handleFieldChange(setFormIsFullAccess, false)}
                    className="mt-0.5 text-primary focus:ring-primary"
                  />
                  <div>
                    <span className="block text-xs font-semibold text-foreground">
                      Pratinjau Halaman Terbatas (Slicing)
                    </span>
                    <span className="block text-[11px] text-muted-foreground">
                      Hanya menampilkan rentang halaman tertentu bagi publik.
                    </span>
                  </div>
                </label>
              </div>

              {/* Input Slicing Halaman */}
              {!formIsFullAccess && (
                <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
                    <Lock className="h-3.5 w-3.5" />
                    Rentang Halaman Pratinjau
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                        Halaman Mulai
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formStartPage}
                        onChange={(e) =>
                          handleFieldChange(setFormStartPage, Math.max(1, Number(e.target.value)))
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
                        value={formEndPage}
                        onChange={(e) =>
                          handleFieldChange(setFormEndPage, Math.max(1, Number(e.target.value)))
                        }
                        className="w-full px-3 py-1.5 text-xs bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary min-h-[38px]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Izin Download */}
              <div className="pt-2 border-t border-border">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formAllowDownload}
                    onChange={(e) => handleFieldChange(setFormAllowDownload, e.target.checked)}
                    className="mt-0.5 rounded text-primary focus:ring-primary"
                  />
                  <div>
                    <span className="block text-xs font-semibold text-foreground flex items-center gap-1">
                      <Download className="h-3.5 w-3.5 text-primary" />
                      Izinkan Pengunduhan Berkas PDF
                    </span>
                    <span className="block text-[11px] text-muted-foreground">
                      Bila dicentang, pemustaka dapat mendownload file dokumen asli.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

export default EbookEditorForm;
