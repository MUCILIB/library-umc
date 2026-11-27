import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  ExternalLink,
  RefreshCw,
  Newspaper,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  BarChart3,
  Layers,
} from "lucide-react";
import Modal from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import NewsEditorForm from "./NewsEditorForm";
import {
  newsService,
  type NewsItem,
  type NewsCategory,
  type NewsStatus,
  type NewsStatsResponse,
  CATEGORY_LABELS,
  CATEGORY_STYLES,
} from "@/services/newsService";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";

export default function NewsManagementSection() {
  const { success, error: showErrorToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const actionParam = searchParams.get("action");
  const editIdParam = searchParams.get("id");

  const isFormActive =
    actionParam === "create" || (actionParam === "edit" && Boolean(editIdParam));

  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Statistics state
  const [stats, setStats] = useState<NewsStatsResponse | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<NewsCategory | "all">("all");
  const [selectedStatus, setSelectedStatus] = useState<NewsStatus | "all">("all");

  // Delete Confirmation Modal
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch Statistics
  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const data = await newsService.getNewsStats();
      setStats(data);
    } catch (err: any) {
      console.error("Gagal memuat statistik berita:", err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Fetch News List
  const fetchNews = useCallback(async () => {
    try {
      setLoading(true);
      const res = await newsService.getNewsList({
        page,
        limit: 10,
        search: search.trim() || undefined,
        category: selectedCategory,
        status: selectedStatus,
      });
      setNewsList(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (error: any) {
      showErrorToast("Gagal Memuat Berita", error?.message || "Gagal memuat daftar berita");
    } finally {
      setLoading(false);
    }
  }, [page, search, selectedCategory, selectedStatus, showErrorToast]);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Navigate into Form inside Dashboard
  const handleOpenCreate = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", "cms-news");
      next.set("action", "create");
      next.delete("id");
      return next;
    });
  };

  const handleOpenEdit = (item: NewsItem) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", "cms-news");
      next.set("action", "edit");
      next.set("id", item.id);
      return next;
    });
  };

  const handleBackFromForm = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("action");
      next.delete("id");
      return next;
    });
    fetchNews();
    fetchStats();
  };

  // Quick Toggle Status
  const handleToggleStatus = async (item: NewsItem) => {
    const newStatus: NewsStatus = item.status === "published" ? "draft" : "published";
    try {
      await newsService.updateNews(item.id, { status: newStatus });
      success(
        "Status Diperbarui",
        newStatus === "published"
          ? "Berita berhasil diterbitkan ke publik"
          : "Berita dialihkan ke draft"
      );
      fetchNews();
      fetchStats();
    } catch (err: any) {
      showErrorToast("Gagal Mengubah Status", err?.message || "Gagal memperbarui status publikasi");
    }
  };

  // Delete Action
  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      setDeleting(true);
      await newsService.deleteNews(deleteId);
      success("Berita Dihapus", "Artikel berita berhasil dihapus secara permanen");
      setDeleteId(null);
      fetchNews();
      fetchStats();
    } catch (err: any) {
      showErrorToast("Gagal Menghapus", err?.message || "Gagal menghapus berita");
    } finally {
      setDeleting(false);
    }
  };

  // Jika sedang membuka form create/edit berita, render form penuh di dalam dashboard
  if (isFormActive) {
    return (
      <NewsEditorForm
        id={actionParam === "edit" ? editIdParam : null}
        onBack={handleBackFromForm}
        onSuccess={handleBackFromForm}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border rounded-2xl p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-primary font-semibold text-sm mb-1">
            <Newspaper className="w-4 h-4" />
            <span>Manajemen Konten (CMS)</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">
            Kabar & Berita Perpustakaan
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Kelola publikasi pengumuman resmi, agenda, kegiatan, layanan, dan literasi civitas akademika UMC.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-all shadow-sm hover:shadow shrink-0 text-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Berita</span>
        </button>
      </div>

      {/* Traffic & Analytics Section */}
      <div className="space-y-4">
        {/* Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-medium">Total Artikel</span>
              <Newspaper className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-foreground">
              {stats?.total ?? total}
            </div>
            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
              <span>{stats?.published ?? 0} Terbit</span>
              <span>•</span>
              <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
              <span>{stats?.draft ?? 0} Draft</span>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-medium">Total Pembaca (Views)</span>
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            <div className="text-2xl font-bold text-foreground">
              {(stats?.totalViews ?? 0).toLocaleString("id-ID")}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Akumulasi tayangan artikel publik
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-medium">Rata-rata Pembaca</span>
              <BarChart3 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-foreground">
              {stats && stats.published > 0
                ? Math.round(stats.totalViews / stats.published).toLocaleString("id-ID")
                : "0"}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Tayangan per artikel terbit
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-medium">Kategori Konten</span>
              <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-foreground">
              {stats?.categoryStats?.length ?? 5}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Pengumuman, Agenda, Kegiatan, Layanan, Literasi
            </div>
          </div>
        </div>

        {/* Visual Traffic Bar Chart: Top 5 Articles */}
        {stats && stats.topArticles && stats.topArticles.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-foreground">
                    Artikel Terpopuler & Analitik Traffic
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    5 artikel berita dengan jumlah pembaca tertinggi di portal perpustakaan
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-muted rounded-lg text-muted-foreground flex items-center gap-1.5">
                {statsLoading && <RefreshCw className="w-3 h-3 animate-spin text-primary" />}
                <span>Live Data</span>
              </span>
            </div>

            <div className="space-y-3">
              {(() => {
                const maxViews = Math.max(1, ...stats.topArticles.map((a) => a.views));
                return stats.topArticles.map((article, idx) => {
                  const percent = Math.max(8, Math.min(100, Math.round((article.views / maxViews) * 100)));
                  const catStyle = CATEGORY_STYLES[article.category] || CATEGORY_STYLES.pengumuman;

                  return (
                    <div key={article.id} className="group">
                      <div className="flex items-center justify-between gap-3 text-xs mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={cn(
                            "w-5 h-5 rounded-md flex items-center justify-center font-bold text-[11px] shrink-0",
                            idx === 0
                              ? "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 font-extrabold"
                              : idx === 1
                              ? "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                              : idx === 2
                              ? "bg-amber-50 dark:bg-amber-900/40 text-amber-800 dark:text-amber-500"
                              : "bg-muted text-muted-foreground"
                          )}>
                            {idx + 1}
                          </span>
                          <span
                            className={cn(
                              "px-1.5 py-0.5 rounded text-[10px] font-semibold border shrink-0",
                              catStyle.bg,
                              catStyle.text,
                              catStyle.border
                            )}
                          >
                            {CATEGORY_LABELS[article.category]}
                          </span>
                          <a
                            href={`/berita/${article.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-foreground hover:text-primary transition-colors truncate group-hover:underline cursor-pointer"
                          >
                            {article.title}
                          </a>
                        </div>
                        <div className="flex items-center gap-1.5 font-bold text-foreground shrink-0 text-xs">
                          <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>{article.views.toLocaleString("id-ID")}</span>
                          <span className="text-[10px] font-normal text-muted-foreground">views</span>
                        </div>
                      </div>

                      {/* Relative Progress Bar */}
                      <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary to-rose-400 transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Filters & Search Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-card border border-border rounded-xl p-4 shadow-sm">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari judul berita atau kata kunci..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground"
          />
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
          <Select
            value={selectedCategory}
            onValueChange={(value) => {
              setSelectedCategory(value as NewsCategory | "all");
              setPage(1);
            }}
          >
            <SelectTrigger size="sm" className="h-8 min-w-[140px] rounded-lg border-border bg-background px-3 text-xs text-foreground">
              <SelectValue placeholder="Semua Kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kategori</SelectItem>
              <SelectItem value="pengumuman">Pengumuman</SelectItem>
              <SelectItem value="agenda">Agenda</SelectItem>
              <SelectItem value="kegiatan">Kegiatan</SelectItem>
              <SelectItem value="layanan">Layanan</SelectItem>
              <SelectItem value="literasi">Literasi</SelectItem>
            </SelectContent>
          </Select>

          {/* Status Tabs */}
          <div className="flex items-center bg-muted/60 p-1 rounded-lg border border-border/60 text-xs">
            <button
              onClick={() => {
                setSelectedStatus("all");
                setPage(1);
              }}
              className={cn(
                "px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer",
                selectedStatus === "all"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Semua
            </button>
            <button
              onClick={() => {
                setSelectedStatus("published");
                setPage(1);
              }}
              className={cn(
                "px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer",
                selectedStatus === "published"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Terbit
            </button>
            <button
              onClick={() => {
                setSelectedStatus("draft");
                setPage(1);
              }}
              className={cn(
                "px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer",
                selectedStatus === "draft"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Draft
            </button>
          </div>

          <button
            onClick={fetchNews}
            title="Muat Ulang"
            className="p-2 text-muted-foreground hover:text-foreground rounded-lg border border-border bg-background hover:bg-muted transition-colors cursor-pointer"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground font-semibold">
              <tr>
                <th className="py-3 px-4 w-16">Sampul</th>
                <th className="py-3 px-4">Judul & Ringkasan</th>
                <th className="py-3 px-4 w-28">Kategori</th>
                <th className="py-3 px-4 w-24">Status</th>
                <th className="py-3 px-4 w-28">Dilihat</th>
                <th className="py-3 px-4 w-36">Tanggal</th>
                <th className="py-3 px-4 w-28 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                    <span>Memuat data berita...</span>
                  </td>
                </tr>
              ) : newsList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8">
                    <EmptyState
                      icon={Newspaper}
                      title="Belum ada berita ditemukan"
                      description={
                        search
                          ? "Tidak ada berita yang cocok dengan kata kunci pencarian Anda."
                          : "Klik 'Tambah Berita' untuk mempublikasikan artikel pertama."
                      }
                    />
                  </td>
                </tr>
              ) : (
                newsList.map((item) => {
                  const catStyle = CATEGORY_STYLES[item.category] || CATEGORY_STYLES.pengumuman;
                  const coverUrl = newsService.getImageUrl(item.coverImage);

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-muted/30 transition-colors group"
                    >
                      {/* Cover Thumbnail */}
                      <td className="py-3 px-4 align-top">
                        <div className="w-12 h-12 rounded-lg bg-muted border border-border/80 overflow-hidden flex items-center justify-center shrink-0">
                          {coverUrl ? (
                            <img
                              src={coverUrl}
                              alt={item.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <Newspaper className="w-5 h-5 text-muted-foreground/40" />
                          )}
                        </div>
                      </td>

                      {/* Title & Excerpt */}
                      <td className="py-3 px-4 align-top max-w-xs sm:max-w-md">
                        <div className="font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                          {item.title}
                        </div>
                        {item.excerpt && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                            {item.excerpt}
                          </p>
                        )}
                        <div className="text-[11px] text-muted-foreground/80 mt-1 flex items-center gap-2">
                          <span className="font-mono text-[10px] text-muted-foreground/70">
                            /{item.slug}
                          </span>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4 align-top">
                        <span
                          className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border",
                            catStyle.bg,
                            catStyle.text,
                            catStyle.border
                          )}
                        >
                          {CATEGORY_LABELS[item.category] || item.category}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 align-top">
                        {item.status === "published" ? (
                          <button
                            onClick={() => handleToggleStatus(item)}
                            title="Klik untuk beralih ke Draft"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 hover:opacity-80 transition-opacity cursor-pointer"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Terbit</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggleStatus(item)}
                            title="Klik untuk terbitkan ke publik"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900 hover:opacity-80 transition-opacity cursor-pointer"
                          >
                            <Clock className="w-3 h-3" />
                            <span>Draft</span>
                          </button>
                        )}
                      </td>

                      {/* Views */}
                      <td className="py-3 px-4 align-top text-xs text-muted-foreground">
                        <div className="flex items-center gap-1 font-semibold text-foreground">
                          <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>{item.views.toLocaleString("id-ID")}</span>
                        </div>
                      </td>

                      {/* Date & Author */}
                      <td className="py-3 px-4 align-top text-xs text-muted-foreground">
                        <div>
                          {item.publishedAt
                            ? new Date(item.publishedAt).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            : new Date(item.createdAt).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                        </div>
                        {item.author?.name && (
                          <div className="text-[11px] text-muted-foreground/80 truncate max-w-[120px]">
                            oleh {item.author.name}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 align-top text-right">
                        <div className="flex items-center justify-end gap-1">
                          <a
                            href={`/berita/${item.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Lihat Pratinjau Publik"
                            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            title="Edit Artikel"
                            className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteId(item.id)}
                            title="Hapus Artikel"
                            className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20 text-xs">
            <span className="text-muted-foreground">
              Menampilkan halaman <strong>{page}</strong> dari <strong>{totalPages}</strong> (Total {total} berita)
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-border bg-background disabled:opacity-40 hover:bg-muted transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-border bg-background disabled:opacity-40 hover:bg-muted transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        title="Hapus Artikel Berita"
        size="sm"
      >
        <div className="space-y-4 p-2 text-sm">
          <p className="text-foreground">
            Apakah Anda yakin ingin menghapus artikel berita ini secara permanen? Tindakan ini tidak dapat dibatalkan.
          </p>
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              disabled={deleting}
              onClick={() => setDeleteId(null)}
              className="px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground bg-muted rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={handleDeleteConfirm}
              className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              {deleting && <RefreshCw className="w-4 h-4 animate-spin" />}
              <span>Ya, Hapus</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
