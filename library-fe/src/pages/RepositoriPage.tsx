import { useState, useEffect, useMemo, type FormEvent } from "react";
import { Link } from "react-router";
import Navbar from "@/components/ui/navbar";
import Footer from "@/components/Footer";
import { repositoryService } from "@/services/repositoryService";
import { facultyApi, studyProgramApi, type Faculty, type StudyProgram } from "@/api/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  FileText,
  RotateCcw,
  X,
  Filter,
  User,
  GraduationCap,
  CheckCircle,
  AlertCircle,
  Calendar,
  FileCheck2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

interface FormattedRepositoryItem {
  id: string;
  proposalNumber?: string;
  title: string;
  author: string;
  authorNim?: string;
  department: string;
  faculty: string;
  abstract: string;
  category: string;
  categoryRaw: string;
  year: string;
  date: string;
  fileSize: string;
  pageCount?: number;
  keywords: string[];
}

const CATEGORY_MAP: Record<string, string> = {
  THESIS: "Skripsi",
  PROPOSAL: "Proposal Skripsi / TA",
  REPORT: "Laporan Riset / PKL",
};

const CATEGORY_OPTIONS = [
  { value: "ALL", label: "Semua Kategori" },
  { value: "THESIS", label: "Skripsi" },
  { value: "PROPOSAL", label: "Proposal Skripsi / TA" },
  { value: "REPORT", label: "Laporan Riset / PKL" },
];

export default function RepositoriPage() {
  // State Data
  const [items, setItems] = useState<FormattedRepositoryItem[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [studyPrograms, setStudyPrograms] = useState<StudyProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search State
  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [searchScope, setSearchScope] = useState<"all" | "title" | "author" | "keywords">("all");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedFacultyId, setSelectedFacultyId] = useState("ALL");
  const [selectedStudyProgramId, setSelectedStudyProgramId] = useState("ALL");
  const [yearStart, setYearStart] = useState("");
  const [yearEnd, setYearEnd] = useState("");
  const [sortBy, setSortBy] = useState<"date_desc" | "date_asc" | "title_asc">("date_desc");

  // Pagination & Layout
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const [showMobileFilter, setShowMobileFilter] = useState(false);

  // Ambil data naskah repositori dan master fakultas
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [publishedData, facRes] = await Promise.all([
        repositoryService.getPublishedProposals(),
        facultyApi.list().catch(() => ({ data: [] })),
      ]);

      if (facRes?.data) {
        setFaculties(facRes.data);
      }

      const formatted: FormattedRepositoryItem[] = publishedData.map((p) => {
        const createdDate = new Date(p.createdAt);
        return {
          id: p.id,
          proposalNumber: p.proposalNumber,
          title: p.title,
          author: p.authorName,
          authorNim: p.authorNim && p.authorNim !== "-" ? p.authorNim : undefined,
          department: p.studyProgram?.name || "Program Studi",
          faculty: p.studyProgram?.faculty?.name || "Universitas Muhammadiyah Cirebon",
          abstract: p.abstract || "Tidak ada ringkasan abstrak naskah yang disertakan.",
          category: CATEGORY_MAP[p.documentCategory] || p.documentCategory,
          categoryRaw: p.documentCategory,
          year: createdDate.getFullYear().toString(),
          date: createdDate.toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }),
          fileSize: p.fileSize ? `${(p.fileSize / (1024 * 1024)).toFixed(1)} MB` : "PDF Dokumen",
          pageCount: p.pageCount || undefined,
          keywords: p.keywords && p.keywords.length > 0 ? p.keywords : ["karya ilmiah", "umc"],
        };
      });

      setItems(formatted);
    } catch (err: any) {
      console.error("Gagal memuat repositori:", err);
      setError(err?.message || "Terjadi kesalahan saat menghubungi server repositori.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Muat prodi dinamis saat fakultas berubah
  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const facIdNum = selectedFacultyId !== "ALL" ? Number(selectedFacultyId) : undefined;
        const res = await studyProgramApi.list(facIdNum);
        if (res?.data) {
          setStudyPrograms(res.data);
        }
      } catch (err) {
        console.error("Gagal memuat program studi:", err);
      }
    };
    fetchPrograms();
    setSelectedStudyProgramId("ALL");
  }, [selectedFacultyId]);

  // Handle Search Submit
  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    setActiveSearch(searchInput.trim());
    setCurrentPage(1);
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearchInput("");
    setActiveSearch("");
    setSearchScope("all");
    setSelectedCategory("ALL");
    setSelectedFacultyId("ALL");
    setSelectedStudyProgramId("ALL");
    setYearStart("");
    setYearEnd("");
    setSortBy("date_desc");
    setCurrentPage(1);
  };

  // Filter Items
  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        // Filter Kata Kunci / Teks Pencarian
        if (activeSearch) {
          const q = activeSearch.toLowerCase();
          switch (searchScope) {
            case "title":
              return item.title.toLowerCase().includes(q);
            case "author":
              return (
                item.author.toLowerCase().includes(q) ||
                Boolean(item.authorNim && item.authorNim.toLowerCase().includes(q))
              );
            case "keywords":
              return item.keywords.some((k) => k.toLowerCase().includes(q));
            case "all":
            default:
              return (
                item.title.toLowerCase().includes(q) ||
                item.author.toLowerCase().includes(q) ||
                Boolean(item.authorNim && item.authorNim.toLowerCase().includes(q)) ||
                item.abstract.toLowerCase().includes(q) ||
                item.keywords.some((k) => k.toLowerCase().includes(q))
              );
          }
        }
        return true;
      })
      .filter((item) => {
        // Filter Kategori
        if (selectedCategory !== "ALL") {
          return item.categoryRaw === selectedCategory;
        }
        return true;
      })
      .filter((item) => {
        // Filter Fakultas
        if (selectedFacultyId !== "ALL") {
          const facultyObj = faculties.find((f) => f.id.toString() === selectedFacultyId);
          if (facultyObj) {
            return (
              item.faculty.toLowerCase().includes(facultyObj.name.toLowerCase()) ||
              facultyObj.name.toLowerCase().includes(item.faculty.toLowerCase())
            );
          }
        }
        return true;
      })
      .filter((item) => {
        // Filter Program Studi
        if (selectedStudyProgramId !== "ALL") {
          const prodiObj = studyPrograms.find((p) => p.id.toString() === selectedStudyProgramId);
          if (prodiObj) {
            return item.department.toLowerCase().includes(prodiObj.name.toLowerCase());
          }
        }
        return true;
      })
      .filter((item) => {
        // Filter Tahun
        const yr = parseInt(item.year, 10);
        const start = yearStart ? parseInt(yearStart, 10) : -Infinity;
        const end = yearEnd ? parseInt(yearEnd, 10) : Infinity;
        if (isNaN(yr)) return true;
        return yr >= start && yr <= end;
      })
      .sort((a, b) => {
        if (sortBy === "date_asc") {
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        }
        if (sortBy === "title_asc") {
          return a.title.localeCompare(b.title);
        }
        // default date_desc
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
  }, [
    items,
    activeSearch,
    searchScope,
    selectedCategory,
    selectedFacultyId,
    selectedStudyProgramId,
    yearStart,
    yearEnd,
    sortBy,
    faculties,
    studyPrograms,
  ]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage));
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const activeFacultyName = faculties.find((f) => f.id.toString() === selectedFacultyId)?.name;
  const activeCategoryLabel = CATEGORY_OPTIONS.find((c) => c.value === selectedCategory)?.label;

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col font-sans" data-testid="repositori-page">
      <Navbar />

      <main className="flex-1">
        {/* --- ACADEMIC SEARCH HEADER (Clean & Non-Slop) --- */}
        <section className="bg-card border-b border-border/70 py-8 sm:py-10 px-4">
          <div className="max-w-5xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-semibold uppercase tracking-wider mb-3">
              <GraduationCap className="w-4 h-4" />
              Portal Riset Akademik UMC
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-2">
              Repositori Karya Ilmiah Mahasiswa
            </h1>

            <p className="text-muted-foreground text-xs sm:text-sm md:text-base max-w-2xl mx-auto mb-6 leading-relaxed">
              Pangkalan data tugas akhir, skripsi, dan riset sivitas akademika Universitas Muhammadiyah Cirebon yang telah terverifikasi resmi oleh pustakawan.
            </p>

            {/* Semantic Search Form */}
            <form onSubmit={handleSearchSubmit} className="w-full max-w-3xl mx-auto">
              <div className="bg-background flex flex-col sm:flex-row items-stretch rounded-xl sm:rounded-2xl border border-border shadow-xs hover:border-border/80 transition-all p-1.5 gap-2">
                <div className="flex-1 flex items-center px-3 min-w-0">
                  <Search className="text-muted-foreground w-4 h-4 mr-2.5 shrink-0" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Cari berdasarkan judul, penulis, NIM, atau abstrak..."
                    className="w-full py-2 text-foreground focus:outline-none font-medium text-xs sm:text-sm bg-transparent placeholder:text-muted-foreground/70 truncate"
                  />
                  {searchInput && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchInput("");
                        setActiveSearch("");
                      }}
                      className="text-muted-foreground hover:text-foreground p-1 transition-colors"
                      aria-label="Bersihkan pencarian"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Scope Filter */}
                <div className="flex items-center border-t sm:border-t-0 sm:border-l border-border pt-1.5 sm:pt-0 sm:pl-2 shrink-0">
                  <Select
                    value={searchScope}
                    onValueChange={(val) => setSearchScope(val as any)}
                  >
                    <SelectTrigger className="h-9 border-0 bg-transparent text-xs font-semibold text-muted-foreground hover:text-foreground focus:ring-0 shadow-none gap-2 px-2.5 cursor-pointer">
                      <SelectValue placeholder="Semua Cakupan" />
                    </SelectTrigger>
                    <SelectContent align="end" className="w-36 bg-card border-border shadow-md">
                      <SelectItem value="all" className="text-xs cursor-pointer">
                        Semua Cakupan
                      </SelectItem>
                      <SelectItem value="title" className="text-xs cursor-pointer">
                        Judul Naskah
                      </SelectItem>
                      <SelectItem value="author" className="text-xs cursor-pointer">
                        Nama Penulis / NIM
                      </SelectItem>
                      <SelectItem value="keywords" className="text-xs cursor-pointer">
                        Kata Kunci
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  <button
                    type="submit"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2 rounded-lg font-semibold text-xs sm:text-sm transition-all ml-1.5 shadow-xs shrink-0 cursor-pointer flex items-center gap-1.5"
                  >
                    <Search className="w-3.5 h-3.5" />
                    Cari
                  </button>
                </div>
              </div>
            </form>
          </div>
        </section>

        {/* --- MAIN EXPLORER AREA --- */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          {/* Mobile Filter Toggle */}
          <button
            type="button"
            onClick={() => setShowMobileFilter(!showMobileFilter)}
            className="lg:hidden w-full mb-5 flex items-center justify-between px-4 py-2.5 bg-card border border-border rounded-xl text-xs font-semibold text-foreground cursor-pointer shadow-xs"
          >
            <span className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-primary" />
              Filter Pencarian Naskah
            </span>
            <span className="text-muted-foreground text-[11px]">
              {showMobileFilter ? "Tutup Filter" : "Buka Filter"}
            </span>
          </button>

          <div className="flex flex-col lg:flex-row gap-8 items-start">
            {/* --- SIDEBAR FILTER (Kiri) --- */}
            <aside
              className={`w-full lg:w-72 shrink-0 ${
                showMobileFilter ? "block" : "hidden lg:block"
              }`}
            >
              <div className="bg-card rounded-2xl border border-border/80 p-5 shadow-xs sticky top-24 space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <h3 className="font-bold text-foreground text-xs uppercase tracking-wider flex items-center gap-2">
                    <Filter className="w-4 h-4 text-primary" />
                    Filter Naskah
                  </h3>
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>
                </div>

                {/* Filter Kategori Naskah */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-muted-foreground">
                    Kategori Naskah
                  </label>
                  <Select
                    value={selectedCategory}
                    onValueChange={(val) => {
                      setSelectedCategory(val);
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="w-full h-9 rounded-lg bg-background border-border text-xs font-medium cursor-pointer">
                      <SelectValue placeholder="Pilih Kategori" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border shadow-md">
                      {CATEGORY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="text-xs cursor-pointer">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Filter 7 Fakultas UMC */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-muted-foreground">
                    Fakultas Terdaftar
                  </label>
                  <Select
                    value={selectedFacultyId}
                    onValueChange={(val) => {
                      setSelectedFacultyId(val);
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="w-full h-9 rounded-lg bg-background border-border text-xs font-medium cursor-pointer">
                      <SelectValue placeholder="Semua Fakultas" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border shadow-md max-h-60">
                      <SelectItem value="ALL" className="text-xs cursor-pointer">
                        Semua Fakultas
                      </SelectItem>
                      {faculties.map((fac) => (
                        <SelectItem key={fac.id} value={fac.id.toString()} className="text-xs cursor-pointer">
                          {fac.name} {fac.code ? `(${fac.code})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Filter Program Studi Dinamis */}
                {studyPrograms.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-muted-foreground">
                      Program Studi
                    </label>
                    <Select
                      value={selectedStudyProgramId}
                      onValueChange={(val) => {
                        setSelectedStudyProgramId(val);
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="w-full h-9 rounded-lg bg-background border-border text-xs font-medium cursor-pointer">
                        <SelectValue placeholder="Semua Program Studi" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border shadow-md max-h-60">
                        <SelectItem value="ALL" className="text-xs cursor-pointer">
                          Semua Program Studi
                        </SelectItem>
                        {studyPrograms.map((p) => (
                          <SelectItem key={p.id} value={p.id.toString()} className="text-xs cursor-pointer">
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Filter Rentang Tahun */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-muted-foreground">
                    Tahun Terbit / Ujian
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      value={yearStart}
                      onChange={(e) => {
                        setYearStart(e.target.value);
                        setCurrentPage(1);
                      }}
                      placeholder="Dari (2020)"
                      className="w-full bg-background text-foreground border border-border rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-primary transition-colors placeholder:text-muted-foreground/60"
                    />
                    <input
                      type="number"
                      value={yearEnd}
                      onChange={(e) => {
                        setYearEnd(e.target.value);
                        setCurrentPage(1);
                      }}
                      placeholder="Sampai (2026)"
                      className="w-full bg-background text-foreground border border-border rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-primary transition-colors placeholder:text-muted-foreground/60"
                    />
                  </div>
                </div>

                {/* Active Filter Chips */}
                {(activeSearch ||
                  selectedCategory !== "ALL" ||
                  selectedFacultyId !== "ALL" ||
                  yearStart ||
                  yearEnd) && (
                  <div className="pt-3 border-t border-border space-y-2">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                      Filter Aktif
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {activeSearch && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-primary/10 text-primary border border-primary/20">
                          "{activeSearch.slice(0, 15)}"
                          <button
                            type="button"
                            onClick={() => {
                              setActiveSearch("");
                              setSearchInput("");
                            }}
                            className="cursor-pointer hover:text-primary/70"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      )}
                      {selectedCategory !== "ALL" && activeCategoryLabel && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-muted text-foreground border border-border">
                          {activeCategoryLabel}
                          <button
                            type="button"
                            onClick={() => setSelectedCategory("ALL")}
                            className="cursor-pointer hover:text-muted-foreground"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      )}
                      {selectedFacultyId !== "ALL" && activeFacultyName && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-muted text-foreground border border-border">
                          {activeFacultyName.slice(0, 18)}
                          <button
                            type="button"
                            onClick={() => setSelectedFacultyId("ALL")}
                            className="cursor-pointer hover:text-muted-foreground"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </aside>

            {/* --- RESULTS AREA (Kanan) --- */}
            <div className="flex-1 w-full min-w-0">
              {/* Results Control Bar */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 mb-5 border-b border-border/80">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-base sm:text-lg font-bold text-foreground">
                    Daftar Karya Ilmiah
                  </h2>
                  <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border">
                    {filteredItems.length} naskah
                  </span>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <span className="text-xs text-muted-foreground font-medium shrink-0">
                    Urutkan:
                  </span>
                  <Select
                    value={sortBy}
                    onValueChange={(val) => setSortBy(val as any)}
                  >
                    <SelectTrigger className="h-8 w-44 rounded-lg bg-card border-border text-xs font-medium cursor-pointer">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="end" className="bg-card border-border shadow-md">
                      <SelectItem value="date_desc" className="text-xs cursor-pointer">
                        Terbaru
                      </SelectItem>
                      <SelectItem value="date_asc" className="text-xs cursor-pointer">
                        Terlama
                      </SelectItem>
                      <SelectItem value="title_asc" className="text-xs cursor-pointer">
                        Judul (A-Z)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* STATE 1: LOADING SKELETON */}
              {loading && (
                <div className="space-y-4" data-testid="repo-loading-skeleton">
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      className="bg-card rounded-2xl border border-border p-6 shadow-xs animate-pulse space-y-3.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="h-5 w-24 bg-muted rounded-full" />
                        <div className="h-4 w-32 bg-muted rounded-md" />
                      </div>
                      <div className="h-6 w-3/4 bg-muted rounded-md" />
                      <div className="h-4 w-1/2 bg-muted rounded-md" />
                      <div className="h-12 w-full bg-muted/60 rounded-md" />
                      <div className="flex justify-between items-center pt-2">
                        <div className="h-4 w-28 bg-muted rounded-md" />
                        <div className="h-8 w-32 bg-muted rounded-lg" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* STATE 2: ERROR STATE */}
              {!loading && error && (
                <div className="bg-card border border-destructive/30 rounded-2xl p-8 text-center shadow-xs space-y-3">
                  <AlertCircle className="w-10 h-10 text-destructive mx-auto" />
                  <h3 className="text-base font-bold text-foreground">
                    Gagal Memuat Repositori
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    {error}
                  </p>
                  <button
                    type="button"
                    onClick={fetchData}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Coba Lagi
                  </button>
                </div>
              )}

              {/* STATE 3: EMPTY STATE */}
              {!loading && !error && paginatedItems.length === 0 && (
                <div className="bg-card border border-border rounded-2xl p-12 text-center shadow-xs space-y-3">
                  <FileText className="w-12 h-12 text-muted-foreground/60 mx-auto" />
                  <h3 className="text-base font-bold text-foreground">
                    Tidak ditemukan karya ilmiah
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    Tidak ada naskah yang cocok dengan kombinasi kata kunci dan filter saat ini.
                  </p>
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-muted text-foreground text-xs font-semibold hover:bg-muted/80 transition-colors cursor-pointer mt-2"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset Filter Pencarian
                  </button>
                </div>
              )}

              {/* STATE 4: RESULTS LIST (ANTI-SLOP CRAFTED CARDS) */}
              {!loading && !error && paginatedItems.length > 0 && (
                <div className="space-y-4">
                  {paginatedItems.map((item) => (
                    <article
                      key={item.id}
                      className="bg-card rounded-2xl border border-border/80 hover:border-border p-5 sm:p-6 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between group"
                    >
                      {/* Top Badges & Meta */}
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-foreground border border-border">
                            {item.category}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                            <CheckCircle className="w-3 h-3" />
                            Terverifikasi Pustakawan UMC
                          </span>
                        </div>

                        {item.proposalNumber && (
                          <span className="text-[11px] font-mono text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">
                            {item.proposalNumber}
                          </span>
                        )}
                      </div>

                      {/* Judul Naskah */}
                      <h3 className="text-base sm:text-lg font-bold text-foreground group-hover:text-primary transition-colors leading-snug mb-2.5">
                        <Link to={`/repository/${item.id}`} className="hover:underline">
                          {item.title}
                        </Link>
                      </h3>

                      {/* Penulis, NIM, Prodi & Fakultas */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground mb-3">
                        <div className="flex items-center gap-1.5 text-foreground font-medium">
                          <User className="w-3.5 h-3.5 text-primary" />
                          <span>{item.author}</span>
                          {item.authorNim && (
                            <span className="font-mono text-muted-foreground">({item.authorNim})</span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 text-muted-foreground">
                          <GraduationCap className="w-3.5 h-3.5" />
                          <span>{item.department}</span>
                          <span>•</span>
                          <span>{item.faculty}</span>
                        </div>
                      </div>

                      {/* Ringkasan Abstrak */}
                      <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed mb-4 bg-muted/20 p-3 rounded-xl border border-border/40">
                        {item.abstract}
                      </p>

                      {/* Footer Kartu: Info Berkas & Tombol Aksi */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-border/60 text-xs">
                        <div className="flex items-center gap-3 text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {item.date}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 font-mono">
                            <FileCheck2 className="w-3.5 h-3.5" />
                            {item.fileSize}
                            {item.pageCount ? ` (${item.pageCount} hlm)` : ""}
                          </span>
                        </div>

                        <Link
                          to={`/repository/${item.id}`}
                          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-border hover:bg-muted text-foreground text-xs font-semibold transition-colors self-end sm:self-auto cursor-pointer"
                        >
                          <span>Lihat Abstrak & Naskah</span>
                          <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                        </Link>
                      </div>
                    </article>
                  ))}

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-6 border-t border-border mt-6">
                      <p className="text-xs text-muted-foreground">
                        Halaman <span className="font-semibold text-foreground">{currentPage}</span> dari{" "}
                        <span className="font-semibold text-foreground">{totalPages}</span>
                      </p>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="p-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer text-xs flex items-center gap-1"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          <span className="hidden sm:inline">Sebelumnya</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="p-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer text-xs flex items-center gap-1"
                        >
                          <span className="hidden sm:inline">Berikutnya</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
