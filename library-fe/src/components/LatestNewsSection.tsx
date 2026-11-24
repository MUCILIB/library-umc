import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  Newspaper,
  ArrowRight,
  Calendar,
  Eye,
  Sparkles,
} from "lucide-react";
import {
  newsService,
  type NewsItem,
  CATEGORY_LABELS,
  CATEGORY_STYLES,
} from "@/services/newsService";
import { cn } from "@/lib/utils";

export default function LatestNewsSection() {
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    newsService
      .getRecentNews(3)
      .then((data) => {
        if (isMounted) setNewsList(data);
      })
      .catch((err) => console.error("Error fetching recent news:", err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Jika tidak ada berita dan tidak sedang loading, jangan tampilkan seksi
  if (!loading && newsList.length === 0) {
    return null;
  }

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 dark:bg-red-950/40 text-[#9D171D] dark:text-red-400 border border-red-100 dark:border-red-900/40 mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Informasi & Pengumuman</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-foreground tracking-tight">
            Kabar Perpustakaan
          </h2>
          <p className="text-sm text-slate-500 dark:text-muted-foreground mt-1 max-w-xl">
            Ikuti informasi terkini, kegiatan literasi, agenda pelatihan, dan pengumuman resmi UPT Perpustakaan UMC.
          </p>
        </div>

        <Link
          to="/berita"
          className="inline-flex items-center gap-2 text-sm font-bold text-[#9D171D] hover:text-[#7f1318] dark:text-red-400 dark:hover:text-red-300 transition-colors group shrink-0"
        >
          <span>Lihat Semua Berita</span>
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>

      {/* Grid Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="bg-white dark:bg-card rounded-2xl border border-slate-100 dark:border-border/60 overflow-hidden shadow-xs animate-pulse p-4 space-y-4"
            >
              <div className="w-full h-44 bg-slate-200 dark:bg-muted rounded-xl" />
              <div className="w-24 h-5 bg-slate-200 dark:bg-muted rounded-full" />
              <div className="w-full h-6 bg-slate-200 dark:bg-muted rounded" />
              <div className="w-3/4 h-4 bg-slate-200 dark:bg-muted rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {newsList.map((item) => {
            const catStyle =
              CATEGORY_STYLES[item.category] || CATEGORY_STYLES.pengumuman;
            const coverUrl = newsService.getImageUrl(item.coverImage);
            const displayDate = item.publishedAt
              ? new Date(item.publishedAt).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
              : new Date(item.createdAt).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                });

            return (
              <Link
                key={item.id}
                to={`/berita/${item.slug}`}
                className="bg-white dark:bg-card rounded-2xl border border-slate-100 dark:border-border/60 overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 hover:-translate-y-1.5 flex flex-col group"
              >
                {/* Cover Image */}
                <div className="relative w-full h-48 bg-slate-100 dark:bg-muted overflow-hidden">
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

                  {/* Category Badge overlay */}
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

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    {/* Meta info */}
                    <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{displayDate}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" />
                        <span>{item.views.toLocaleString("id-ID")} views</span>
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-foreground group-hover:text-[#9D171D] dark:group-hover:text-red-400 transition-colors line-clamp-2 leading-snug">
                      {item.title}
                    </h3>

                    {/* Excerpt */}
                    {item.excerpt && (
                      <p className="text-xs sm:text-sm text-slate-500 dark:text-muted-foreground line-clamp-2 leading-relaxed">
                        {item.excerpt}
                      </p>
                    )}
                  </div>

                  {/* Read More Link */}
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
    </section>
  );
}
