import { useEffect, useState } from "react";
import { useParams, Link } from "react-router";
import Navbar from "@/components/ui/navbar";
import Footer from "@/components/Footer";
import {
  Calendar,
  Eye,
  Copy,
  ChevronRight,
  ArrowLeft,
  Newspaper,
  Sparkles,
  MessageCircle,
} from "lucide-react";
import {
  newsService,
  type NewsItem,
  CATEGORY_LABELS,
  CATEGORY_STYLES,
} from "@/services/newsService";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function BeritaDetailPage() {
  const { slug } = useParams<{ slug: string }>();

  const [item, setItem] = useState<NewsItem | null>(null);
  const [recentNews, setRecentNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;

    let isMounted = true;
    setLoading(true);
    setNotFound(false);

    // Fetch news detail by slug
    newsService
      .getNewsBySlug(slug)
      .then((data) => {
        if (!isMounted) return;
        setItem(data);
        document.title = `${data.title} - Perpustakaan UMC`;
      })
      .catch((err) => {
        console.error("Gagal mengambil berita:", err);
        if (isMounted) setNotFound(true);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    // Fetch recent news for sidebar
    newsService
      .getRecentNews(5)
      .then((recents) => {
        if (isMounted) setRecentNews(recents.filter((r) => r.slug !== slug));
      })
      .catch((err) => console.error("Error recents:", err));

    return () => {
      isMounted = false;
    };
  }, [slug]);

  // Copy link handler
  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Tautan artikel berhasil disalin ke clipboard!");
    }
  };

  // WhatsApp share handler
  const handleShareWA = () => {
    if (!item) return;
    const text = encodeURIComponent(
      `*${item.title}*\n\nBaca artikel selengkapnya di UPT Perpustakaan UMC:\n${window.location.href}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-[#F8FAFC] dark:bg-muted flex flex-col justify-between">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-16 w-full animate-pulse space-y-6">
          <div className="w-32 h-6 bg-slate-200 dark:bg-muted rounded-full" />
          <div className="w-full h-10 bg-slate-200 dark:bg-muted rounded" />
          <div className="w-2/3 h-6 bg-slate-200 dark:bg-muted rounded" />
          <div className="w-full h-80 bg-slate-200 dark:bg-muted rounded-2xl" />
        </div>
        <Footer />
      </div>
    );
  }

  if (notFound || !item) {
    return (
      <div className="w-full min-h-screen bg-[#F8FAFC] dark:bg-muted flex flex-col justify-between">
        <Navbar />
        <div className="max-w-md mx-auto px-4 py-20 text-center">
          <Newspaper className="w-16 h-16 text-slate-300 dark:text-muted-foreground/40 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-foreground">
            Artikel Tidak Ditemukan
          </h1>
          <p className="text-sm text-slate-500 dark:text-muted-foreground mt-2">
            Artikel berita yang Anda cari mungkin telah dihapus atau belum dipublikasikan.
          </p>
          <Link
            to="/berita"
            className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 bg-[#9D171D] text-white font-semibold text-xs rounded-xl hover:bg-[#801217] transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Kabar Perpustakaan</span>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const catStyle = CATEGORY_STYLES[item.category] || CATEGORY_STYLES.pengumuman;
  const coverUrl = newsService.getImageUrl(item.coverImage);
  const displayDate = item.publishedAt
    ? new Date(item.publishedAt).toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : new Date(item.createdAt).toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });

  return (
    <div className="w-full min-h-screen bg-[#F8FAFC] dark:bg-muted selection:bg-red-500/20 flex flex-col justify-between">
      <div>
        <Navbar />

        {/* Breadcrumb Bar */}
        <div className="bg-white dark:bg-card border-b border-slate-200 dark:border-border py-3">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-2 text-xs text-slate-500 dark:text-muted-foreground overflow-x-auto no-scrollbar">
            <Link to="/" className="hover:text-primary transition-colors shrink-0">
              Beranda
            </Link>
            <ChevronRight className="w-3.5 h-3.5 shrink-0 text-slate-400" />
            <Link to="/berita" className="hover:text-primary transition-colors shrink-0">
              Kabar Perpustakaan
            </Link>
            <ChevronRight className="w-3.5 h-3.5 shrink-0 text-slate-400" />
            <span className="text-primary font-medium truncate max-w-xs sm:max-w-md">
              {item.title}
            </span>
          </div>
        </div>

        {/* Content Container */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
            {/* Main Article Body (8 cols) */}
            <article className="lg:col-span-8 bg-white dark:bg-card rounded-2xl border border-slate-100 dark:border-border/60 p-6 sm:p-8 md:p-10 shadow-sm space-y-6">
              {/* Category Badge & Meta */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span
                  className={cn(
                    "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border",
                    catStyle.bg,
                    catStyle.text,
                    catStyle.border
                  )}
                >
                  {CATEGORY_LABELS[item.category] || item.category}
                </span>

                <div className="flex items-center gap-4 text-xs text-slate-400 dark:text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{displayDate}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5" />
                    <span>{item.views.toLocaleString("id-ID")} kali dibaca</span>
                  </div>
                </div>
              </div>

              {/* Main Headline */}
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-foreground tracking-tight leading-snug">
                {item.title}
              </h1>

              {/* Author Info */}
              <div className="flex items-center gap-3 py-3 border-y border-slate-100 dark:border-border/60">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/60 text-[#9D171D] dark:text-red-400 flex items-center justify-center font-bold text-sm">
                  {item.author?.name ? item.author.name.charAt(0).toUpperCase() : "U"}
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-foreground">
                    {item.author?.name || "UPT Perpustakaan UMC"}
                  </div>
                  <div className="text-xs text-slate-400 dark:text-muted-foreground">
                    {item.author?.email || "perpustakaan@umc.ac.id"}
                  </div>
                </div>
              </div>

              {/* Cover Image Banner */}
              {coverUrl && (
                <div className="w-full h-64 sm:h-80 md:h-96 rounded-2xl overflow-hidden bg-slate-100 dark:bg-muted border border-slate-100 dark:border-border/60">
                  <img
                    src={coverUrl}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Excerpt Lead */}
              {item.excerpt && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-muted/40 border-l-4 border-[#9D171D] text-slate-700 dark:text-slate-300 text-sm sm:text-base font-medium leading-relaxed italic">
                  {item.excerpt}
                </div>
              )}

              {/* Formatted HTML Content Body */}
              <div
                className={cn(
                  "prose prose-slate dark:prose-invert max-w-none text-slate-800 dark:text-slate-200",
                  "prose-headings:font-bold prose-headings:text-slate-900 dark:prose-headings:text-foreground",
                  "prose-h1:text-2xl sm:prose-h1:text-3xl prose-h2:text-xl sm:prose-h2:text-2xl prose-h3:text-lg",
                  "prose-p:leading-relaxed prose-p:text-sm sm:prose-p:text-base",
                  "prose-a:text-[#9D171D] dark:prose-a:text-red-400 prose-a:font-semibold hover:prose-a:underline",
                  "prose-img:rounded-xl prose-img:border prose-img:border-border prose-img:shadow-xs",
                  "prose-blockquote:border-l-4 prose-blockquote:border-[#9D171D] prose-blockquote:bg-muted/20 prose-blockquote:p-4 prose-blockquote:rounded-r-xl",
                  "prose-ul:list-disc prose-ol:list-decimal"
                )}
                dangerouslySetInnerHTML={{ __html: item.content }}
              />

              {/* Share Bar */}
              <div className="pt-6 border-t border-slate-100 dark:border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Bagikan Artikel:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyLink}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-border text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-muted transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin Tautan</span>
                  </button>
                  <button
                    onClick={handleShareWA}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#25D366] text-white text-xs font-semibold hover:bg-[#20ba59] transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>
                </div>
              </div>
            </article>

            {/* Sidebar Column (4 cols) */}
            <aside className="lg:col-span-4 space-y-6">
              {/* Other Recent News */}
              <div className="bg-white dark:bg-card rounded-2xl border border-slate-100 dark:border-border/60 p-6 shadow-sm">
                <div className="flex items-center gap-2 text-primary font-bold text-sm mb-4">
                  <Sparkles className="w-4 h-4" />
                  <span>Kabar Terbaru Lainnya</span>
                </div>

                {recentNews.length === 0 ? (
                  <p className="text-xs text-slate-400">Belum ada berita lainnya.</p>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-border/60">
                    {recentNews.map((rec) => {
                      const recCover = newsService.getImageUrl(rec.coverImage);
                      const recDate = rec.publishedAt
                        ? new Date(rec.publishedAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : new Date(rec.createdAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          });

                      return (
                        <Link
                          key={rec.id}
                          to={`/berita/${rec.slug}`}
                          className="py-3.5 first:pt-0 last:pb-0 flex items-start gap-3 group"
                        >
                          <div className="w-16 h-14 rounded-lg bg-slate-100 dark:bg-muted overflow-hidden shrink-0 border border-slate-100 dark:border-border/60">
                            {recCover ? (
                              <img
                                src={recCover}
                                alt={rec.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-300">
                                <Newspaper className="w-5 h-5" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-[10px] uppercase font-bold text-[#9D171D] dark:text-red-400">
                              {CATEGORY_LABELS[rec.category] || rec.category}
                            </span>
                            <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-foreground group-hover:text-[#9D171D] dark:group-hover:text-red-400 transition-colors line-clamp-2 leading-snug">
                              {rec.title}
                            </h4>
                            <span className="text-[10px] text-slate-400 dark:text-muted-foreground mt-0.5 block">
                              {recDate}
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}

                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-border/60 text-center">
                  <Link
                    to="/berita"
                    className="text-xs font-bold text-[#9D171D] hover:underline"
                  >
                    Lihat Semua Arsip Berita &rarr;
                  </Link>
                </div>
              </div>

              {/* Back button */}
              <Link
                to="/berita"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-slate-200 dark:border-border text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-card transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Kembali ke Indeks Berita</span>
              </Link>
            </aside>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
