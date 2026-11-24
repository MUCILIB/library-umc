import React, { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router";
import Navbar from "@/components/ui/navbar";
import Footer from "@/components/Footer";
import {
  Search,
  Calendar,
  Eye,
  ArrowRight,
  Newspaper,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  newsService,
  type NewsItem,
  type NewsCategory,
  CATEGORY_LABELS,
  CATEGORY_STYLES,
} from "@/services/newsService";
import { cn } from "@/lib/utils";

const CATEGORIES: { key: NewsCategory | "all"; label: string }[] = [
  { key: "all", label: "Semua Kategori" },
  { key: "pengumuman", label: "Pengumuman" },
  { key: "agenda", label: "Agenda" },
  { key: "kegiatan", label: "Kegiatan" },
  { key: "layanan", label: "Layanan" },
  { key: "literasi", label: "Literasi" },
];

export default function BeritaPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // States from query params
  const initialCategory = (searchParams.get("category") as NewsCategory) || "all";
  const initialSearch = searchParams.get("q") || "";
  const initialPage = Number(searchParams.get("page")) || 1;

  const [category, setCategory] = useState<NewsCategory | "all">(initialCategory);
  const [search, setSearch] = useState(initialSearch);
  const [page, setPage] = useState(initialPage);

  // Fetch News List
  const fetchNews = useCallback(async () => {
    try {
      setLoading(true);
      const res = await newsService.getNewsList({
        page,
        limit: 9,
        search: search.trim() || undefined,
        category,
        status: "published",
      });
      setNewsList(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err) {
      console.error("Gagal memuat berita:", err);
    } finally {
      setLoading(false);
    }
  }, [page, search, category]);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  // Update URL params
  const handleCategoryChange = (newCat: NewsCategory | "all") => {
    setCategory(newCat);
    setPage(1);
    const p = new URLSearchParams(searchParams);
    if (newCat === "all") p.delete("category");
    else p.set("category", newCat);
    p.delete("page");
    setSearchParams(p);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    const p = new URLSearchParams(searchParams);
    if (!search.trim()) p.delete("q");
    else p.set("q", search.trim());
    p.delete("page");
    setSearchParams(p);
    fetchNews();
  };

  return (
    <div className="w-full min-h-screen bg-[#F8FAFC] dark:bg-muted selection:bg-red-500/20 flex flex-col justify-between">
      <div>
        <Navbar />

        {/* Hero Header */}
        <div className="bg-gradient-to-br from-[#1C070A] via-[#2D0D12] to-[#1C070A] text-white py-12 sm:py-16 md:py-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-red-600/10 via-transparent to-transparent pointer-events-none" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 text-white/90 text-xs font-semibold backdrop-blur-md mb-4 border border-white/10">
              <Sparkles className="w-3.5 h-3.5 text-red-400" />
              <span>Pusat Berita & Informasi Resmi</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">
              Kabar Perpustakaan UMC
            </h1>
            <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-300 mt-3 leading-relaxed">
              Dapatkan berita terbaru seputar agenda akademik, layanan perpustakaan, kegiatan literasi, dan pengumuman resmi UPT Perpustakaan UMC.
            </p>

            {/* Search Bar in Hero */}
            <form
              onSubmit={handleSearchSubmit}
              className="max-w-xl mx-auto mt-8 flex items-center bg-white dark:bg-card rounded-2xl p-1.5 shadow-2xl border border-white/20"
            >
              <div className="pl-3 text-slate-400">
                <Search className="w-5 h-5" />
              </div>
              <input
                type="text"
                placeholder="Cari berita, agenda, pengumuman..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 px-3 py-2 text-sm bg-transparent border-0 focus:outline-none text-slate-900 dark:text-foreground placeholder:text-slate-400"
              />
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#9D171D] hover:bg-[#801217] text-white font-semibold text-xs rounded-xl transition-all shrink-0"
              >
                Cari
              </button>
            </form>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          {/* Category Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-8 no-scrollbar">
            {CATEGORIES.map((cat) => {
              const isActive = category === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => handleCategoryChange(cat.key)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap shrink-0 border",
                    isActive
                      ? "bg-[#9D171D] text-white border-[#9D171D] shadow-md shadow-red-900/10"
                      : "bg-white dark:bg-card text-slate-600 dark:text-muted-foreground border-slate-200 dark:border-border hover:bg-slate-50 dark:hover:bg-muted"
                  )}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Results Info */}
          <div className="flex items-center justify-between text-xs sm:text-sm text-slate-500 dark:text-muted-foreground mb-6">
            <span>
              Menampilkan <strong>{newsList.length}</strong> dari <strong>{total}</strong> artikel
              {category !== "all" && (
                <span> untuk kategori <strong>{CATEGORY_LABELS[category as NewsCategory]}</strong></span>
              )}
            </span>
          </div>

          {/* Cards Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div
                  key={n}
                  className="bg-white dark:bg-card rounded-2xl border border-slate-100 dark:border-border/60 overflow-hidden shadow-xs animate-pulse p-4 space-y-4"
                >
                  <div className="w-full h-48 bg-slate-200 dark:bg-muted rounded-xl" />
                  <div className="w-24 h-5 bg-slate-200 dark:bg-muted rounded-full" />
                  <div className="w-full h-6 bg-slate-200 dark:bg-muted rounded" />
                  <div className="w-3/4 h-4 bg-slate-200 dark:bg-muted rounded" />
                </div>
              ))}
            </div>
          ) : newsList.length === 0 ? (
            <div className="bg-white dark:bg-card rounded-2xl border border-slate-100 dark:border-border/60 p-12 text-center max-w-md mx-auto shadow-sm my-8">
              <Newspaper className="w-12 h-12 text-slate-300 dark:text-muted-foreground/40 mx-auto mb-3" />
              <h3 className="font-bold text-base text-slate-900 dark:text-foreground">
                Tidak ada artikel berita
              </h3>
              <p className="text-xs text-slate-500 dark:text-muted-foreground mt-1">
                Tidak ditemukan artikel berita untuk kata kunci atau kategori yang dipilih.
              </p>
              <button
                onClick={() => {
                  setCategory("all");
                  setSearch("");
                  setPage(1);
                  setSearchParams({});
                }}
                className="mt-4 px-4 py-2 text-xs font-semibold text-[#9D171D] bg-red-50 dark:bg-red-950/40 rounded-xl hover:bg-red-100 transition-colors"
              >
                Reset Filter
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {newsList.map((item) => {
                const catStyle =
                  CATEGORY_STYLES[item.category] || CATEGORY_STYLES.pengumuman;
                const coverUrl = newsService.getImageUrl(item.coverImage);
                const displayDate = item.publishedAt
                  ? new Date(item.publishedAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : new Date(item.createdAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    });

                return (
                  <Link
                    key={item.id}
                    to={`/berita/${item.slug}`}
                    className="bg-white dark:bg-card rounded-2xl border border-slate-100 dark:border-border/60 overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 hover:-translate-y-1.5 flex flex-col group"
                  >
                    {/* Cover Thumbnail */}
                    <div className="relative w-full h-52 bg-slate-100 dark:bg-muted overflow-hidden">
                      {coverUrl ? (
                        <img
                          src={coverUrl}
                          alt={item.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-muted-foreground/40 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-muted/40 dark:to-muted">
                          <Newspaper className="w-12 h-12" />
                        </div>
                      )}

                      <div className="absolute top-3 left-3">
                        <span
                          className={cn(
                            "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-md shadow-xs border",
                            catStyle.bg,
                            catStyle.text,
                            catStyle.border
                          )}
                        >
                          {CATEGORY_LABELS[item.category] || item.category}
                        </span>
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                      <div className="space-y-2">
                        {/* Meta */}
                        <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{displayDate}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5" />
                            <span>{item.views.toLocaleString("id-ID")}</span>
                          </div>
                        </div>

                        {/* Title */}
                        <h2 className="font-bold text-base sm:text-lg text-slate-900 dark:text-foreground group-hover:text-[#9D171D] dark:group-hover:text-red-400 transition-colors line-clamp-2 leading-snug">
                          {item.title}
                        </h2>

                        {/* Excerpt */}
                        {item.excerpt && (
                          <p className="text-xs sm:text-sm text-slate-500 dark:text-muted-foreground line-clamp-3 leading-relaxed">
                            {item.excerpt}
                          </p>
                        )}
                      </div>

                      {/* Footer Link */}
                      <div className="pt-3 border-t border-slate-100 dark:border-border/60 flex items-center justify-between text-xs font-bold text-[#9D171D] dark:text-red-400">
                        <span>Baca Selengkapnya</span>
                        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-12">
              <button
                disabled={page <= 1}
                onClick={() => {
                  const newPage = Math.max(1, page - 1);
                  setPage(newPage);
                  const p = new URLSearchParams(searchParams);
                  p.set("page", newPage.toString());
                  setSearchParams(p);
                  window.scrollTo({ top: 300, behavior: "smooth" });
                }}
                className="p-2 rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-card disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-muted transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-xs font-semibold text-slate-600 dark:text-muted-foreground px-3">
                Halaman {page} dari {totalPages}
              </span>

              <button
                disabled={page >= totalPages}
                onClick={() => {
                  const newPage = Math.min(totalPages, page + 1);
                  setPage(newPage);
                  const p = new URLSearchParams(searchParams);
                  p.set("page", newPage.toString());
                  setSearchParams(p);
                  window.scrollTo({ top: 300, behavior: "smooth" });
                }}
                className="p-2 rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-card disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-muted transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
