// src/pages/EResourcePage.tsx
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import Navbar from "@/components/ui/navbar";
import Footer from "@/components/Footer";
import { repositoryService } from "@/services/repositoryService";
import { facultyApi, type Faculty } from "@/api/client";
import { API_BASE_URL } from "@/utils/api-config";
import {
  Search,
  Download,
  ChevronDown,
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

// --- Mock Data Tambahan sebagai Pelengkap Koleksi ---
const mockRepositoryData: RepositoryItem[] = [
  {
    id: "mock-1",
    title: "Implementasi Algoritma Deep Learning untuk Deteksi Penyakit Tanaman Padi",
    author: "Ahmad Fauzi",
    authorId: "202151001",
    department: "Teknik Informatika",
    faculty: "Fakultas Teknik",
    abstract:
      "Penelitian ini mengembangkan model deteksi penyakit tanaman padi menggunakan Convolutional Neural Network (CNN) dengan akurasi mencapai 95.7% pada dataset citra daun padi.",
    date: "12 Januari 2026",
    fileSize: "2.4 MB",
    fileType: "Skripsi",
    downloads: 245,
    views: 1234,
    category: "Skripsi",
    year: "2026",
    keywords: ["deep learning", "cnn", "tanaman padi", "deteksi penyakit"],
    isDbRecord: false
  },
  {
    id: "mock-2",
    title: "Analisis Sentimen Masyarakat terhadap Kebijakan Pendidikan menggunakan Metode Naive Bayes",
    author: "Siti Nurhaliza",
    authorId: "202152002",
    department: "Sistem Informasi",
    faculty: "Fakultas Ilmu Komputer",
    abstract:
      "Penelitian ini menganalisis sentimen masyarakat terhadap kebijakan pendidikan terbaru menggunakan metode klasifikasi Naive Bayes dengan tingkat akurasi 89.3%.",
    date: "15 Februari 2026",
    fileSize: "1.8 MB",
    fileType: "Jurnal",
    downloads: 189,
    views: 956,
    category: "Jurnal",
    year: "2026",
    keywords: ["sentimen analisis", "naive bayes", "kebijakan pendidikan"],
    isDbRecord: false
  },
  {
    id: "mock-3",
    title: "Rancang Bangun Aplikasi E-Learning berbasis Mobile untuk Sekolah Dasar",
    author: "Budi Santoso",
    authorId: "202153003",
    department: "Teknik Informatika",
    faculty: "Fakultas Teknik",
    abstract:
      "Aplikasi e-learning dikembangkan menggunakan framework Flutter dengan fitur interaktif untuk memfasilitasi pembelajaran jarak jauh bagi siswa sekolah dasar.",
    date: "20 Maret 2026",
    fileSize: "3.1 MB",
    fileType: "Skripsi",
    downloads: 312,
    views: 1876,
    category: "Skripsi",
    year: "2026",
    keywords: ["e-learning", "mobile", "flutter", "sekolah dasar"],
    isDbRecord: false
  },
  {
    id: "mock-4",
    title: "Pengaruh Penggunaan Media Sosial terhadap Prestasi Belajar Mahasiswa",
    author: "Dewi Lestari",
    authorId: "202154004",
    department: "Pendidikan",
    faculty: "Fakultas Keguruan",
    abstract:
      "Studi kuantitatif ini menginvestigasi dampak penggunaan media sosial terhadap prestasi akademik mahasiswa dengan sampel 300 responden dari 5 universitas.",
    date: "5 April 2026",
    fileSize: "2.1 MB",
    fileType: "Tesis",
    downloads: 156,
    views: 745,
    category: "Tesis",
    year: "2026",
    keywords: ["media sosial", "prestasi belajar", "mahasiswa"],
    isDbRecord: false
  },
  {
    id: "mock-5",
    title: "Optimasi Jaringan Syaraf Tiruan untuk Prediksi Cuaca di Wilayah Cirebon",
    author: "Rizki Ramadhan",
    authorId: "202155005",
    department: "Teknik Informatika",
    faculty: "Fakultas Teknik",
    abstract:
      "Penelitian ini mengoptimalkan algoritma neural network untuk memprediksi pola cuaca dengan akurasi 92% menggunakan data historis 10 tahun terakhir.",
    date: "18 Mei 2025",
    fileSize: "2.7 MB",
    fileType: "Jurnal",
    downloads: 98,
    views: 432,
    category: "Jurnal",
    year: "2025",
    keywords: ["neural network", "prediksi cuaca", "optimasi"],
    isDbRecord: false
  },
  {
    id: "mock-6",
    title: "Sistem Pendukung Keputusan Pemilihan Program Studi menggunakan Metode AHP",
    author: "Maya Sari",
    authorId: "202156006",
    department: "Sistem Informasi",
    faculty: "Fakultas Ilmu Komputer",
    abstract:
      "Sistem pendukung keputusan berbasis web dikembangkan untuk membantu calon mahasiswa memilih program studi sesuai minat dan bakat menggunakan metode AHP.",
    date: "22 Juni 2025",
    fileSize: "2.9 MB",
    fileType: "Skripsi",
    downloads: 201,
    views: 1023,
    category: "Skripsi",
    year: "2025",
    keywords: ["spk", "ahp", "pemilihan prodi"],
    isDbRecord: false
  }
];

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
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isFacultyDropdownOpen, setIsFacultyDropdownOpen] = useState(false);

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

        // Naskah nyata mahasiswa ditaruh di awal, diikuti koleksi lainnya
        setItems([...liveItems, ...mockRepositoryData]);
      } catch (err) {
        console.error("Gagal memuat repositori dari backend:", err);
        setItems(mockRepositoryData);
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

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".category-dropdown")) {
        setIsCategoryDropdownOpen(false);
      }
      if (!target.closest(".faculty-dropdown")) {
        setIsFacultyDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
        <section className="bg-gradient-to-r from-red-950 via-slate-900 to-red-900 pt-20 pb-28 px-4 relative shadow-lg">
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 text-red-200 border border-red-500/30 text-xs font-semibold uppercase tracking-wider mb-4">
              <GraduationCap className="w-4 h-4" />
              E-Resource & Repositori Digital UMC
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tight">
              Repositori Karya Ilmiah Mahasiswa
            </h1>
            <p className="text-slate-300 text-base md:text-lg font-medium mb-12 max-w-2xl mx-auto leading-relaxed">
              Jelajahi dan baca karya ilmiah, draf proposal, laporan skripsi terverifikasi pustakawan, dan jurnal publikasi sivitas akademika Universitas Muhammadiyah Cirebon.
            </p>

            {/* --- SEARCH BAR (Floating) --- */}
            <div className="absolute left-1/2 -bottom-8 -translate-x-1/2 w-full max-w-4xl px-4">
              <div className="bg-card flex items-center rounded-2xl shadow-xl p-1.5 border border-border">
                <div className="flex-1 flex items-center px-4">
                  <Search className="text-muted-foreground w-5 h-5 mr-3 shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full py-3.5 text-foreground focus:outline-none font-medium text-base bg-transparent"
                    placeholder="Cari judul skripsi, nama mahasiswa, atau kata kunci..."
                  />
                </div>

                {/* Search Type Dropdown */}
                <div className="relative group">
                  <button className="hidden md:flex items-center px-6 border-l border-border text-muted-foreground text-sm gap-2 font-semibold hover:text-primary transition-colors">
                    {searchType === "all" && "Semua Bidang"}
                    {searchType === "title" && "Judul Naskah"}
                    {searchType === "author" && "Penulis"}
                    <ChevronDown size={16} />
                  </button>
                  <div className="absolute right-0 top-full mt-2 w-44 bg-card rounded-xl shadow-lg border border-border py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                    {[
                      { value: "all", label: "Semua Bidang" },
                      { value: "title", label: "Judul Naskah" },
                      { value: "author", label: "Nama Penulis" }
                    ].map((type) => (
                      <button
                        key={type.value}
                        onClick={() => setSearchType(type.value as any)}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-muted ${
                          searchType === type.value
                            ? "text-primary font-bold"
                            : "text-muted-foreground"
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button className="bg-red-700 hover:bg-red-800 text-white px-8 py-3.5 rounded-xl font-bold text-sm transition-all ml-2 shadow-sm">
                  Cari
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* --- MAIN CONTENT AREA --- */}
        <section className="max-w-7xl mx-auto px-4 md:px-6 pt-28 pb-20">
          {/* Mobile Filter Toggle */}
          <button
            onClick={() => setShowMobileFilter(!showMobileFilter)}
            className="lg:hidden w-full mb-6 flex items-center justify-between px-5 py-3 bg-card border border-border rounded-xl shadow-sm"
          >
            <span className="font-medium text-foreground">Filter Pencarian</span>
            <Filter className="w-5 h-5 text-muted-foreground" />
          </button>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* --- SIDEBAR FILTER --- */}
            <aside
              className={`
              lg:w-72 flex-shrink-0
              ${showMobileFilter ? "block" : "hidden lg:block"}
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
                <div className="mb-6 category-dropdown">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Kategori Naskah
                  </label>
                  <div className="relative">
                    <button
                      onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                      className="w-full flex items-center justify-between px-4 py-2.5 bg-card border border-border rounded-xl text-foreground text-sm hover:border-primary/40 transition-colors"
                    >
                      <span className="truncate">{selectedCategory}</span>
                      <ChevronDown
                        size={16}
                        className={`transition-transform shrink-0 ${isCategoryDropdownOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                    {isCategoryDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-20 max-h-60 overflow-auto">
                        {categoryOptions.map((option) => (
                          <button
                            key={option.value}
                            onClick={() => {
                              setSelectedCategory(option.value);
                              setIsCategoryDropdownOpen(false);
                            }}
                            className={`w-full flex justify-between items-center px-4 py-2.5 text-sm hover:bg-muted transition-colors ${
                              selectedCategory === option.value
                                ? "bg-red-50 text-primary font-bold dark:bg-red-950/40"
                                : "text-foreground"
                            }`}
                          >
                            <span>{option.label}</span>
                            <span className="text-xs text-muted-foreground">
                              {categoryCounts[option.value] || 0}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Fakultas Dropdown Filter */}
                <div className="mb-6 faculty-dropdown">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Fakultas
                  </label>
                  <div className="relative">
                    <button
                      onClick={() => setIsFacultyDropdownOpen(!isFacultyDropdownOpen)}
                      className="w-full flex items-center justify-between px-4 py-2.5 bg-card border border-border rounded-xl text-foreground text-sm hover:border-primary/40 transition-colors"
                    >
                      <span className="truncate">{selectedFaculty}</span>
                      <ChevronDown
                        size={16}
                        className={`transition-transform shrink-0 ${isFacultyDropdownOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                    {isFacultyDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-20 max-h-60 overflow-auto">
                        {facultyOptions.map((option) => (
                          <button
                            key={option.value}
                            onClick={() => {
                              setSelectedFaculty(option.value);
                              setIsFacultyDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors ${
                              selectedFaculty === option.value
                                ? "bg-red-50 text-primary font-bold dark:bg-red-950/40"
                                : "text-foreground"
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Tahun Terbit */}
                <div className="mb-6">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Tahun Naskah
                  </label>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={yearStart}
                        onChange={(e) => setYearStart(e.target.value)}
                        placeholder="Dari"
                        className="w-full bg-card text-foreground border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/60 transition-all placeholder:text-muted-foreground"
                      />
                    </div>
                    <div className="flex-1">
                      <input
                        type="text"
                        value={yearEnd}
                        onChange={(e) => setYearEnd(e.target.value)}
                        placeholder="Sampai"
                        className="w-full bg-card text-foreground border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/60 transition-all placeholder:text-muted-foreground"
                      />
                    </div>
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
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-black text-foreground">
                    Koleksi Repositori
                  </h2>
                  <span className="bg-red-100 text-primary dark:bg-red-950/60 dark:text-red-300 text-xs font-bold px-3 py-1 rounded-full">
                    {filteredItems.length} dokumen
                  </span>
                </div>

                {/* Sorting */}
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground text-xs font-semibold">Urutkan:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-card border border-border rounded-xl px-3 py-2 text-sm font-semibold text-foreground focus:outline-none focus:border-primary/60"
                  >
                    <option value="date">Terbaru (Prioritas Mahasiswa)</option>
                    <option value="downloads">Terpopuler</option>
                    <option value="views">Terbanyak Dilihat</option>
                  </select>
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
                          {item.isDbRecord && (
                            <button
                              onClick={() => navigate(`/repository/${item.id}`)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-border bg-card hover:bg-muted text-foreground transition-colors"
                            >
                              <BookOpen size={13} />
                              Detail
                            </button>
                          )}
                          <a
                            href={
                              item.isDbRecord
                                ? `${API_BASE_URL}/api/repository/proposals/${item.id}/view-pdf`
                                : "#"
                            }
                            target={item.isDbRecord ? "_blank" : undefined}
                            rel={item.isDbRecord ? "noreferrer" : undefined}
                            className="inline-flex items-center gap-1 bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-800 transition-all shadow-xs"
                          >
                            <Eye size={13} />
                            Baca PDF
                          </a>
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