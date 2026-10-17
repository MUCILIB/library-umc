import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router";
import { bibliographyApi, type Bibliography } from "@/api/client";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";

// Palet warna latar belakang cover sesuai desain referensi
const COVER_PALETTES = [
  "bg-[#5B6E64]", // Sage green (seperti The Psychology of Money)
  "bg-[#F5C518]", // Warm yellow (seperti How Innovation Works)
  "bg-[#3E1015]", // Deep burgundy / velvet red (seperti The Picture of Dorian Gray)
  "bg-[#3D3B35]", // Muted dark olive / charcoal (seperti Wuthering Heights)
  "bg-[#54626F]", // Slate grey-blue
  "bg-[#3D5348]", // Pine forest green (seperti The Fine Print)
  "bg-[#1E3A5F]", // Deep navy blue
  "bg-[#7C3A2D]", // Terracotta / warm rust
  "bg-[#4A3E56]", // Muted plum
  "bg-[#264653]", // Deep ocean teal
];

function getPalette(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % COVER_PALETTES.length;
  return COVER_PALETTES[index];
}

export default function HomeBookList() {
  const navigate = useNavigate();
  const [books, setBooks] = useState<Bibliography[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Drag-to-scroll states
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);
  const [hasDragged, setHasDragged] = useState(false);

  useEffect(() => {
    async function fetchLatestBooks() {
      try {
        setLoading(true);
        // Mengambil koleksi terbaru berdasarkan createdAt desc
        const response = await bibliographyApi.list({
          sort: "createdAt",
          order: "desc",
          limit: 20,
        });

        const items = response.data.items || [];
        if (items.length === 0) {
          // Fallback jika sort belum memiliki data
          const fallback = await bibliographyApi.list({ limit: 20 });
          setBooks(fallback.data.items || []);
        } else {
          setBooks(items);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Gagal memuat koleksi terbaru");
      } finally {
        setLoading(false);
      }
    }
    fetchLatestBooks();
  }, []);

  const checkScrollability = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScrollability();
    window.addEventListener("resize", checkScrollability);
    return () => window.removeEventListener("resize", checkScrollability);
  }, [books]);

  const handleScroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 340;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
      setTimeout(checkScrollability, 350);
    }
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setHasDragged(false);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeftState(scrollRef.current.scrollLeft);
  };

  const onMouseLeaveOrUp = () => {
    setIsDragging(false);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    if (Math.abs(walk) > 5) {
      setHasDragged(true);
    }
    scrollRef.current.scrollLeft = scrollLeftState - walk;
    checkScrollability();
  };

  const handleBookClick = (bibliographyId: string) => {
    if (hasDragged) return;
    navigate(`/katalog/${bibliographyId}`);
  };

  const getAuthorName = (book: Bibliography) => {
    if (book.authors && book.authors.length > 0) {
      return book.authors.map((a) => a.name).join(", ");
    }
    return book.sor || "Penulis Tidak Diketahui";
  };

  const getCategoryTags = (book: Bibliography) => {
    if (book.subjects && book.subjects.length > 0) {
      return book.subjects.slice(0, 2).map((s) => s.name);
    }
    if (book.faculties && book.faculties.length > 0) {
      return [book.faculties[0].name];
    }
    if (book.type === "ebook") {
      return ["E-Book", "Digital"];
    }
    return ["Umum"];
  };

  const getIsAvailable = (book: Bibliography) => {
    if (book.type === "ebook") return true;
    return (book.availableItems ?? book.stock ?? 0) > 0;
  };

  if (loading) {
    return (
      <section className="w-full bg-white dark:bg-card border border-slate-100 dark:border-border/60 rounded-3xl p-6 sm:p-8 md:p-10 shadow-sm relative">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-slate-200 dark:bg-muted rounded-lg animate-pulse" />
            <div className="h-4 w-72 bg-slate-100 dark:bg-muted/70 rounded-md animate-pulse" />
          </div>
          <div className="h-5 w-24 bg-slate-100 dark:bg-muted rounded animate-pulse" />
        </div>
        <div className="flex gap-4 sm:gap-5 md:gap-6 overflow-hidden">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="w-[185px] sm:w-[205px] md:w-[215px] shrink-0 bg-white dark:bg-card rounded-2xl border border-slate-100 dark:border-border/60 overflow-hidden shadow-xs animate-pulse"
            >
              <div className="h-48 sm:h-52 bg-slate-200 dark:bg-muted" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-slate-200 dark:bg-muted rounded w-3/4" />
                <div className="h-3 bg-slate-100 dark:bg-muted/60 rounded w-1/2" />
                <div className="flex gap-1.5">
                  <div className="h-4 bg-slate-100 dark:bg-muted rounded w-12" />
                  <div className="h-4 bg-slate-100 dark:bg-muted rounded w-14" />
                </div>
                <div className="h-6 bg-slate-100 dark:bg-muted rounded-full w-20 mt-2" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (error || books.length === 0) {
    return null;
  }

  return (
    <section className="w-full bg-white dark:bg-card border border-slate-100 dark:border-border/60 rounded-2xl sm:rounded-3xl p-4 sm:p-8 md:p-10 shadow-sm relative">
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* Header Koleksi Terbaru */}
      <div className="flex items-center justify-between gap-3 mb-4 sm:mb-8">
        <div>
          <h2 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-foreground tracking-tight">
            Koleksi Terbaru
          </h2>
          <p className="text-xs sm:text-base text-slate-400 dark:text-muted-foreground font-normal mt-0.5 sm:mt-1.5">
            Temukan buku-buku terbaru yang tersedia di perpustakaan UMC
          </p>
        </div>

        <Link
          to="/katalog"
          className="group inline-flex items-center gap-1 sm:gap-1.5 text-xs sm:text-base font-bold text-[#9D171D] hover:text-[#7f1318] transition-colors shrink-0"
        >
          <span>Lihat Semua</span>
          <ArrowRight
            size={16}
            className="sm:w-[18px] sm:h-[18px] group-hover:translate-x-1 transition-transform duration-200"
          />
        </Link>
      </div>

      {/* Carousel Container dengan Tombol Navigasi Kiri & Kanan */}
      <div className="relative">
        {/* Tombol Kiri (Desktop/Tablet) */}
        <button
          type="button"
          onClick={() => handleScroll("left")}
          disabled={!canScrollLeft}
          aria-label="Geser ke kiri"
          className={`hidden sm:flex absolute -left-3 sm:-left-5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white dark:bg-card border border-slate-200/80 dark:border-border shadow-md items-center justify-center text-slate-700 dark:text-foreground hover:bg-slate-50 dark:hover:bg-muted hover:shadow-lg transition-all active:scale-95 disabled:opacity-0 disabled:pointer-events-none cursor-pointer`}
        >
          <ChevronLeft size={20} strokeWidth={2.5} />
        </button>

        {/* Track Slider Carousel */}
        <div
          ref={scrollRef}
          onScroll={checkScrollability}
          onMouseDown={onMouseDown}
          onMouseLeave={onMouseLeaveOrUp}
          onMouseUp={onMouseLeaveOrUp}
          onMouseMove={onMouseMove}
          className={`flex gap-3 sm:gap-5 md:gap-6 overflow-x-auto scroll-smooth no-scrollbar py-2 px-0.5 select-none touch-pan-x ${
            isDragging ? "cursor-grabbing" : "cursor-default"
          }`}
        >
          {books.map((book) => {
            const author = getAuthorName(book);
            const tags = getCategoryTags(book);
            const isAvailable = getIsAvailable(book);
            const palette = getPalette(book.id || book.title);

            return (
              <div
                key={book.id}
                onClick={() => handleBookClick(book.id)}
                className="w-[165px] sm:w-[205px] md:w-[215px] shrink-0 bg-white dark:bg-card rounded-2xl border border-slate-100 dark:border-border/60 shadow-xs hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col overflow-hidden cursor-pointer group"
              >
                {/* Bagian Cover Buku dengan Palet Warna Menawan */}
                <div
                  className={`relative w-full h-42 sm:h-52 ${palette} overflow-hidden flex items-center justify-center p-3 sm:p-4 group-hover:brightness-105 transition-all`}
                >
                  {book.image ? (
                    <img
                      src={book.image}
                      alt={book.title}
                      className="h-full max-h-[88%] max-w-[85%] object-contain rounded-xs shadow-[0_8px_20px_rgba(0,0,0,0.35)] group-hover:scale-105 transition-transform duration-300 z-10"
                      loading="lazy"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = "none";
                      }}
                    />
                  ) : null}

                  {/* Fallback Mock Cover jika tidak ada cover gambar atau saat gagal muat */}
                  <div
                    className={`w-[105px] sm:w-[115px] h-[140px] sm:h-[152px] bg-white rounded-xs shadow-[0_8px_20px_rgba(0,0,0,0.35)] p-2.5 flex flex-col justify-between border-l-[3px] border-slate-200 group-hover:scale-105 transition-transform duration-300 ${
                      book.image ? "hidden" : "flex"
                    }`}
                  >
                    <div className="text-[7px] font-black uppercase tracking-wider text-slate-400">
                      {book.type === "ebook" ? "E-Book" : "UMC Library"}
                    </div>
                    <div className="text-[10px] sm:text-[11px] font-bold text-slate-900 line-clamp-3 leading-snug">
                      {book.title}
                    </div>
                    <div className="text-[8px] font-medium text-slate-500 line-clamp-1">
                      {author}
                    </div>
                  </div>
                </div>

                {/* Bagian Detail Buku */}
                <div className="p-3.5 sm:p-4 flex flex-col flex-1 justify-between gap-3 bg-white dark:bg-card">
                  <div>
                    <h3
                      title={book.title}
                      className="font-bold text-slate-900 dark:text-foreground text-[14px] sm:text-[15px] leading-snug line-clamp-2 group-hover:text-[#9D171D] transition-colors"
                    >
                      {book.title}
                    </h3>
                    <p className="text-xs text-slate-400 dark:text-slate-400 font-normal line-clamp-1 mt-1">
                      {author}
                    </p>

                    {/* Kategori / Subjects Tags */}
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] sm:text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-muted text-slate-600 dark:text-slate-300"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Status Ketersediaan */}
                  <div className="pt-1">
                    {isAvailable ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/40 w-fit">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Tersedia
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-800/40 w-fit">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                        Stok Kosong
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tombol Kanan (Desktop/Tablet) */}
        <button
          type="button"
          onClick={() => handleScroll("right")}
          disabled={!canScrollRight}
          aria-label="Geser ke kanan"
          className={`hidden sm:flex absolute -right-3 sm:-right-5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white dark:bg-card border border-slate-200/80 dark:border-border shadow-md items-center justify-center text-slate-700 dark:text-foreground hover:bg-slate-50 dark:hover:bg-muted hover:shadow-lg transition-all active:scale-95 disabled:opacity-0 disabled:pointer-events-none cursor-pointer`}
        >
          <ChevronRight size={20} strokeWidth={2.5} />
        </button>
      </div>
    </section>
  );
}
