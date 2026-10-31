import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { ArrowRight, Heart, Search, BookMarked, ChevronLeft, ChevronRight } from "lucide-react";
import { useBookList } from "../hooks/useBookList";
import type { Bibliography, LibraryUser } from "../types";
import { generateColorFromSeed } from "@/utils/format";
import { isBookSaved, saveBook, removeBook } from "@/utils/bookmarks";
import { useToast } from "@/hooks/useToast";

interface BookListProps {
  searchQuery?: string;
  searchType?: string;
  availabilityFilter?: string[];
  yearRange?: { start: string; end: string };
  collectionTypeFilter?: string[];
  currentUser?: LibraryUser | null;
  selectedFaculty?: string;
  selectedStudyProgram?: string;
  onCountsChange?: (counts: { physical: number; ebook: number }) => void;
  onRecommendClick?: () => void;
}

const BookList = ({
  searchQuery = "",
  searchType = "all",
  availabilityFilter = [],
  yearRange = { start: "", end: "" },
  collectionTypeFilter = ["physical_book"],
  currentUser = null,
  selectedFaculty = "",
  selectedStudyProgram = "",
  onCountsChange,
  onRecommendClick,
}: BookListProps) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { success: toastSuccess, info: toastInfo } = useToast();

  const { bibliographies, loading, error } = useBookList(
    currentUser ?? null
  );

  const containerRef = useRef<HTMLDivElement>(null);

  // Pagination State - 12 buku per halaman (pas untuk grid 3 baris x 4 kolom)
  const itemsPerPage = 12;
  const pageParam = searchParams.get("page");
  const parsedPage = pageParam ? parseInt(pageParam, 10) : 1;
  const initialPage = isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
  const [currentPage, setCurrentPage] = useState(initialPage);

  // Sinkronisasi dengan URL query param `page` jika berubah (misal tombol Back/Forward browser)
  useEffect(() => {
    const pageFromUrl = searchParams.get("page");
    const p = pageFromUrl ? parseInt(pageFromUrl, 10) : 1;
    const validPage = isNaN(p) || p < 1 ? 1 : p;
    setCurrentPage(validPage);
  }, [searchParams]);

  // Status bookmark per buku
  const [savedMap, setSavedMap] = useState<Record<string, boolean>>({});

  // Lacak jumlah koleksi agar callback ke parent hanya dipanggil jika nilai berubah
  const lastCountsRef = useRef<{ physical: number; ebook: number } | null>(null);

  useEffect(() => {
    if (bibliographies.length > 0) {
      const physical = bibliographies.filter(
        (b) => (b.type || "physical_book") === "physical_book"
      ).length;
      const ebook = bibliographies.filter((b) => b.type === "ebook").length;

      if (
        !lastCountsRef.current ||
        lastCountsRef.current.physical !== physical ||
        lastCountsRef.current.ebook !== ebook
      ) {
        lastCountsRef.current = { physical, ebook };
        onCountsChange?.({ physical, ebook });
      }
    }
  }, [bibliographies, onCountsChange]);

  // Sinkronisasi status bookmark
  useEffect(() => {
    const checkBookmarks = () => {
      const map: Record<string, boolean> = {};
      bibliographies.forEach((b) => {
        if (b.id) {
          map[b.id] = isBookSaved(b.id, currentUser?.id);
        }
      });
      setSavedMap(map);
    };

    checkBookmarks();
    window.addEventListener("storage", checkBookmarks);
    return () => window.removeEventListener("storage", checkBookmarks);
  }, [bibliographies, currentUser?.id]);

  // Reset page ke halaman 1 saat filter pencarian/kategori berubah
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
      const params = new URLSearchParams(searchParams);
      if (params.has("page")) {
        params.delete("page");
        setSearchParams(params, { replace: true });
      }
    }
  }, [
    searchQuery,
    searchType,
    availabilityFilter,
    yearRange,
    collectionTypeFilter,
    selectedFaculty,
    selectedStudyProgram,
  ]);

  // Helper status ketersediaan riil
  const getBookStatus = (bibliography: Bibliography): "available" | "borrowed" => {
    if (bibliography.type === "ebook") return "available";

    if (bibliography.items && bibliography.items.length > 0) {
      const availableItems = bibliography.items.filter((i) => i.status === "available");
      if (availableItems.length > 0) return "available";

      const loanedItems = bibliography.items.filter((i) => i.status === "loaned");
      if (loanedItems.length > 0) return "borrowed";

      return "borrowed";
    }

    if (typeof bibliography.stock === "number") {
      return bibliography.stock > 0 ? "available" : "borrowed";
    }

    return "available";
  };

  // Toggle bookmark / simpan buku
  const handleToggleBookmark = (e: React.MouseEvent, bookId: string) => {
    e.stopPropagation();
    if (!currentUser?.id) {
      toastInfo("Perlu Masuk", "Silakan login terlebih dahulu untuk menyimpan buku.");
      return;
    }

    const isSaved = savedMap[bookId];
    if (isSaved) {
      removeBook(bookId, currentUser.id);
      toastInfo("Buku Dihapus", "Buku telah dihapus dari daftar simpanan.");
    } else {
      saveBook(bookId, currentUser.id);
      toastSuccess("Buku Disimpan", "Buku berhasil disimpan ke daftar simpanan.");
    }
  };

  // Filter 1: Jenis Koleksi (Buku Fisik / E-Book)
  const filteredByType = bibliographies.filter((b) => {
    if (collectionTypeFilter.length === 0) return true;
    const type = b.type || "physical_book";
    return collectionTypeFilter.includes(type);
  });

  // Filter 2: Search Query
  const filteredBySearch = filteredByType.filter((bibliography) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();
    const title = (bibliography.title || "").toLowerCase();
    const author = (bibliography.author || "").toLowerCase();
    const publisher = (bibliography.publisher || "").toLowerCase();
    const isbn = (bibliography.isbn || "").toLowerCase();
    const hasSubject = Array.isArray(bibliography.subjects)
      ? bibliography.subjects.some((s) => (s?.name || "").toLowerCase().includes(query))
      : false;

    switch (searchType) {
      case "title":
        return title.includes(query);
      case "author":
        return author.includes(query);
      case "isbn":
        return isbn.includes(query);
      case "subject":
        return hasSubject;
      case "all":
      default:
        return (
          title.includes(query) ||
          author.includes(query) ||
          isbn.includes(query) ||
          publisher.includes(query) ||
          hasSubject
        );
    }
  });

  // Filter 3: Ketersediaan (Tersedia / Dipinjam)
  const filteredByAvailability =
    availabilityFilter.length > 0
      ? filteredBySearch.filter((bibliography) => {
          const status = getBookStatus(bibliography);
          return availabilityFilter.includes(status);
        })
      : filteredBySearch;

  // Filter 4: Tahun Terbit
  const filteredByYear = filteredByAvailability.filter((bibliography) => {
    if (!yearRange.start && !yearRange.end) return true;
    const year = Number(bibliography.publicationYear);
    if (!year) return true;

    const start = yearRange.start ? parseInt(yearRange.start) : 0;
    const end = yearRange.end ? parseInt(yearRange.end) : 9999;
    return year >= start && year <= end;
  });

  // Filter 5: Fakultas
  const filteredByFaculty = selectedFaculty
    ? filteredByYear.filter(
        (bib) =>
          bib.faculties?.some(
            (f: any) => String(f.id || f.facultyId) === selectedFaculty
          ) ||
          bib.studyPrograms?.some(
            (sp: any) =>
              String(sp.facultyId || sp.faculty?.id) === selectedFaculty
          )
      )
    : filteredByYear;

  // Filter 6: Program Studi (Prodi)
  const filteredByStudyProgram = selectedStudyProgram
    ? filteredByFaculty.filter((bib) =>
        bib.studyPrograms?.some(
          (sp: any) =>
            String(sp.id || sp.studyProgramId || sp.studyProgram?.id) ===
            selectedStudyProgram
        )
      )
    : filteredByFaculty;

  // Pagination
  const totalItems = filteredByStudyProgram.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const indexOfLastItem = safeCurrentPage * itemsPerPage;
  const indexOfFirstItem = (safeCurrentPage - 1) * itemsPerPage;
  const currentItems = filteredByStudyProgram.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (pageNumber: number) => {
    const targetPage = Math.max(1, Math.min(pageNumber, totalPages));
    setCurrentPage(targetPage);

    // Sinkronkan ke URL query param
    const params = new URLSearchParams(searchParams);
    if (targetPage > 1) {
      params.set("page", String(targetPage));
    } else {
      params.delete("page");
    }
    setSearchParams(params);

    // Smooth scroll ke atas kontainer daftar buku
    if (containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.scrollTo({ top: 350, behavior: "smooth" });
    }
  };

  // Generate nomor halaman pagination pintar (1, 2, 3, 4 ... N)
  const getPaginationPages = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | "...")[] = [];
    if (safeCurrentPage <= 4) {
      pages.push(1, 2, 3, 4, 5, "...", totalPages);
    } else if (safeCurrentPage >= totalPages - 3) {
      pages.push(1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, "...", safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1, "...", totalPages);
    }
    return pages;
  };

  const handleBookClick = (bibliographyId: string) => {
    navigate(`/katalog/${bibliographyId}`);
  };

  if (loading) {
    return (
      <div className="w-full">
        <div className="h-6 w-56 bg-slate-200 dark:bg-muted rounded-md animate-pulse mb-6" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-card rounded-2xl p-3 border border-slate-100 dark:border-border/60 shadow-xs animate-pulse"
            >
              <div className="aspect-[4/5] bg-slate-200 dark:bg-muted rounded-xl mb-3" />
              <div className="h-4 bg-slate-200 dark:bg-muted rounded w-3/4 mb-2" />
              <div className="h-3 bg-slate-100 dark:bg-muted/70 rounded w-1/2 mb-3" />
              <div className="flex gap-1.5 mb-4">
                <div className="h-4 bg-slate-100 dark:bg-muted rounded w-12" />
                <div className="h-4 bg-slate-100 dark:bg-muted rounded w-14" />
              </div>
              <div className="h-8 bg-slate-100 dark:bg-muted rounded-lg w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full bg-white dark:bg-card border border-slate-100 dark:border-border/60 rounded-2xl p-8 text-center shadow-sm">
        <p className="text-red-600 font-bold mb-2">Terjadi kesalahan</p>
        <p className="text-slate-500 text-sm mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-5 py-2 bg-[#9D171D] text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-[#7f1318] transition-colors"
        >
          Muat Ulang
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full space-y-6 scroll-mt-24">
      {/* Header Total Hasil Pencarian & Indikator Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-foreground">
          {totalItems > 0 ? (
            <>
              Menampilkan{" "}
              <span className="text-[#9D171D]">
                {indexOfFirstItem + 1}–{Math.min(indexOfLastItem, totalItems)}
              </span>{" "}
              dari <span className="text-[#9D171D]">{totalItems}</span> koleksi
            </>
          ) : (
            "Tidak ada koleksi ditemukan"
          )}
        </h2>
        {totalPages > 1 && (
          <span className="text-xs text-slate-500 dark:text-muted-foreground font-medium">
            Halaman <span className="font-bold text-slate-800 dark:text-foreground">{safeCurrentPage}</span> dari{" "}
            <span className="font-bold text-slate-800 dark:text-foreground">{totalPages}</span>
          </span>
        )}
      </div>

      {/* Grid Katalog Buku (4 Kolom Sesuai Referensi) */}
      {currentItems.length === 0 ? (
        <div className="bg-white dark:bg-card border border-slate-100 dark:border-border/60 rounded-2xl p-12 text-center shadow-sm flex flex-col items-center justify-center">
          <Search className="w-10 h-10 text-slate-300 dark:text-muted-foreground mb-3" />
          <p className="text-base font-bold text-slate-900 dark:text-foreground mb-1">
            Tidak ada koleksi ditemukan
          </p>
          <p className="text-xs text-slate-400 mb-4">
            Coba ubah kata kunci pencarian atau sesuaikan filter di sebelah kiri
          </p>
          {(currentUser?.role === "lecturer" || currentUser?.role === "dosen") && onRecommendClick && (
            <div className="pt-4 border-t border-border/60 max-w-sm w-full flex flex-col items-center">
              <p className="text-xs font-semibold text-foreground mb-2.5">
                Buku yang Anda cari belum ada di perpustakaan?
              </p>
              <button
                type="button"
                onClick={onRecommendClick}
                className="inline-flex items-center gap-1.5 bg-primary text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-primary/90 transition-all cursor-pointer shadow-xs"
              >
                <BookMarked size={14} />
                <span>Usulkan Pengadaan Buku</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
          {currentItems.map((bibliography) => {
            const status = getBookStatus(bibliography);
            const isEbook = bibliography.type === "ebook";
            const seedColor = generateColorFromSeed(bibliography.id || bibliography.title);
            const isSaved = !!savedMap[bibliography.id];

            // Category tags
            const tags: string[] = [];
            if (Array.isArray(bibliography.subjects) && bibliography.subjects.length > 0) {
              bibliography.subjects.slice(0, 2).forEach((s) => {
                if (s?.name) tags.push(s.name);
              });
            }
            if (tags.length === 0) {
              tags.push(isEbook ? "E-Book" : "Umum");
            }

            return (
              <div
                key={bibliography.id}
                onClick={() => handleBookClick(bibliography.id)}
                className="bg-white dark:bg-card rounded-2xl p-2.5 sm:p-3 md:p-3.5 border border-slate-100 dark:border-border/60 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group cursor-pointer"
              >
                <div>
                  {/* Bagian Cover Buku & Badge Mengambang */}
                  <div className="relative w-full aspect-[4/5] rounded-xl overflow-hidden bg-slate-100 dark:bg-muted">
                    {bibliography.image ? (
                      <img
                        src={bibliography.image}
                        alt={bibliography.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    ) : (
                      <div
                        className={`w-full h-full bg-gradient-to-br ${seedColor} p-2.5 sm:p-4 flex flex-col justify-between text-white shadow-inner`}
                      >
                        <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-white/60">
                          {isEbook ? "E-Book" : "UMC Library"}
                        </span>
                        <span className="font-bold text-[11px] sm:text-xs md:text-sm text-center leading-snug line-clamp-3 my-auto">
                          {bibliography.title}
                        </span>
                        <span className="text-[8px] sm:text-[9px] text-white/70 line-clamp-1 text-right">
                          {bibliography.author}
                        </span>
                      </div>
                    )}

                    {/* Status Badge Mengambang di Pojok Kanan Atas Cover */}
                    <div className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5 z-10">
                      {status === "available" ? (
                        <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-semibold bg-emerald-50/95 backdrop-blur-xs text-emerald-600 border border-emerald-100/90 shadow-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Tersedia
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-semibold bg-blue-50/95 backdrop-blur-xs text-blue-600 border border-blue-100/90 shadow-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                          Dipinjam
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Informasi Buku */}
                  <div className="mt-2.5 sm:mt-3">
                    <h3
                      title={bibliography.title}
                      className="font-bold text-slate-900 dark:text-foreground text-[13px] sm:text-[14px] md:text-[15px] leading-snug line-clamp-1 group-hover:text-[#9D171D] transition-colors"
                    >
                      {bibliography.title}
                    </h3>
                    <p className="text-[11px] sm:text-xs text-slate-400 dark:text-slate-400 font-normal line-clamp-1 mt-0.5">
                      {bibliography.author || "Penulis Tidak Diketahui"}
                    </p>

                    {/* Kategori / Tags */}
                    <div className="flex flex-wrap gap-1 sm:gap-1.5 mt-2">
                      {tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="text-[9px] sm:text-[10px] md:text-[11px] font-medium px-1.5 py-0.5 sm:px-2 rounded-md bg-slate-100 dark:bg-muted text-slate-600 dark:text-slate-300"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Tombol Aksi di Bagian Bawah Kartu */}
                <div className="mt-3 sm:mt-3.5 pt-2 flex items-center justify-between gap-1.5 sm:gap-2 border-t border-slate-50 dark:border-border/30">
                  {/* Tombol Favorit / Heart */}
                  <button
                    type="button"
                    onClick={(e) => handleToggleBookmark(e, bibliography.id)}
                    className="p-1 sm:p-1.5 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50/60 transition-colors shrink-0 cursor-pointer"
                    aria-label="Simpan buku"
                  >
                    <Heart
                      size={16}
                      className={`sm:w-[18px] sm:h-[18px] ${
                        isSaved
                          ? "fill-red-500 text-red-500"
                          : "transition-transform hover:scale-110"
                      }`}
                    />
                  </button>

                  {/* Tombol Aksi: Lihat Detail / Lakukan Reservasi */}
                  {status === "available" ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBookClick(bibliography.id);
                      }}
                      className="flex-1 min-w-0 inline-flex items-center justify-center gap-1 sm:gap-1.5 py-1.5 px-2 sm:px-3 rounded-lg text-[10px] sm:text-[11px] font-bold text-[#9D171D] bg-[#FDF2F2] hover:bg-[#FCE8E8] transition-colors uppercase tracking-wider cursor-pointer"
                    >
                      <span className="truncate">LIHAT DETAIL</span>
                      <ArrowRight size={12} className="shrink-0 sm:w-[13px] sm:h-[13px]" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBookClick(bibliography.id);
                      }}
                      className="flex-1 min-w-0 inline-flex items-center justify-center gap-1 sm:gap-1.5 py-1.5 px-2 sm:px-3 rounded-lg text-[10px] sm:text-[11px] font-bold text-[#9D171D] bg-[#FDF2F2] hover:bg-[#FCE8E8] transition-colors cursor-pointer"
                    >
                      <span className="truncate">Lakukan Reservasi</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Navigasi */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-100 dark:border-border/60">
          <p className="text-xs text-slate-500 dark:text-muted-foreground font-medium order-2 sm:order-1">
            Menampilkan{" "}
            <span className="font-bold text-slate-900 dark:text-foreground">
              {totalItems === 0 ? 0 : indexOfFirstItem + 1}–{Math.min(indexOfLastItem, totalItems)}
            </span>{" "}
            dari{" "}
            <span className="font-bold text-slate-900 dark:text-foreground">
              {totalItems}
            </span>{" "}
            buku
          </p>

          <nav
            aria-label="Navigasi Halaman Katalog"
            className="flex items-center gap-1.5 flex-wrap justify-center order-1 sm:order-2"
          >
            {/* Tombol Sebelumnya */}
            <button
              type="button"
              onClick={() => handlePageChange(safeCurrentPage - 1)}
              disabled={safeCurrentPage === 1}
              className="inline-flex items-center gap-1 h-9 px-3 border border-slate-200 dark:border-border bg-white dark:bg-card rounded-xl text-xs font-semibold text-slate-700 dark:text-foreground hover:bg-slate-50 dark:hover:bg-muted disabled:opacity-40 disabled:pointer-events-none transition-all shadow-xs cursor-pointer"
              aria-label="Halaman Sebelumnya"
            >
              <ChevronLeft size={16} />
              <span className="hidden sm:inline">Sebelumnya</span>
            </button>

            {/* Tombol Nomor Halaman (1, 2, 3, 4 ...) */}
            {getPaginationPages().map((item, index) => {
              if (item === "...") {
                return (
                  <span
                    key={`ellipsis-${index}`}
                    className="w-9 h-9 flex items-center justify-center text-slate-400 select-none text-xs font-bold"
                  >
                    ...
                  </span>
                );
              }

              const pageNum = item as number;
              const isActive = safeCurrentPage === pageNum;

              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => handlePageChange(pageNum)}
                  aria-current={isActive ? "page" : undefined}
                  aria-label={`Halaman ${pageNum}`}
                  className={`w-9 h-9 rounded-xl font-bold transition-all text-xs cursor-pointer flex items-center justify-center ${
                    isActive
                      ? "bg-[#9D171D] text-white shadow-sm shadow-[#9D171D]/25 border border-[#9D171D]"
                      : "bg-white dark:bg-card border border-slate-200 dark:border-border hover:bg-slate-50 dark:hover:bg-muted text-slate-700 dark:text-foreground"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            {/* Tombol Selanjutnya */}
            <button
              type="button"
              onClick={() => handlePageChange(safeCurrentPage + 1)}
              disabled={safeCurrentPage === totalPages}
              className="inline-flex items-center gap-1 h-9 px-3 border border-slate-200 dark:border-border bg-white dark:bg-card rounded-xl text-xs font-semibold text-slate-700 dark:text-foreground hover:bg-slate-50 dark:hover:bg-muted disabled:opacity-40 disabled:pointer-events-none transition-all shadow-xs cursor-pointer"
              aria-label="Halaman Selanjutnya"
            >
              <span className="hidden sm:inline">Selanjutnya</span>
              <ChevronRight size={16} />
            </button>
          </nav>
        </div>
      )}
    </div>
  );
};

export default BookList;