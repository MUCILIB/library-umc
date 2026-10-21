// src/pages/Katalog.tsx
import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router";
import Navbar from "@/components/ui/navbar";
import Footer from "@/components/Footer";
import BookList from "@/components/BookList";
import Background from "@/assets/bg1.jpeg";
import { Search, Filter, X, ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import { authClient } from "@/utils/auth-client";
import { API_BASE_URL } from "@/utils/api-config";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Katalog = () => {
  // Search parameters from URL
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: session } = authClient.useSession();
  const currentUser = session?.user
    ? {
        id: session.user.id,
        name: session.user.name ?? undefined,
        email: session.user.email,
        role: (session?.user as any)?.role ?? "member",
      }
    : null;

  // Initialize state from URL parameters
  const [searchQuery, setSearchQuery] = useState(
    searchParams.get("search") || ""
  );
  const [searchType, setSearchType] = useState(
    searchParams.get("type") || "all"
  );
  const [availabilityFilter, setAvailabilityFilter] = useState<string[]>([]);
  const [yearRange, setYearRange] = useState({ start: "", end: "" });
  const [collectionTypeFilter, setCollectionTypeFilter] = useState<string[]>([
    "physical_book",
  ]);
  const [collectionCounts, setCollectionCounts] = useState({
    physical: 0,
    ebook: 0,
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState<string>(
    searchParams.get("faculty") || ""
  );
  const [selectedStudyProgram, setSelectedStudyProgram] = useState<string>(
    searchParams.get("prodi") || ""
  );

  // Accordion state untuk filter sidebar
  const [openSections, setOpenSections] = useState({
    ketersediaan: true,
    tahun: true,
    koleksi: true,
    fakultas: Boolean(searchParams.get("faculty")),
    prodi: Boolean(searchParams.get("prodi")),
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Fetch faculties from backend for filter
  const [faculties, setFaculties] = useState<{ id: number; name: string }[]>([]);
  useEffect(() => {
    const fetchFaculties = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/faculties`);
        const json = await response.json();
        if (json.success && Array.isArray(json.data)) {
          setFaculties(json.data);
        }
      } catch (error) {
        console.error("Gagal mengambil fakultas:", error);
      }
    };
    fetchFaculties();
  }, []);

  // Fetch study programs from backend for filter
  const [studyPrograms, setStudyPrograms] = useState<
    { id: number; name: string; facultyId?: number; faculty?: { id: number; name: string } }[]
  >([]);
  useEffect(() => {
    const fetchStudyPrograms = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/study-programs`);
        const json = await response.json();
        if (json.success && Array.isArray(json.data)) {
          setStudyPrograms(json.data);
        }
      } catch (error) {
        console.error("Gagal mengambil program studi:", error);
      }
    };
    fetchStudyPrograms();
  }, []);

  // Filter daftar prodi berdasarkan fakultas yang dipilih
  const availableStudyPrograms = selectedFaculty
    ? studyPrograms.filter(
        (sp) =>
          sp.facultyId === Number(selectedFaculty) ||
          sp.faculty?.id === Number(selectedFaculty)
      )
    : studyPrograms;

  const handleFacultyChange = (val: string) => {
    const facultyId = val === "all" ? "" : val;
    setSelectedFaculty(facultyId);
    if (facultyId && selectedStudyProgram) {
      const belongs = studyPrograms.some(
        (sp) =>
          String(sp.id) === selectedStudyProgram &&
          (sp.facultyId === Number(facultyId) || sp.faculty?.id === Number(facultyId))
      );
      if (!belongs) {
        setSelectedStudyProgram("");
      }
    }
  };

  const handleStudyProgramChange = (val: string) => {
    const spId = val === "all" ? "" : val;
    setSelectedStudyProgram(spId);
    if (spId) {
      const found = studyPrograms.find((sp) => String(sp.id) === spId);
      const facId = found?.facultyId || found?.faculty?.id;
      if (facId && (!selectedFaculty || Number(selectedFaculty) !== facId)) {
        setSelectedFaculty(String(facId));
        setOpenSections((prev) => ({ ...prev, fakultas: true, prodi: true }));
      }
    }
  };

  // Update search query when URL changes
  useEffect(() => {
    setSearchQuery(searchParams.get("search") || "");
    setSearchType(searchParams.get("type") || "all");
  }, [searchParams]);

  // Handle Search
  const handleSearch = () => {
    const params = new URLSearchParams(searchParams);
    if (searchQuery.trim()) {
      params.set("search", searchQuery.trim());
    } else {
      params.delete("search");
    }
    params.set("type", searchType);
    setSearchParams(params);
  };

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery("");
    setSearchType("all");
    setAvailabilityFilter([]);
    setYearRange({ start: "", end: "" });
    setCollectionTypeFilter(["physical_book"]);
    setSelectedFaculty("");
    setSelectedStudyProgram("");
    setSearchParams({});
  };

  const handleCountsChange = useCallback(
    (counts: { physical: number; ebook: number }) => {
      setCollectionCounts((prev) => {
        if (prev.physical === counts.physical && prev.ebook === counts.ebook) {
          return prev;
        }
        return counts;
      });
    },
    []
  );

  return (
    <div className="bg-[#F8FAFC] dark:bg-muted min-h-screen flex flex-col">
      <Navbar />

      {/* Hero Search Section */}
      <div
        className="relative w-full flex flex-col justify-center items-center px-4 md:px-8 pt-24 sm:pt-28 pb-12 sm:pb-16"
        style={{
          backgroundImage: `linear-gradient(to bottom right, rgba(28, 7, 10, 0.92) 0%, rgba(28, 7, 10, 0.78) 50%, rgba(28, 7, 10, 0.40) 100%), url(${Background})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="max-w-3xl w-full text-center space-y-3">
          <h1 className="text-white text-2xl sm:text-4xl md:text-5xl font-black tracking-tight">
            Telusuri Koleksi <span className="text-amber-400">Perpustakaan</span>
          </h1>
          <p className="text-white/80 text-xs sm:text-sm max-w-xl mx-auto font-normal">
            Temukan ribuan koleksi buku fisik dan digital terbaik Universitas Muhammadiyah Cirebon
          </p>

          {/* Search Bar Capsule */}
          <div className="bg-white rounded-full shadow-2xl p-1.5 sm:p-2 pl-3 sm:pl-5 flex items-center gap-1.5 sm:gap-2 max-w-2xl w-full border border-white/20 mt-6 mx-auto">
            <Search size={18} className="text-slate-400 shrink-0 ml-0.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Cari judul, penulis, ISBN, atau kata kunci..."
              className="w-full bg-transparent border-0 outline-none focus:outline-none focus:ring-0 text-slate-800 text-xs sm:text-sm placeholder:text-slate-400 px-1 sm:px-2 min-w-0"
            />

            {/* Filter Dropdown */}
            <div className="shrink-0">
              <Select value={searchType} onValueChange={(val) => setSearchType(val)}>
                <SelectTrigger className="w-auto h-8 sm:h-9 rounded-full border border-slate-200 bg-slate-50/90 text-slate-700 text-[11px] sm:text-sm font-medium px-2.5 sm:px-4 gap-1 focus:ring-0 focus:border-slate-300 shadow-none cursor-pointer">
                  <SelectValue placeholder="Semua" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kategori</SelectItem>
                  <SelectItem value="title">Judul</SelectItem>
                  <SelectItem value="author">Penulis</SelectItem>
                  <SelectItem value="isbn">ISBN</SelectItem>
                  <SelectItem value="subject">Subjek</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Search Action Button */}
            <button
              type="button"
              onClick={handleSearch}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#9D171D] hover:bg-[#7f1318] text-white flex items-center justify-center shrink-0 shadow-md active:scale-95 transition-all cursor-pointer"
              aria-label="Cari"
            >
              <ArrowRight size={16} className="sm:w-[18px] sm:h-[18px]" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content: Filter (Sidebar) & Hasil (Grid) */}
      <main className="max-w-7xl mx-auto py-8 sm:py-10 px-4 sm:px-6 lg:px-8 grow w-full">
        {/* Mobile Filter Toggle */}
        <div className="lg:hidden flex justify-between items-center mb-5">
          <span className="text-xs font-semibold text-slate-500">
            Filter & Pengaturan Koleksi
          </span>
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="flex items-center gap-1.5 bg-white px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 shadow-xs active:scale-95 transition-all"
          >
            <Filter size={14} className="text-[#9D171D]" /> Filter
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
          {/* Sidebar Filter (Kiri) Sesuai Referensi Gambar */}
          <aside
            className={`
              fixed inset-0 z-40 lg:relative lg:inset-auto lg:z-0 lg:w-64 xl:w-72 shrink-0
              transition-transform duration-300 ease-in-out lg:translate-x-0
              ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
            `}
          >
            {/* Backdrop for mobile */}
            {isSidebarOpen && (
              <div
                className="fixed inset-0 bg-black/50 lg:hidden backdrop-blur-xs"
                onClick={() => setIsSidebarOpen(false)}
              />
            )}

            <div className="relative bg-white dark:bg-card h-full lg:h-auto p-5 rounded-none lg:rounded-2xl shadow-xl lg:shadow-xs border border-slate-100 dark:border-border/60 overflow-y-auto w-[280px] sm:w-[320px] lg:w-full space-y-4">
              {/* Header Filter & Tombol RESET */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-border/60">
                <h2 className="font-bold text-slate-900 dark:text-foreground text-sm">
                  Filter Pencarian
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="text-xs font-bold text-red-600 hover:text-red-700 tracking-wider cursor-pointer uppercase"
                  >
                    RESET
                  </button>
                  <button
                    onClick={() => setIsSidebarOpen(false)}
                    className="lg:hidden p-1 rounded-md text-slate-400 hover:text-slate-600"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* 1. Ketersediaan */}
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => toggleSection("ketersediaan")}
                  className="w-full flex items-center justify-between text-xs font-bold text-slate-900 dark:text-foreground cursor-pointer"
                >
                  <span>Ketersediaan</span>
                  {openSections.ketersediaan ? (
                    <ChevronUp size={16} className="text-slate-400" />
                  ) : (
                    <ChevronDown size={16} className="text-slate-400" />
                  )}
                </button>

                {openSections.ketersediaan && (
                  <div className="space-y-2 pt-1 pl-1">
                    <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-600 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={availabilityFilter.includes("available")}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setAvailabilityFilter([...availabilityFilter, "available"]);
                          } else {
                            setAvailabilityFilter(
                              availabilityFilter.filter((f) => f !== "available")
                            );
                          }
                        }}
                        className="w-4 h-4 rounded text-[#9D171D] border-slate-300 accent-[#9D171D] cursor-pointer"
                      />
                      <span>Tersedia</span>
                    </label>

                    <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-600 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={availabilityFilter.includes("borrowed")}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setAvailabilityFilter([...availabilityFilter, "borrowed"]);
                          } else {
                            setAvailabilityFilter(
                              availabilityFilter.filter((f) => f !== "borrowed")
                            );
                          }
                        }}
                        className="w-4 h-4 rounded text-[#9D171D] border-slate-300 accent-[#9D171D] cursor-pointer"
                      />
                      <span>Dipinjam</span>
                    </label>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-100 dark:border-border/60" />

              {/* 2. Tahun Terbit */}
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => toggleSection("tahun")}
                  className="w-full flex items-center justify-between text-xs font-bold text-slate-900 dark:text-foreground cursor-pointer"
                >
                  <span>Tahun Terbit</span>
                  {openSections.tahun ? (
                    <ChevronUp size={16} className="text-slate-400" />
                  ) : (
                    <ChevronDown size={16} className="text-slate-400" />
                  )}
                </button>

                {openSections.tahun && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <input
                      type="number"
                      placeholder="Tahun Mulai"
                      value={yearRange.start}
                      onChange={(e) =>
                        setYearRange({ ...yearRange, start: e.target.value })
                      }
                      className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-muted border border-slate-200 dark:border-border rounded-lg text-xs placeholder:text-slate-400 text-slate-800 dark:text-foreground outline-none focus:border-[#9D171D] transition-colors"
                    />
                    <input
                      type="number"
                      placeholder="Tahun Akhir"
                      value={yearRange.end}
                      onChange={(e) =>
                        setYearRange({ ...yearRange, end: e.target.value })
                      }
                      className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-muted border border-slate-200 dark:border-border rounded-lg text-xs placeholder:text-slate-400 text-slate-800 dark:text-foreground outline-none focus:border-[#9D171D] transition-colors"
                    />
                  </div>
                )}
              </div>

              <div className="border-t border-slate-100 dark:border-border/60" />

              {/* 3. Jenis Koleksi */}
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => toggleSection("koleksi")}
                  className="w-full flex items-center justify-between text-xs font-bold text-slate-900 dark:text-foreground cursor-pointer"
                >
                  <span>Jenis Koleksi</span>
                  {openSections.koleksi ? (
                    <ChevronUp size={16} className="text-slate-400" />
                  ) : (
                    <ChevronDown size={16} className="text-slate-400" />
                  )}
                </button>

                {openSections.koleksi && (
                  <div className="space-y-2 pt-1 pl-1">
                    <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-600 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={collectionTypeFilter.includes("physical_book")}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setCollectionTypeFilter([
                              ...collectionTypeFilter,
                              "physical_book",
                            ]);
                          } else {
                            setCollectionTypeFilter(
                              collectionTypeFilter.filter(
                                (t) => t !== "physical_book"
                              )
                            );
                          }
                        }}
                        className="w-4 h-4 rounded text-[#9D171D] border-slate-300 accent-[#9D171D] cursor-pointer"
                      />
                      <span>Buku Fisik ({collectionCounts.physical || 0})</span>
                    </label>

                    <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-600 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={collectionTypeFilter.includes("ebook")}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setCollectionTypeFilter([
                              ...collectionTypeFilter,
                              "ebook",
                            ]);
                          } else {
                            setCollectionTypeFilter(
                              collectionTypeFilter.filter((t) => t !== "ebook")
                            );
                          }
                        }}
                        className="w-4 h-4 rounded text-[#9D171D] border-slate-300 accent-[#9D171D] cursor-pointer"
                      />
                      <span>E-Book ({collectionCounts.ebook || 0})</span>
                    </label>
                  </div>
                )}
              </div>

              {/* 4. Fakultas (Opsional) */}
              {faculties.length > 0 && (
                <>
                  <div className="border-t border-slate-100 dark:border-border/60" />
                  <div className="space-y-2.5">
                    <button
                      type="button"
                      onClick={() => toggleSection("fakultas")}
                      className="w-full flex items-center justify-between text-xs font-bold text-slate-900 dark:text-foreground cursor-pointer"
                    >
                      <span>Fakultas</span>
                      {openSections.fakultas ? (
                        <ChevronUp size={16} className="text-slate-400" />
                      ) : (
                        <ChevronDown size={16} className="text-slate-400" />
                      )}
                    </button>

                    {openSections.fakultas && (
                      <div className="pt-1">
                        <Select
                          value={selectedFaculty || "all"}
                          onValueChange={handleFacultyChange}
                        >
                          <SelectTrigger className="w-full h-9 rounded-lg bg-slate-50 dark:bg-muted border border-slate-200 dark:border-border text-xs font-medium text-slate-700 dark:text-foreground focus:ring-0">
                            <SelectValue placeholder="Semua Fakultas" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Semua Fakultas</SelectItem>
                            {faculties.map((fac) => (
                              <SelectItem key={fac.id} value={String(fac.id)}>
                                {fac.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* 5. Program Studi (Opsional) */}
              {studyPrograms.length > 0 && (
                <>
                  <div className="border-t border-slate-100 dark:border-border/60" />
                  <div className="space-y-2.5">
                    <button
                      type="button"
                      onClick={() => toggleSection("prodi")}
                      className="w-full flex items-center justify-between text-xs font-bold text-slate-900 dark:text-foreground cursor-pointer"
                    >
                      <span>Program Studi</span>
                      {openSections.prodi ? (
                        <ChevronUp size={16} className="text-slate-400" />
                      ) : (
                        <ChevronDown size={16} className="text-slate-400" />
                      )}
                    </button>

                    {openSections.prodi && (
                      <div className="pt-1">
                        <Select
                          value={selectedStudyProgram || "all"}
                          onValueChange={handleStudyProgramChange}
                        >
                          <SelectTrigger className="w-full h-9 rounded-lg bg-slate-50 dark:bg-muted border border-slate-200 dark:border-border text-xs font-medium text-slate-700 dark:text-foreground focus:ring-0">
                            <SelectValue placeholder="Semua Program Studi" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            <SelectItem value="all">Semua Program Studi</SelectItem>
                            {availableStudyPrograms.map((sp) => (
                              <SelectItem key={sp.id} value={String(sp.id)}>
                                {sp.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </aside>

          {/* List Hasil (Kanan) */}
          <section className="w-full min-w-0 flex-1">
            <BookList
              searchQuery={searchQuery}
              searchType={searchType}
              availabilityFilter={availabilityFilter}
              yearRange={yearRange}
              collectionTypeFilter={collectionTypeFilter}
              currentUser={currentUser}
              selectedFaculty={selectedFaculty}
              selectedStudyProgram={selectedStudyProgram}
              onCountsChange={handleCountsChange}
            />
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Katalog;
