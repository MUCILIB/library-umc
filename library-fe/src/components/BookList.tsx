import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { ArrowRight, Calendar, Search } from "lucide-react";
import { useBookList } from "../hooks/useBookList";
import type { Bibliography, LibraryUser } from "../types";
import { generateColorFromSeed } from "@/utils/format";

interface BookListProps {
  searchQuery?: string;
  searchType?: string;
  availabilityFilter?: string[];
  yearRange?: { start: string; end: string };
  currentUser?: LibraryUser | null;
  selectedFaculty?: string;
}

const BookList = ({
  searchQuery = "",
  searchType = "all",
  availabilityFilter = [],
  yearRange = { start: "", end: "" },
  currentUser = null,
  selectedFaculty = "",
}: BookListProps) => {
  const navigate = useNavigate();

  // ✅ Semua fetching dipindahkan ke custom hook
  const { bibliographies, userReservations, loading, error } = useBookList(
    currentUser ?? null,
  );
  const [activeTab, setActiveTab] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, searchType, availabilityFilter, yearRange, activeTab]);

  // Helper: Cek apakah user sedang meminjam buku ini
  const isUserBorrowing = (bibliographyId: string): boolean => {
    return userReservations.some(
      (res) =>
        res.bibliographyId === bibliographyId &&
        (res.status === "fulfilled" || res.status === "waiting"),
    );
  };

  // Helper: Dapatkan status ketersediaan riil buku
  const getBookStatus = (bibliography: Bibliography): "available" | "borrowed" | "empty" => {
    if (bibliography.items && bibliography.items.length > 0) {
      const availableItems = bibliography.items.filter(
        (i) => i.status === "available",
      );
      if (availableItems.length > 0) {
        return "available";
      }

      const loanedItems = bibliography.items.filter(
        (i) => i.status === "loaned",
      );
      if (loanedItems.length > 0) {
        return "borrowed";
      }

      return "empty";
    }

    if (typeof bibliography.stock === "number") {
      return bibliography.stock > 0 ? "available" : "empty";
    }

    return "available";
  };

  // Filter berdasarkan tab
  const filteredByTab = bibliographies.filter((bibliography) => {
    if (activeTab === 0) {
      return bibliography.type === "physical_book";
    } else {
      return bibliography.type === "ebook";
    }
  });

  // Filter berdasarkan search query
  const filteredBySearch = filteredByTab.filter((bibliography) => {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();

    switch (searchType) {
      case "title":
        return bibliography.title.toLowerCase().includes(query);
      case "author":
        return bibliography.author.toLowerCase().includes(query);
      case "isbn":
        return bibliography.isbn?.toLowerCase().includes(query);
      case "subject":
        return bibliography.subjects?.some((s) => s.name.toLowerCase().includes(query)) || false;
      case "all":
      default:
        return (
          bibliography.title.toLowerCase().includes(query) ||
          bibliography.author.toLowerCase().includes(query) ||
          bibliography.isbn?.toLowerCase().includes(query) ||
          bibliography.publisher.toLowerCase().includes(query) ||
          bibliography.subjects?.some((s) => s.name.toLowerCase().includes(query)) || false
        );
    }
  });

  // Filter berdasarkan ketersediaan (dari filter sidebar)
  const filteredByAvailability =
    availabilityFilter.length > 0
      ? filteredBySearch.filter((bibliography) => {
          const bookStatus = getBookStatus(bibliography);
          return availabilityFilter.includes(bookStatus);
        })
      : filteredBySearch;

  // Filter berdasarkan tahun terbit
  const filteredByYear = filteredByAvailability.filter((bibliography) => {
    if (!yearRange.start && !yearRange.end) return true;

    const year = bibliography.publicationYear;
    const start = yearRange.start ? parseInt(yearRange.start) : 0;
    const end = yearRange.end ? parseInt(yearRange.end) : 9999;

    return Number(year) >= Number(start) && Number(year) <= Number(end);
  });

  // Filter berdasarkan fakultas
  const filteredByFaculty = selectedFaculty
    ? filteredByYear.filter((bib) =>
        bib.faculties?.some((f) => String(f.id) === selectedFaculty)
      )
    : filteredByYear;

  // Pagination Logic
  const totalItems = filteredByFaculty.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredByFaculty.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Helper: Status badge configuration (background, text, dot, label)
  const getStatusBadgeConfig = (bibliography: Bibliography) => {
    if (currentUser && isUserBorrowing(bibliography.id)) {
      const reservation = userReservations.find(
        (r) => r.bibliographyId === bibliography.id,
      );
      if (reservation?.status === "waiting") {
        return {
          bg: "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800/30",
          text: "text-yellow-700 dark:text-yellow-400",
          dot: "bg-yellow-500",
          label: "Menunggu Konfirmasi",
        };
      } else if (reservation?.status === "fulfilled") {
        return {
          bg: "bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800/30",
          text: "text-purple-700 dark:text-purple-400",
          dot: "bg-purple-500",
          label: "Sedang Anda Pinjam",
        };
      }
    }
    const status = getBookStatus(bibliography);
    if (status === "available") {
      return {
        bg: "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800/30",
        text: "text-green-700 dark:text-green-400",
        dot: "bg-green-500",
        label: "Tersedia",
      };
    }
    if (status === "borrowed") {
      return {
        bg: "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/30",
        text: "text-blue-700 dark:text-blue-400",
        dot: "bg-blue-500",
        label: "Dipinjam",
      };
    }
    return {
      bg: "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/30",
      text: "text-red-700 dark:text-red-400",
      dot: "bg-red-500",
      label: "Stok Kosong",
    };
  };

  // Navigasi ke detail
  const handleBookClick = (bibliographyId: string) => {
    navigate(`/katalog/${bibliographyId}`);
  };

  if (loading) {
    return (
      <div className="w-full max-w-6xl mx-auto bg-card border border-border rounded-2xl p-6 shadow-sm">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Memuat data koleksi...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-6xl mx-auto bg-card border border-border rounded-2xl p-6 shadow-sm">
        <div className="text-center py-12">
          <div className="text-5xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-primary mb-2">Error</h3>
          <p className="text-foreground mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition text-sm"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-5">
      {/* Header & Tabs */}
      <div className="bg-card border border-border rounded-2xl p-4 md:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
        <div className="w-full sm:w-auto">
          <p className="text-sm font-bold text-foreground">
            Menampilkan {totalItems} hasil pencarian
          </p>
          {currentUser && (
            <p className="text-xs text-primary font-medium mt-1">
              Anda sedang meminjam{" "}
              {userReservations.filter((r) => r.status === "fulfilled").length}{" "}
              buku
              {userReservations.some((r) => r.status === "waiting") &&
                `, ${userReservations.filter((r) => r.status === "waiting").length} menunggu konfirmasi`}
            </p>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border w-full sm:w-auto overflow-x-auto whitespace-nowrap sm:border-none gap-2">
          {["Buku Fisik", "E-Book"].map((tab, index) => (
            <button
              key={index}
              onClick={() => {
                setActiveTab(index);
                setCurrentPage(1);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === index
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Book List Stack */}
      <div className="flex flex-col gap-4">
        {currentItems.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl text-center py-16 text-muted-foreground shadow-sm flex flex-col items-center justify-center">
            <Search className="w-10 h-10 mb-4 opacity-40 text-muted-foreground" />
            <p className="text-lg font-bold text-foreground mb-2">
              Tidak ada hasil ditemukan
            </p>
            <p className="text-sm">
              Coba ubah kata kunci pencarian atau filter lainnya
            </p>
          </div>
        ) : (
          currentItems.map((bibliography) => {
            const config = getStatusBadgeConfig(bibliography);
            const isEbook = bibliography.type === "ebook";
            const actionLabel = getBookStatus(bibliography) === "borrowed" && !isEbook
              ? "LAKUKAN RESERVASI" 
              : "LIHAT DETAIL";
            const showCalendarIcon = getBookStatus(bibliography) === "borrowed" && !isEbook;
            const seedColor = generateColorFromSeed(bibliography.id);

            return (
              <div
                key={bibliography.id}
                onClick={() => handleBookClick(bibliography.id)}
                className="bg-card hover:bg-card/90 border border-border rounded-2xl p-4 sm:p-5 md:p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-row gap-4 sm:gap-5 md:gap-6 cursor-pointer group hover:-translate-y-0.5"
              >
                {/* Cover Image on the Left */}
                <div className="shrink-0 w-24 h-36 sm:w-28 sm:h-40 rounded-xl overflow-hidden shadow-sm bg-muted border border-border/40 relative">
                  {bibliography.image ? (
                    <img
                      src={bibliography.image}
                      alt={bibliography.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${seedColor} flex flex-col justify-between p-3 text-white`}>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-white/50">
                        {isEbook ? "E-Book" : "Fisik"}
                      </span>
                      <span className="font-bold text-[11px] leading-tight italic line-clamp-3 text-center my-auto">
                        {bibliography.title}
                      </span>
                      <span className="text-[9px] text-white/40 line-clamp-1 text-right">
                        {bibliography.author}
                      </span>
                    </div>
                  )}
                </div>

                {/* Content on the Right */}
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div>
                    {/* Header Row: Title & Badge */}
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-2 mb-1.5">
                      <h3 className="font-bold text-foreground text-sm sm:text-base md:text-lg leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                        {bibliography.title}
                      </h3>
                      {/* Status Badge */}
                      <span className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-semibold border ${config.bg} ${config.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`}></span>
                        {config.label}
                      </span>
                    </div>

                    {/* Author Name */}
                    <p className="text-xs sm:text-sm text-muted-foreground font-medium mb-3">
                      {bibliography.author}
                    </p>

                    {/* Tags / Subjects */}
                    <div className="flex flex-wrap gap-1.5">
                      {bibliography.subjects && bibliography.subjects.length > 0 ? (
                        bibliography.subjects.slice(0, 3).map((sub) => (
                          <span
                            key={sub.id}
                            className="px-2.5 py-0.5 text-[9px] sm:text-[10px] bg-muted text-muted-foreground border border-border rounded-full font-medium"
                          >
                            {sub.name}
                          </span>
                        ))
                      ) : (
                        <span className="px-2.5 py-0.5 text-[9px] sm:text-[10px] bg-muted text-muted-foreground border border-border rounded-full font-medium">
                          Umum
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action Link Row */}
                  <div className="flex justify-end items-center mt-3">
                    <span className="text-primary font-bold text-xs sm:text-sm hover:underline flex items-center gap-1.5 group-hover:translate-x-0.5 transition-transform">
                      {actionLabel}
                      {showCalendarIcon ? (
                        <Calendar size={14} className="text-primary" />
                      ) : (
                        <ArrowRight size={14} className="text-primary" />
                      )}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-8">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="w-10 h-10 border border-border bg-card rounded-xl hover:bg-muted disabled:opacity-50 transition-all flex items-center justify-center font-bold text-foreground cursor-pointer"
          >
            &lt;
          </button>
          
          {[...Array(totalPages)].map((_, i) => {
            const pageNum = i + 1;
            if (
              totalPages > 7 &&
              pageNum !== 1 &&
              pageNum !== totalPages &&
              Math.abs(pageNum - currentPage) > 2
            ) {
              if (Math.abs(pageNum - currentPage) === 3) {
                return <span key={pageNum} className="px-1 text-muted-foreground">...</span>;
              }
              return null;
            }
            
            return (
              <button
                key={pageNum}
                onClick={() => handlePageChange(pageNum)}
                className={`w-10 h-10 rounded-xl font-bold transition-all cursor-pointer ${
                  currentPage === pageNum
                    ? "bg-primary text-white shadow-md"
                    : "bg-card border border-border hover:bg-muted text-foreground"
                }`}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="w-10 h-10 border border-border bg-card rounded-xl hover:bg-muted disabled:opacity-50 transition-all flex items-center justify-center font-bold text-foreground cursor-pointer"
          >
            &gt;
          </button>
        </div>
      )}
    </div>
  );
};

export default BookList;