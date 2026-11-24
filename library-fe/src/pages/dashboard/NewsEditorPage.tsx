import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router";
import {
  ArrowLeft,
  Save,
  Send,
  Eye,
  Upload,
  Sparkles,
  Calendar,
  Clock,
  Tag,
  ImageIcon,
  CheckCircle2,
  RefreshCw,
  Globe,
  FileText,
  User,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Modal from "@/components/ui/modal";
import ThemeToggle from "@/components/ui/theme-toggle";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import {
  newsService,
  type NewsCategory,
  type NewsStatus,
  type CreateNewsPayload,
  type UpdateNewsPayload,
  CATEGORY_LABELS,
  CATEGORY_STYLES,
} from "@/services/newsService";
import { authClient } from "@/utils/auth-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CATEGORY_DESCRIPTIONS: Record<NewsCategory, string> = {
  pengumuman: "Informasi administratif, edaran libur, dan pengumuman resmi",
  agenda: "Jadwal kegiatan, workshop, webinar, dan literasi informasi",
  kegiatan: "Dokumentasi kunjungan, pameran buku, bedah buku, dan event",
  layanan: "Pembaruan SOP, jam operasional, dan fasilitas baru perpustakaan",
  literasi: "Artikel edukatif seputar literasi, resensi buku, dan tips riset",
};

export default function NewsEditorPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();
  const isEditMode = Boolean(id);

  // Loading states
  const [initialLoading, setInitialLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const [category, setCategory] = useState<NewsCategory>("pengumuman");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [status, setStatus] = useState<NewsStatus>("draft");
  const [publishedAt, setPublishedAt] = useState<string>("");
  const [views, setViews] = useState<number>(0);
  const [authorName, setAuthorName] = useState<string>("");
  const [isDirty, setIsDirty] = useState(false);

  // Preview Modal
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Load existing news if in edit mode
  useEffect(() => {
    if (!id) return;

    let isMounted = true;
    async function loadNews() {
      try {
        setInitialLoading(true);
        const item = await newsService.getNewsById(id!);
        if (!isMounted) return;

        setTitle(item.title);
        setSlug(item.slug);
        setIsSlugManuallyEdited(true);
        setCategory(item.category);
        setExcerpt(item.excerpt || "");
        setContent(item.content);
        setCoverImage(item.coverImage || "");
        setStatus(item.status);
        setViews(item.views || 0);
        setAuthorName(item.author?.name || "");

        if (item.publishedAt) {
          const dateObj = new Date(item.publishedAt);
          // Format ke input datetime-local: YYYY-MM-DDTHH:mm
          const localIso = new Date(dateObj.getTime() - dateObj.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);
          setPublishedAt(localIso);
        }
      } catch (error: any) {
        toast.error(error?.message || "Gagal memuat data berita");
        navigate("/dashboard/super-admin?tab=cms-news");
      } finally {
        if (isMounted) setInitialLoading(false);
      }
    }

    loadNews();
    return () => {
      isMounted = false;
    };
  }, [id, navigate]);

  // Set author name from session if create mode
  useEffect(() => {
    if (!isEditMode && session?.user?.name && !authorName) {
      setAuthorName(session.user.name);
    }
  }, [isEditMode, session, authorName]);

  // Helper untuk membuat slug otomatis dari judul
  const generateSlugFromTitle = useCallback((text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }, []);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    setIsDirty(true);

    if (!isSlugManuallyEdited) {
      setSlug(generateSlugFromTitle(newTitle));
    }
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlug(e.target.value);
    setIsSlugManuallyEdited(true);
    setIsDirty(true);
  };

  const handleRegenerateSlug = () => {
    if (!title.trim()) {
      toast.info("Ketik judul terlebih dahulu untuk membuat slug otomatis");
      return;
    }
    const autoSlug = generateSlugFromTitle(title);
    setSlug(autoSlug);
    setIsSlugManuallyEdited(false);
    setIsDirty(true);
    toast.success("Slug diperbarui dari judul");
  };

  // Upload Cover Image ke S3
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Berkas harus berupa file gambar (JPG, PNG, WebP)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 5 MB");
      return;
    }

    try {
      setUploadingCover(true);
      const res = await newsService.uploadImage(file);
      setCoverImage(res.url);
      setIsDirty(true);
      toast.success("Gambar sampul berhasil diunggah ke S3");
    } catch (error: any) {
      toast.error(error?.message || "Gagal mengunggah gambar sampul");
    } finally {
      setUploadingCover(false);
      e.target.value = "";
    }
  };

  // Simpan / Terbitkan Berita
  const handleSubmit = async (targetStatus?: NewsStatus) => {
    const finalStatus = targetStatus || status;

    if (!title.trim()) {
      toast.error("Judul berita wajib diisi");
      return;
    }

    if (!content.trim() || content.replace(/<[^>]*>/g, "").trim().length < 10) {
      toast.error("Konten berita minimal 10 karakter");
      return;
    }

    let finalPublishedAt: string | null = null;
    if (finalStatus === "published") {
      finalPublishedAt = publishedAt ? new Date(publishedAt).toISOString() : new Date().toISOString();
    }

    const payload: CreateNewsPayload | UpdateNewsPayload = {
      title: title.trim(),
      slug: slug.trim() || undefined,
      category,
      excerpt: excerpt.trim() || undefined,
      content,
      coverImage: coverImage.trim() || undefined,
      status: finalStatus,
      publishedAt: finalPublishedAt,
    };

    try {
      setSaving(true);
      if (isEditMode && id) {
        await newsService.updateNews(id, payload);
        toast.success(
          finalStatus === "published"
            ? "Artikel berita berhasil diperbarui dan dipublikasikan!"
            : "Draf berita berhasil disimpan!"
        );
      } else {
        await newsService.createNews(payload as CreateNewsPayload);
        toast.success(
          finalStatus === "published"
            ? "Artikel berita berhasil diterbitkan!"
            : "Draf berita berhasil dibuat!"
        );
      }
      setIsDirty(false);
      navigate("/dashboard/super-admin?tab=cms-news");
    } catch (error: any) {
      toast.error(error?.message || "Gagal menyimpan artikel berita");
    } finally {
      setSaving(false);
    }
  };

  // Keyboard shortcut Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [title, content, slug, category, excerpt, coverImage, status, publishedAt]);

  const resolvedCoverUrl = useMemo(() => {
    return newsService.getImageUrl(coverImage);
  }, [coverImage]);

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-md px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Skeleton className="h-8 w-48" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-32" />
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-6">
              <Skeleton className="h-14 w-full rounded-xl" />
              <Skeleton className="h-10 w-3/4 rounded-xl" />
              <Skeleton className="h-28 w-full rounded-xl" />
              <Skeleton className="h-96 w-full rounded-2xl" />
            </div>
            <div className="lg:col-span-4 space-y-6">
              <Skeleton className="h-44 w-full rounded-2xl" />
              <Skeleton className="h-44 w-full rounded-2xl" />
              <Skeleton className="h-48 w-full rounded-2xl" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col selection:bg-primary/20 selection:text-primary">
      {/* Top Sticky Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur-md transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Left: Back & Breadcrumb */}
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (isDirty && !window.confirm("Ada perubahan yang belum disimpan. Yakin ingin keluar?")) {
                  return;
                }
                navigate("/dashboard/super-admin?tab=cms-news");
              }}
              className="text-muted-foreground hover:text-foreground shrink-0"
              title="Kembali ke Daftar Berita"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              <span className="hidden sm:inline">Kembali</span>
            </Button>

            <span className="h-4 w-px bg-border shrink-0" />

            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-semibold text-muted-foreground hidden md:inline truncate">
                Manajemen Berita
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60 hidden md:inline shrink-0" />
              <h1 className="text-sm font-bold text-foreground truncate">
                {isEditMode ? "Edit Berita" : "Tulis Berita Baru"}
              </h1>
              {status === "published" ? (
                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[11px] font-semibold shrink-0">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Terbit
                </Badge>
              ) : (
                <Badge variant="outline" className="text-amber-600 dark:text-amber-400 border-amber-500/30 text-[11px] font-semibold shrink-0">
                  <Clock className="w-3 h-3 mr-1" />
                  Draf
                </Badge>
              )}
            </div>
          </div>

          {/* Right: Actions & ThemeToggle */}
          <div className="flex items-center gap-2 shrink-0">
            <ThemeToggle />

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsPreviewOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Pratinjau</span>
            </Button>

            {status !== "draft" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={saving}
                onClick={() => handleSubmit("draft")}
                className="hidden md:inline-flex items-center gap-1.5 text-xs font-medium"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Draf</span>
              </Button>
            )}

            <Button
              type="button"
              size="sm"
              disabled={saving}
              onClick={() => handleSubmit(status === "draft" ? "published" : undefined)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs shadow-sm shadow-primary/20 px-3.5"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  <span>{isEditMode ? "Simpan Perubahan" : "Terbitkan Berita"}</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Form Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Main Editor (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Title Input Card */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-2xs space-y-4">
              <div>
                <label
                  htmlFor="news-title-input"
                  className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2"
                >
                  Judul Berita <span className="text-red-500">*</span>
                </label>
                <input
                  id="news-title-input"
                  type="text"
                  value={title}
                  onChange={handleTitleChange}
                  placeholder="Ketik judul artikel berita atau pengumuman di sini..."
                  className="w-full text-xl sm:text-2xl font-bold bg-transparent text-foreground placeholder:text-muted-foreground/40 border-b border-border/80 pb-3 focus:outline-none focus:border-primary transition-colors"
                  autoFocus
                />
              </div>

              {/* Slug / URL Field */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1 text-xs">
                <span className="font-semibold text-muted-foreground flex items-center gap-1 shrink-0">
                  <Globe className="w-3.5 h-3.5 text-primary" />
                  Permalink:
                </span>
                <div className="flex-1 flex items-center gap-1.5 bg-muted/40 border border-border/70 rounded-lg px-2.5 py-1.5 font-mono text-[11px] text-muted-foreground overflow-hidden">
                  <span className="shrink-0 select-none text-muted-foreground/60">/berita/</span>
                  <input
                    type="text"
                    value={slug}
                    onChange={handleSlugChange}
                    placeholder="slug-otomatis"
                    className="w-full bg-transparent text-foreground placeholder:text-muted-foreground/40 focus:outline-none font-mono"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRegenerateSlug}
                  title="Generate ulang slug dari judul saat ini"
                  className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-500" />
                  <span>Auto Slug</span>
                </Button>
              </div>
            </div>

            {/* Excerpt Card */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="news-excerpt-input"
                  className="block text-xs font-bold uppercase tracking-wider text-muted-foreground"
                >
                  Ringkasan Singkat (Excerpt)
                </label>
                <span className={cn(
                  "text-[11px] font-mono",
                  excerpt.length > 500 ? "text-red-500 font-bold" : "text-muted-foreground"
                )}>
                  {excerpt.length}/500
                </span>
              </div>
              <textarea
                id="news-excerpt-input"
                rows={3}
                value={excerpt}
                maxLength={500}
                onChange={(e) => {
                  setExcerpt(e.target.value);
                  setIsDirty(true);
                }}
                placeholder="Tulis ringkasan singkat artikel dalam 1-2 kalimat. Ringkasan ini akan ditampilkan pada kartu berita di halaman utama, katalog, dan cuplikan media sosial."
                className="w-full text-sm bg-muted/20 border border-border rounded-xl p-3 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors resize-y leading-relaxed"
              />
            </div>

            {/* Structured Word-like Rich Text Editor */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-primary" />
                  Konten Berita Lengkap <span className="text-red-500">*</span>
                </label>
                <span className="text-xs text-muted-foreground/70 hidden sm:inline">
                  Mendukung format Word, tabel, gambar S3, dan tautan
                </span>
              </div>

              <div className="min-h-[500px]">
                <RichTextEditor
                  value={content}
                  onChange={(val) => {
                    setContent(val);
                    setIsDirty(true);
                  }}
                  placeholder="Tulis konten berita secara leluasa di sini. Anda dapat memformat teks (tebal, miring, judul bab), menyisipkan tabel, poin daftar, dan mengunggah gambar langsung ke penyimpanan S3 perpustakaan..."
                  minHeight="480px"
                  onUploadImage={async (file) => {
                    const res = await newsService.uploadImage(file);
                    return newsService.getImageUrl(res.url);
                  }}
                />
              </div>
            </div>
          </div>

          {/* Right Column: Publishing & Metadata Sidebar (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Panel 1: Pengaturan Status & Publikasi */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-2xs space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-primary" />
                Status & Publikasi
              </h2>

              {/* Status Radio Buttons */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-foreground block">
                  Status Berita
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStatus("draft");
                      setIsDirty(true);
                    }}
                    className={cn(
                      "py-2 px-3 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all",
                      status === "draft"
                        ? "bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-400 shadow-2xs"
                        : "border-border text-muted-foreground hover:bg-muted/40"
                    )}
                  >
                    <Clock className="w-4 h-4" />
                    <span>Draf</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStatus("published");
                      setIsDirty(true);
                      if (!publishedAt) {
                        const localIso = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
                          .toISOString()
                          .slice(0, 16);
                        setPublishedAt(localIso);
                      }
                    }}
                    className={cn(
                      "py-2 px-3 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all",
                      status === "published"
                        ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 shadow-2xs"
                        : "border-border text-muted-foreground hover:bg-muted/40"
                    )}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Terbit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStatus("archived");
                      setIsDirty(true);
                    }}
                    className={cn(
                      "py-2 px-3 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all",
                      status === "archived"
                        ? "bg-slate-500/10 border-slate-500/40 text-slate-600 dark:text-slate-400 shadow-2xs"
                        : "border-border text-muted-foreground hover:bg-muted/40"
                    )}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Arsip</span>
                  </button>
                </div>
              </div>

              {/* Tanggal Publikasi */}
              <div className="space-y-1.5 pt-2 border-t border-border">
                <label
                  htmlFor="news-publish-date"
                  className="text-xs font-medium text-foreground flex items-center justify-between"
                >
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    Waktu Tayang
                  </span>
                  <span className="text-[10px] text-muted-foreground">WIB</span>
                </label>
                <input
                  id="news-publish-date"
                  type="datetime-local"
                  value={publishedAt}
                  onChange={(e) => {
                    setPublishedAt(e.target.value);
                    setIsDirty(true);
                  }}
                  className="w-full text-xs bg-muted/20 border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-mono"
                />
                <p className="text-[11px] text-muted-foreground/70">
                  Kosongkan untuk otomatis menggunakan waktu saat ini ketika diterbitkan.
                </p>
              </div>

              {/* Action Buttons in Sidebar */}
              <div className="pt-3 border-t border-border space-y-2">
                <Button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSubmit(status === "draft" ? "published" : undefined)}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs py-2.5 shadow-sm shadow-primary/20"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5 mr-1.5" />
                      <span>{isEditMode ? "Simpan Perubahan" : "Terbitkan Berita"}</span>
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  disabled={saving}
                  onClick={() => handleSubmit("draft")}
                  className="w-full text-xs font-medium"
                >
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  <span>Simpan sebagai Draf</span>
                </Button>
              </div>
            </div>

            {/* Panel 2: Kategori Berita */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-2xs space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-primary" />
                Kategori Berita
              </h2>

              <div className="space-y-1.5">
                {(["pengumuman", "agenda", "kegiatan", "layanan", "literasi"] as NewsCategory[]).map((cat) => {
                  const isSelected = category === cat;
                  const catStyle = CATEGORY_STYLES[cat];
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setCategory(cat);
                        setIsDirty(true);
                      }}
                      className={cn(
                        "w-full text-left px-3.5 py-2.5 rounded-xl border text-xs transition-all flex items-start justify-between gap-2",
                        isSelected
                          ? "border-primary bg-primary/5 shadow-2xs font-semibold"
                          : "border-border/70 hover:bg-muted/30 text-foreground"
                      )}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              "inline-block w-2 h-2 rounded-full",
                              cat === "pengumuman" && "bg-blue-500",
                              cat === "agenda" && "bg-purple-500",
                              cat === "kegiatan" && "bg-emerald-500",
                              cat === "layanan" && "bg-amber-500",
                              cat === "literasi" && "bg-rose-500"
                            )}
                          />
                          <span className="font-bold">{CATEGORY_LABELS[cat]}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1 font-normal">
                          {CATEGORY_DESCRIPTIONS[cat]}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "px-1.5 py-0.5 rounded text-[10px] font-bold border shrink-0",
                          catStyle.bg,
                          catStyle.text,
                          catStyle.border
                        )}
                      >
                        Pilih
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Panel 3: Gambar Sampul Utama (Cover Image) */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-primary" />
                  Gambar Sampul
                </h2>
                {coverImage && (
                  <button
                    type="button"
                    onClick={() => {
                      setCoverImage("");
                      setIsDirty(true);
                    }}
                    className="text-[11px] text-red-500 hover:text-red-600 font-medium"
                  >
                    Hapus
                  </button>
                )}
              </div>

              {/* Image Preview Box */}
              {resolvedCoverUrl ? (
                <div className="relative aspect-video rounded-xl overflow-hidden border border-border bg-muted/40 group">
                  <img
                    src={resolvedCoverUrl}
                    alt="Sampul Berita"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = "";
                    }}
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <label className="cursor-pointer bg-white/90 hover:bg-white text-slate-900 font-semibold text-xs px-3 py-1.5 rounded-lg shadow-sm">
                      Ganti Sampul
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleCoverUpload}
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-border rounded-xl p-5 text-center bg-muted/10 hover:bg-muted/20 transition-colors">
                  <ImageIcon className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-xs font-semibold text-foreground">
                    Unggah Sampul Berita
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Rasio 16:9 disarankan (JPG, PNG, WebP maks 5 MB).
                  </p>
                  <label className="mt-3 inline-flex items-center gap-1.5 cursor-pointer bg-primary/10 hover:bg-primary/20 text-primary font-semibold text-xs px-3.5 py-1.5 rounded-lg transition-colors">
                    {uploadingCover ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Mengunggah...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        <span>Pilih Gambar</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingCover}
                      className="hidden"
                      onChange={handleCoverUpload}
                    />
                  </label>
                </div>
              )}

              {/* URL Fallback input */}
              <div className="pt-2 border-t border-border">
                <label
                  htmlFor="news-cover-url"
                  className="text-[11px] font-medium text-muted-foreground block mb-1"
                >
                  Atau masukkan URL gambar langsung:
                </label>
                <input
                  id="news-cover-url"
                  type="text"
                  value={coverImage}
                  onChange={(e) => {
                    setCoverImage(e.target.value);
                    setIsDirty(true);
                  }}
                  placeholder="https://... atau /api/news/assets/..."
                  className="w-full text-xs bg-muted/20 border border-border rounded-lg px-2.5 py-1.5 font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Panel 4: Metadata Info */}
            {isEditMode && (
              <div className="bg-card border border-border rounded-2xl p-5 shadow-2xs space-y-2.5 text-xs text-muted-foreground">
                <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-primary" />
                  Informasi Artikel
                </h2>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span>Penulis:</span>
                  <span className="font-semibold text-foreground">{authorName || "Pustakawan UMC"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span>Jumlah Pembaca:</span>
                  <span className="font-semibold text-foreground flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" />
                    {views.toLocaleString("id-ID")} kali
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Floating Preview Modal */}
      <Modal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title="Pratinjau Publik Berita"
        size="xl"
      >
        <div className="space-y-6 max-h-[75vh] overflow-y-auto px-1">
          {/* Header Preview */}
          <div className="space-y-3 border-b border-border pb-5">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "px-2.5 py-0.5 rounded-full text-xs font-bold border",
                  CATEGORY_STYLES[category].bg,
                  CATEGORY_STYLES[category].text,
                  CATEGORY_STYLES[category].border
                )}
              >
                {CATEGORY_LABELS[category]}
              </span>
              <span className="text-xs text-muted-foreground">
                {publishedAt
                  ? new Date(publishedAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : new Date().toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground leading-tight">
              {title || "Judul Berita Akan Muncul di Sini"}
            </h1>

            {excerpt && (
              <p className="text-base text-muted-foreground italic leading-relaxed border-l-2 border-primary/50 pl-3">
                {excerpt}
              </p>
            )}

            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
              <User className="w-3.5 h-3.5 text-primary" />
              <span>Oleh: <strong className="text-foreground">{authorName || "Pustakawan UMC"}</strong></span>
            </div>
          </div>

          {/* Cover Image Preview */}
          {resolvedCoverUrl && (
            <div className="aspect-video w-full rounded-2xl overflow-hidden border border-border shadow-md">
              <img
                src={resolvedCoverUrl}
                alt={title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Rendered HTML Content */}
          <div
            className="prose dark:prose-invert max-w-none text-foreground leading-relaxed text-sm sm:text-base space-y-4"
            dangerouslySetInnerHTML={{
              __html: content || "<p className='text-muted-foreground italic'>Konten berita belum diisi...</p>",
            }}
          />
        </div>

        <div className="flex justify-end pt-4 border-t border-border mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsPreviewOpen(false)}
          >
            Tutup Pratinjau
          </Button>
        </div>
      </Modal>
    </div>
  );
}
