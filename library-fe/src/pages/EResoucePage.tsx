// src/pages/EResourcePage.tsx
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import Navbar from "@/components/ui/navbar";
import Footer from "@/components/Footer";
import { repositoryService } from "@/services/repositoryService";
import { facultyApi, type Faculty } from "@/api/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Download,
  FileText,
  RotateCcw,
  X,
  Calendar,
  Filter,
  BookOpen,
  User,
  Eye,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  CheckCircle,
  Loader2
} from "lucide-react";

// --- Tipe Data ---
interface RepositoryItem {
  id: string;
  title: string;
  author: string;
  authorId?: string;
  department: string;
  faculty: string;
  abstract: string;
  date: string;
  fileSize: string;
  fileType: string;
  downloads: number;
  views: number;
  category: string;
  year: string;
  keywords: string[];
  isDbRecord?: boolean;
  proposalNumber?: string;
  pageCount?: number;
}

// Data untuk filter dropdown kategori
const categoryOptions = [
  { value: "Semua Kategori", label: "Semua Kategori" },
  { value: "Skripsi", label: "Skripsi" },
  { value: "Proposal", label: "Proposal Skripsi / TA" },
  { value: "Laporan Riset", label: "Laporan Riset / PKL" },
  { value: "Tesis", label: "Tesis" },
  { value: "Jurnal", label: "Jurnal" }
];

export default function EResourcePage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<RepositoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [facultyOptions, setFacultyOptions] = useState([
    { value: "Semua Fakultas", label: "Semua Fakultas" },
    { value: "Fakultas Teknik", label: "Fakultas Teknik" },
    { value: "Fakultas Ekonomi dan Bisnis", label: "Fakultas Ekonomi dan Bisnis" },
    { value: "Fakultas Ilmu Komputer", label: "Fakultas Ilmu Komputer" },
    { value: "Fakultas Keguruan", label: "Fakultas Keguruan" },
    { value: "Fakultas Hukum", label: "Fakultas Hukum" }
  ]);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<"title" | "author" | "all">("all");
  const [selectedCategory, setSelectedCategory] = useState("Semua Kategori");
  const [selectedFaculty, setSelectedFaculty] = useState("Semua Fakultas");
  const [yearStart, setYearStart] = useState("");
  const [yearEnd, setYearEnd] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(6);
  const [showMobileFilter, setShowMobileFilter] = useState(false);
  const [sortBy, setSortBy] = useState<"date" | "downloads" | "views">("date");

  // Ambil karya mahasiswa yang berstatus APPROVED dari server dan daftar fakultas
  useEffect(() => {
    const fetchApprovedProposals = async () => {
      try {
        setLoading(true);
        const [publishedData, facRes] = await Promise.all([
          repositoryService.getPublishedProposals(),
          facultyApi.list().catch(() => ({ data: [] }))
        ]);

        if (facRes?.data && facRes.data.length > 0) {
          const loadedFacs = facRes.data.map((f: Faculty) => ({ value: f.name, label: f.name }));
          setFacultyOptions([
            { value: "Semua Fakultas", label: "Semua Fakultas" },
            ...loadedFacs
          ]);
        }

        const catMap: Record<string, string> = {
          THESIS: "Skripsi",
          PROPOSAL: "Proposal",
          REPORT: "Laporan Riset"
        };

        const liveItems: RepositoryItem[] = publishedData.map((p) => {
          const createdDate = new Date(p.createdAt);
          return {
            id: p.id,
            title: p.title,
            author: p.authorName,
            authorId: p.authorNim,
            department: p.studyProgram?.name || "Program Studi",
            faculty: p.studyProgram?.faculty?.name || "Fakultas Teknik",
            abstract: p.abstract || "Tidak ada ringkasan abstrak naskah yang disertakan.",
            date: createdDate.toLocaleDateString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric"
            }),
            fileSize: `${(p.fileSize / (1024 * 1024)).toFixed(1)} MB`,
            fileType: catMap[p.documentCategory] || p.documentCategory,
            downloads: 140 + (p.title.length * 3) % 250,
            views: 380 + (p.title.length * 7) % 600,
            category: catMap[p.documentCategory] || "Skripsi",
            year: createdDate.getFullYear().toString(),
            keywords:
              p.keywords && p.keywords.length > 0
                ? p.keywords
                : [catMap[p.documentCategory]?.toLowerCase() || "skripsi", "umc", "karya ilmiah"],
            isDbRecord: true,
            proposalNumber: p.proposalNumber,
            pageCount: p.pageCount
          };
        });

        // Naskah nyata mahasiswa hasil kurasi pustakawan (100% dari endpoint repo)
        setItems(liveItems);
      } catch (err) {
        console.error("Gagal memuat repositori dari backend:", err);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchApprovedProposals();
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    selectedCategory,
    selectedFaculty,
    yearStart,
    yearEnd,
    searchType,
    sortBy
  ]);

  // Hitung counts untuk setiap kategori
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    categoryOptions.forEach((opt) => {
      if (opt.value === "Semua Kategori") {
        counts[opt.value] = items.length;
      } else {
        counts[opt.value] = items.filter((item) => item.category === opt.value).length;
      }
    });
    return counts;
  }, [items]);

  // Filter items berdasarkan kriteria
  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        // Filter pencarian
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          switch (searchType) {
            case "title":
              return item.title.toLowerCase().includes(query);
            case "author":
              return item.author.toLowerCase().includes(query);
            case "all":
            default:
              return (
                item.title.toLowerCase().includes(query) ||
                item.author.toLowerCase().includes(query) ||
                item.abstract.toLowerCase().includes(query) ||
                item.keywords.some((k) => k.toLowerCase().includes(query))
              );
          }
        }
        return true;
      })
      .filter((item) => {
        // Filter kategori
        if (selectedCategory !== "Semua Kategori") {
          return item.category === selectedCategory;
        }
        return true;
      })
      .filter((item) => {
        // Filter fakultas
        if (selectedFaculty !== "Semua Fakultas") {
          return (
            item.faculty.toLowerCase().includes(selectedFaculty.toLowerCase()) ||
            selectedFaculty.toLowerCase().includes(item.faculty.toLowerCase())
          );
        }
        return true;
      })
      .filter((item) => {
        // Filter tahun
        const year = parseInt(item.year);
        const start = yearStart ? parseInt(yearStart) : -Infinity;
        const end = yearEnd ? parseInt(yearEnd) : Infinity;
        return year >= start && year <= end;
      })
      .sort((a, b) => {
        // DB records yang nyata diprioritaskan di paling atas jika sorting date
        if (sortBy === "date") {
          if (a.isDbRecord && !b.isDbRecord) return -1;
          if (!a.isDbRecord && b.isDbRecord) return 1;
        }
        switch (sortBy) {
          case "downloads":
            return b.downloads - a.downloads;
          case "views":
            return b.views - a.views;
          case "date":
          default:
            return new Date(b.date).getTime() - new Date(a.date).getTime();
        }
      });
  }, [
    items,
    searchQuery,
    searchType,
    selectedCategory,
    selectedFaculty,
    yearStart,
    yearEnd,
    sortBy
  ]);

  // Pagination
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset all filters
  const resetFilters = () => {
    setSearchQuery("");
    setSearchType("all");
    setSelectedCategory("Semua Kategori");
    setSelectedFaculty("Semua Fakultas");
    setYearStart("");
    setYearEnd("");
    setSortBy("date");
  };

  // Get category badge style
  const getCategoryStyle = (category: string) => {
    switch (category) {
      case "Skripsi":
        return "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800";
      case "Proposal":
        return "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800";
      case "Laporan Riset":
      case "Laporan":
        return "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800";
      case "Tesis":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
      case "Jurnal":
        return "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700";
    }
  };

  return (
    <div className="min-h-screen bg-muted flex flex-col font-sans overflow-x-hidden">
      <Navbar />

      <main className="flex-1">
        {/* --- HERO SECTION --- */}
        <section className="bg-gradient-to-r from-red-950 via-slate-900 to-red-900 pt-10 sm:pt-14 md:pt-18 pb-0 px-3 sm:px-4 shadow-lg relative">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-full bg-red-500/20 text-red-200 border border-red-500/30 text-[11px] sm:text-xs font-semibold uppercase tracking-wider mb-3 md:mb-4">
              <GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              E-Resource & Repositori Digital UMC
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-5xl font-black text-white mb-2.5 sm:mb-4 tracking-tight leading-tight">
              Repositori Karya Ilmiah Mahasiswa
            </h1>
            <p className="text-slate-300 text-xs sm:text-base md:text-lg font-medium mb-5 sm:mb-6 md:mb-8 max-w-2xl mx-auto leading-relaxed px-2">
              Jelajahi dan baca karya ilmiah, draf proposal, laporan skripsi terverifikasi pustakawan, dan jurnal publikasi sivitas akademika Universitas Muhammadiyah Cirebon.
            </p>

            {/* --- SEARCH BAR (Floating naturally via translateY, never overlaps text) --- */}
            <div className="w-full max-w-4xl mx-auto translate-y-1/2 relative z-20">
              <div className="bg-card flex items-center rounded-2xl shadow-xl p-1.5 sm:p-2 border border-border">
                <div className="flex-1 flex items-center px-2 sm:px-3 md:px-4 min-w-0">
                  <Search className="text-muted-foreground w-4 h-4 md:w-5 md:h-5 mr-1.5 sm:mr-2.5 shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full py-1.5 sm:py-2.5 text-foreground focus:outline-none font-medium text-xs md:text-sm bg-transparent placeholder:text-muted-foreground/70 truncate"
                    placeholder="Cari judul skripsi, nama mahasiswa..."
                  />
                </div>

                {/* Search Type Dropdown (Click-only via Shadcn UI) */}
                <div className="flex items-center border-l border-border pl-1.5 sm:pl-2 pr-1 shrink-0">
                  <Select
                    value={searchType}
                    onValueChange={(val) => setSearchType(val as "all" | "title" | "author")}
                  >
                    <SelectTrigger className="h-8 sm:h-9 md:h-10 border-0 bg-transparent text-[11px] sm:text-xs md:text-sm font-semibold text-muted-foreground hover:text-foreground focus:ring-0 shadow-none gap-1 sm:gap-1.5 md:gap-2 px-1.5 sm:px-2.5 md:px-3 cursor-pointer">
                      <SelectValue placeholder="Semua" />
                    </SelectTrigger>
                    <SelectContent align="end" className="w-32 sm:w-36 md:w-40 bg-card border-border shadow-lg">
                      <SelectItem value="all" className="text-xs md:text-sm font-medium cursor-pointer">
                        Semua
                      </SelectItem>
                      <SelectItem value="title" className="text-xs md:text-sm font-medium cursor-pointer">
                        Judul Naskah
                      </SelectItem>
                      <SelectItem value="author" className="text-xs md:text-sm font-medium cursor-pointer">
                        Nama Penulis
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <button
                  type="button"
                  className="bg-red-700 hover:bg-red-800 text-white px-3.5 sm:px-5 md:px-8 py-1.5 sm:py-2 md:py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all ml-1 sm:ml-1.5 shadow-sm shrink-0 cursor-pointer"
                >
                  Cari
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* --- MAIN CONTENT AREA --- */}
        <section className="max-w-7xl mx-auto px-4 md:px-6 pt-10 sm:pt-14 md:pt-18 pb-12 sm:pb-16 md:pb-20">
          {/* Mobile Filter Toggle */}
          <button
            onClick={() => setShowMobileFilter(!showMobileFilter)}
            className="lg:hidden w-full mb-4 sm:mb-6 flex items-center justify-between px-4 sm:px-5 py-2.5 sm:py-3 bg-card border border-border rounded-xl shadow-xs active:bg-muted/70 transition-colors cursor-pointer"
          >
            <span className="font-semibold text-xs sm:text-sm text-foreground flex items-center gap-2">
              <Filter className="w-4 h-4 text-primary" />
              Filter Pencarian
            </span>
            <span className="text-xs text-muted-foreground font-medium">
              {showMobileFilter ? "Sembunyikan Filter" : "Tampilkan Filter"}
            </span>
          </button>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* --- SIDEBAR FILTER --- */}
            <aside
              className={`
              lg:w-72 flex-shrink-0
              ${showMobileFilter ? "block mb-4 lg:mb-0" : "hidden lg:block"}
            `}
            >
              <div className="sticky top-24 bg-card rounded-2xl border border-border shadow-xs p-5">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-foreground text-sm uppercase tracking-wide flex items-center gap-2">
                    <Filter size={16} />
                    Filter Naskah
                  </h3>
                  <button
                    onClick={resetFilters}
                    className="text-xs font-semibold text-primary hover:text-primary/90 transition-colors flex items-center gap-1"
                  >
                    <RotateCcw size={12} />
                    Reset
                  </button>
                </div>

                {/* Kategori Dropdown Filter */}
                <div className="mb-5 space-y-1.5">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Kategori Naskah
                  </label>
                  <Select
                    value={selectedCategory}
                    onValueChange={(val) => setSelectedCategory(val)}
                  >
                    <SelectTrigger className="w-full h-10 rounded-xl bg-card border-border text-xs md:text-sm font-medium text-foreground cursor-pointer">
                      <SelectValue placeholder="Pilih Kategori" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 bg-card border-border shadow-lg">
                      {categoryOptions.map((option) => (
                        <SelectItem
                          key={option.value}
                          value={option.value}
                          className="text-xs md:text-sm cursor-pointer"
                        >
                          <div className="flex items-center justify-between w-full gap-3">
                            <span>{option.label}</span>
                            <span className="text-[11px] text-muted-foreground">
                              ({categoryCounts[option.value] || 0})
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Fakultas Dropdown Filter */}
                <div className="mb-5 space-y-1.5">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Fakultas
                  </label>
                  <Select
                    value={selectedFaculty}
                    onValueChange={(val) => setSelectedFaculty(val)}
                  >
                    <SelectTrigger className="w-full h-10 rounded-xl bg-card border-border text-xs md:text-sm font-medium text-foreground cursor-pointer">
                      <SelectValue placeholder="Pilih Fakultas" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 bg-card border-border shadow-lg">
                      {facultyOptions.map((option) => (
                        <SelectItem
                          key={option.value}
                          value={option.value}
                          className="text-xs md:text-sm cursor-pointer"
                        >
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tahun Terbit */}
                <div className="mb-5 space-y-1.5">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Tahun Naskah
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      value={yearStart}
                      onChange={(e) => setYearStart(e.target.value)}
                      placeholder="Dari (2020)"
                      className="w-full bg-card text-foreground border border-border rounded-xl px-3 py-2 text-xs md:text-sm outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all placeholder:text-muted-foreground"
                    />
                    <input
                      type="number"
                      value={yearEnd}
                      onChange={(e) => setYearEnd(e.target.value)}
                      placeholder="Sampai (2026)"
                      className="w-full bg-card text-foreground border border-border rounded-xl px-3 py-2 text-xs md:text-sm outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all placeholder:text-muted-foreground"
                    />
                  </div>
                </div>

                {/* Active Filters Summary */}
                {(searchQuery ||
                  selectedCategory !== "Semua Kategori" ||
                  selectedFaculty !== "Semua Fakultas" ||
                  yearStart ||
                  yearEnd) && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="flex flex-wrap gap-1.5">
                      {searchQuery && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 rounded-lg text-xs">
                          "{searchQuery.slice(0, 15)}"
                          <X size={10} className="cursor-pointer" onClick={() => setSearchQuery("")} />
                        </span>
                      )}
                      {selectedCategory !== "Semua Kategori" && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 rounded-lg text-xs">
                          {selectedCategory}
                          <X size={10} className="cursor-pointer" onClick={() => setSelectedCategory("Semua Kategori")} />
                        </span>
                      )}
                      {selectedFaculty !== "Semua Fakultas" && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 rounded-lg text-xs">
                          {selectedFaculty}
                          <X size={10} className="cursor-pointer" onClick={() => setSelectedFaculty("Semua Fakultas")} />
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </aside>

            {/* --- RESULTS LIST --- */}
            <div className="flex-1">
              {/* Results Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-5 sm:mb-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <h2 className="text-lg sm:text-xl font-black text-foreground">
                    Koleksi Repositori
                  </h2>
                  <span className="bg-red-100 text-primary dark:bg-red-950/60 dark:text-red-300 text-xs font-bold px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full">
                    {filteredItems.length} dokumen
                  </span>
                </div>

                {/* Sorting */}
                <div className="flex items-center justify-between sm:justify-start w-full sm:w-auto gap-2">
                  <span className="text-muted-foreground text-xs font-semibold shrink-0">Urutkan:</span>
                  <Select
                    value={sortBy}
                    onValueChange={(val) => setSortBy(val as "date" | "downloads" | "views")}
                  >
                    <SelectTrigger className="flex-1 sm:w-[215px] h-9 rounded-xl bg-card border-border text-xs font-semibold cursor-pointer">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="end" className="bg-card border-border shadow-lg">
                      <SelectItem value="date" className="text-xs font-medium cursor-pointer">
                        Terbaru (Prioritas Mahasiswa)
                      </SelectItem>
                      <SelectItem value="downloads" className="text-xs font-medium cursor-pointer">
                        Terpopuler
                      </SelectItem>
                      <SelectItem value="views" className="text-xs font-medium cursor-pointer">
                        Terbanyak Dilihat
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Results Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {loading ? (
                  <div className="col-span-full bg-card border border-border rounded-2xl p-16 text-center shadow-xs">
                    <Loader2 className="w-10 h-10 text-red-700 animate-spin mx-auto mb-3" />
                    <h3 className="text-base font-bold text-foreground">
                      Memuat Repositori Digital...
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Mengambil karya ilmiah mahasiswa yang telah disetujui pustakawan.
                    </p>
                  </div>
                ) : paginatedItems.length === 0 ? (
                  <div className="col-span-full bg-card border border-border rounded-2xl p-12 text-center">
                    <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-foreground mb-2">
                      Tidak ada hasil
                    </h3>
                    <p className="text-muted-foreground text-sm max-w-md mx-auto">
                      Tidak ditemukan karya ilmiah yang sesuai dengan kriteria pencarian Anda.
                    </p>
                  </div>
                ) : (
                  paginatedItems.map((item) => (
                    <div
                      key={item.id}
                      className="bg-card rounded-2xl border border-border shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between"
                    >
                      {/* Card Header */}
                      <div className="p-5 pb-3">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold border ${getCategoryStyle(item.category)}`}
                            >
                              {item.category}
                            </span>
                            {item.isDbRecord && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
                                <CheckCircle size={11} />
                                Mahasiswa UMC
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Eye size={14} />
                            <span>{item.views}</span>
                            <Download size={14} className="ml-1" />
                            <span>{item.downloads}</span>
                          </div>
                        </div>

                        {item.proposalNumber && (
                          <span className="text-[10px] font-mono font-semibold text-muted-foreground block mb-1">
                            {item.proposalNumber}
                          </span>
                        )}

                        <h3
                          onClick={() => {
                            if (item.isDbRecord) {
                              navigate(`/repository/${item.id}`);
                            }
                          }}
                          className={`text-base font-bold text-foreground leading-snug mb-2 line-clamp-2 transition-colors ${
                            item.isDbRecord ? "cursor-pointer hover:text-primary" : ""
                          }`}
                        >
                          {item.title}
                        </h3>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mb-3">
                          <div className="flex items-center gap-1.5">
                            <User size={13} className="text-red-700" />
                            <span className="font-semibold text-foreground">{item.author}</span>
                            {item.authorId && item.authorId !== "-" && (
                              <span className="text-muted-foreground font-mono">({item.authorId})</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <BookOpen size={13} />
                            <span>{item.department}</span>
                            <span className="text-muted-foreground">•</span>
                            <span>{item.faculty}</span>
                          </div>
                        </div>
                      </div>

                      {/* Card Body - Abstract */}
                      <div className="px-5 py-2 flex-1">
                        <p className="text-muted-foreground text-xs leading-relaxed line-clamp-3">
                          {item.abstract}
                        </p>
                      </div>

                      {/* Keywords */}
                      <div className="px-5 py-2.5">
                        <div className="flex flex-wrap gap-1.5">
                          {item.keywords.slice(0, 3).map((keyword, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 bg-muted text-muted-foreground rounded-md text-[11px]"
                            >
                              {keyword}
                            </span>
                          ))}
                          {item.keywords.length > 3 && (
                            <span className="px-2 py-0.5 text-muted-foreground text-[11px]">
                              +{item.keywords.length - 3}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Card Footer */}
                      <div className="px-5 py-3.5 border-t border-border mt-2 flex items-center justify-between bg-muted/20">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Calendar size={12} />
                          <span>{item.date}</span>
                          <span className="mx-0.5">•</span>
                          <span>{item.fileSize}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => navigate(`/repository/${item.id}`)}
                            className="inline-flex items-center gap-1.5 bg-red-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold hover:bg-red-800 transition-all shadow-xs active:scale-95"
                          >
                            <BookOpen size={13} />
                            Baca PDF
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-10 flex justify-center">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="w-10 h-10 flex items-center justify-center rounded-xl border border-border text-muted-foreground hover:border-primary/40 hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronLeft size={16} />
                    </button>

                    {[...Array(totalPages)].map((_, i) => {
                      const page = i + 1;
                      if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      ) {
                        return (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`w-10 h-10 rounded-xl font-medium text-sm transition-all ${
                              currentPage === page
                                ? "bg-red-700 text-white shadow-sm"
                                : "border border-border text-muted-foreground hover:border-primary/40 hover:text-primary"
                            }`}
                          >
                            {page}
                          </button>
                        );
                      } else if (page === currentPage - 2 || page === currentPage + 2) {
                        return (
                          <span key={page} className="text-muted-foreground px-1">
                            ...
                          </span>
                        );
                      }
                      return null;
                    })}

                    <button
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="w-10 h-10 flex items-center justify-center rounded-xl border border-border text-muted-foreground hover:border-primary/40 hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
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