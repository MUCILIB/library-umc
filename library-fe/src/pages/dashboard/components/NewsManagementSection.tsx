import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
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
} from "lucide-react";
import Modal from "@/components/ui/modal";
import {
  newsService,
  type NewsItem,
  type NewsCategory,
  type NewsStatus,
  CATEGORY_LABELS,
  CATEGORY_STYLES,
} from "@/services/newsService";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function NewsManagementSection() {
  const navigate = useNavigate();
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<NewsCategory | "all">("all");
  const [selectedStatus, setSelectedStatus] = useState<NewsStatus | "all">("all");

  // Delete Confirmation Modal
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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
      toast.error(error?.message || "Gagal memuat daftar berita");
    } finally {
      setLoading(false);
    }
  }, [page, search, selectedCategory, selectedStatus]);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  // Navigate to Create Page
  const handleOpenCreate = () => {
    navigate("/dashboard/berita/baru");
  };

  // Navigate to Edit Page
  const handleOpenEdit = (item: NewsItem) => {
    navigate(`/dashboard/berita/edit/${item.id}`);
  };

  // Quick Toggle Status
  const handleToggleStatus = async (item: NewsItem) => {
    const newStatus: NewsStatus = item.status === "published" ? "draft" : "published";
    try {
      await newsService.updateNews(item.id, { status: newStatus });
      toast.success(
        newStatus === "published"
          ? "Berita berhasil diterbitkan ke publik"
          : "Berita dialihkan ke draft"
      );
      fetchNews();
    } catch (err: any) {
      toast.error(err?.message || "Gagal memperbarui status publikasi");
    }
  };

  // Delete Action
  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      setDeleting(true);
      await newsService.deleteNews(deleteId);
      toast.success("Artikel berita berhasil dihapus");
      setDeleteId(null);
      fetchNews();
    } catch (err: any) {
      toast.error(err?.message || "Gagal menghapus berita");
    } finally {
      setDeleting(false);
    }
  };

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
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-all shadow-sm hover:shadow shrink-0 text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>+ Tambah Berita</span>
        </button>
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
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value as any);
              setPage(1);
            }}
            className="text-xs bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">Semua Kategori</option>
            <option value="pengumuman">Pengumuman</option>
            <option value="agenda">Agenda</option>
            <option value="kegiatan">Kegiatan</option>
            <option value="layanan">Layanan</option>
            <option value="literasi">Literasi</option>
          </select>

          {/* Status Tabs */}
          <div className="flex items-center bg-muted/60 p-1 rounded-lg border border-border/60 text-xs">
            <button
              onClick={() => {
                setSelectedStatus("all");
                setPage(1);
              }}
              className={cn(
                "px-2.5 py-1 rounded-md font-medium transition-all",
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
                "px-2.5 py-1 rounded-md font-medium transition-all",
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
                "px-2.5 py-1 rounded-md font-medium transition-all",
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
            className="p-2 text-muted-foreground hover:text-foreground rounded-lg border border-border bg-background hover:bg-muted transition-colors"
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
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <Newspaper className="w-10 h-10 mx-auto mb-2 text-muted-foreground/40" />
                    <p className="font-semibold text-foreground">Belum ada berita ditemukan</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Klik "+ Tambah Berita" untuk mempublikasikan artikel pertama.
                    </p>
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
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 hover:opacity-80 transition-opacity"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Terbit</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggleStatus(item)}
                            title="Klik untuk terbitkan ke publik"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900 hover:opacity-80 transition-opacity"
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
                            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            title="Edit Artikel"
                            className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteId(item.id)}
                            title="Hapus Artikel"
                            className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition-colors"
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
                className="p-1.5 rounded-lg border border-border bg-background disabled:opacity-40 hover:bg-muted transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-border bg-background disabled:opacity-40 hover:bg-muted transition-colors"
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
              className="px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground bg-muted rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={handleDeleteConfirm}
              className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
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
