// src/pages/Katalog.tsx
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router";
import Navbar from "@/components/ui/navbar";
import Footer from "@/components/Footer";
import BookList from "@/components/BookList";
import Background from "@/assets/bg-new.jpeg";
import { Search, RotateCcw, Filter, X } from "lucide-react";
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
  const currentUser = session?.user ? {
    id: session.user.id,
    name: session.user.name ?? undefined,
    email: session.user.email,
    role: (session?.user as any)?.role ?? "member"
  } : null;

  // Initialize state from URL parameters
  const [searchQuery, setSearchQuery] = useState(
    searchParams.get("search") || "",
  );
  const [searchType, setSearchType] = useState(
    searchParams.get("type") || "all",
  );
  const [availabilityFilter, setAvailabilityFilter] = useState<string[]>([]);
  const [yearRange, setYearRange] = useState({ start: "", end: "" });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState<string>("");

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
    setSelectedFaculty("");
    setSearchParams({});
  };

  // Check if any filters are active
  const hasActiveFilters =
    searchQuery.length > 0 ||
    availabilityFilter.length > 0 ||
    yearRange.start ||
    yearRange.end ||
    selectedFaculty !== "";

  return (
    <div className="bg-slate-50 min-h-screen flex flex-col">
      <Navbar />

      {/* Hero Search Section */}
      <div
        className="relative w-full flex flex-col justify-center items-center px-4 md:px-8 py-16 md:py-24"
        style={{
          backgroundImage: `linear-gradient(rgba(180, 0, 0, 0.75), rgba(180, 0, 0, 0.85)), url(${Background})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="max-w-4xl w-full text-center space-y-6">
          <h1 className="text-white text-3xl md:text-5xl font-extrabold tracking-tight">
            Telusuri Koleksi <span className="text-yellow-400">Perpustakaan</span>
          </h1>
          <p className="text-white/80 text-sm md:text-base max-w-2xl mx-auto px-4">
            Temukan ribuan koleksi buku fisik dan digital terbaik Universitas Muhammadiyah Cirebon untuk mendukung kegiatan akademik Anda.
          </p>

          <div className="bg-card rounded-2xl md:rounded-full p-2 shadow-2xl flex flex-col md:flex-row items-stretch md:items-center gap-2 md:gap-0 mt-8 mx-2 sm:mx-0 border border-white/10 backdrop-blur-md">
            {/* Kolom Input Pencarian */}
            <div className="flex items-center grow px-4 gap-3 bg-muted/30 md:bg-transparent rounded-xl md:rounded-none py-3 md:py-0">
              <Search className="text-muted-foreground w-5 h-5 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Cari Judul, Penulis, atau ISBN..."
                className="w-full outline-none text-foreground placeholder-muted-foreground bg-transparent text-sm md:text-base font-medium"
              />
            </div>

            {/* Garis Pembatas (Desktop) */}
            <div className="hidden md:block w-[1px] h-8 bg-border mx-3"></div>

            {/* Dropdown Kategori Pencarian (Shadcn UI) */}
            <div className="w-full md:w-auto px-2 md:px-0">
              <Select value={searchType} onValueChange={(val) => setSearchType(val)}>
                <SelectTrigger className="w-full md:w-[170px] bg-muted/30 md:bg-transparent border-none text-muted-foreground focus:ring-0 focus:ring-offset-0 focus:ring-transparent focus:outline-none text-sm font-semibold h-12 justify-between rounded-xl md:rounded-none px-4 cursor-pointer">
                  <SelectValue placeholder="Pilih Kategori" />
                </SelectTrigger>
                <SelectContent className="bg-popover text-popover-foreground border-border rounded-xl">
                  <SelectItem value="all" className="font-semibold text-sm">Semua Kategori</SelectItem>
                  <SelectItem value="title" className="font-semibold text-sm">Judul</SelectItem>
                  <SelectItem value="author" className="font-semibold text-sm">Penulis</SelectItem>
                  <SelectItem value="isbn" className="font-semibold text-sm">ISBN</SelectItem>
                  <SelectItem value="subject" className="font-semibold text-sm">Subjek</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tombol Cari */}
            <div className="p-0.5 md:p-0">
              <button
                onClick={handleSearch}
                className="w-full md:w-auto bg-primary hover:bg-primary/95 text-white px-8 py-3.5 md:py-4 rounded-xl md:rounded-full font-extrabold text-sm md:text-base transition-all active:scale-[0.98] shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              >
                <Search className="w-4 h-4 md:hidden" />
                Cari Koleksi
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content: Filter & Hasil */}
      <main className="max-w-7xl mx-auto py-8 px-4 md:px-8 grow w-full">
        {/* Mobile Filter Toggle */}
        <div className="lg:hidden flex justify-between items-center mb-6">
          <div className="text-sm font-medium text-muted-foreground">
            {hasActiveFilters ? "Filter aktif diterapkan" : "Menampilkan semua koleksi"}
          </div>
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="flex items-center gap-2 bg-card px-4 py-2.5 rounded-xl border border-border text-sm font-bold text-foreground shadow-sm active:scale-95 transition-all"
          >
            <Filter className="w-4 h-4 text-primary" /> Filter
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Filter (Kiri) */}
          <aside className={`
            fixed inset-0 z-[60] lg:relative lg:inset-auto lg:z-0 lg:w-1/4 
            transition-transform duration-300 ease-in-out lg:translate-x-0
            ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
          `}>
            {/* Backdrop for mobile */}
            {isSidebarOpen && (
              <div 
                className="fixed inset-0 bg-black/60 lg:hidden backdrop-blur-sm"
                onClick={() => setIsSidebarOpen(false)}
              />
            )}
            
            <div className="relative bg-card h-full lg:h-auto p-6 rounded-none lg:rounded-2xl shadow-2xl lg:shadow-sm border-r lg:border border-border overflow-y-auto w-[280px] sm:w-[320px] lg:w-full">
              <div className="flex justify-between items-center mb-8">
                <h2 className="font-bold text-foreground text-lg flex items-center gap-2">
                  <Filter className="w-5 h-5 text-primary" /> Filter Pencarian
                </h2>
                <button 
                  onClick={() => setIsSidebarOpen(false)}
                  className="lg:hidden p-2 rounded-full hover:bg-muted transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              <div className="space-y-8">
                {/* Reset Button */}
                <button
                  onClick={handleResetFilters}
                  disabled={!hasActiveFilters}
                  className={`w-full py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 uppercase tracking-wider transition-all border ${
                    !hasActiveFilters 
                    ? "bg-muted text-muted-foreground border-border cursor-not-allowed" 
                    : "bg-red-50 text-primary border-red-100 hover:bg-red-100"
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reset Semua Filter
                </button>

                {/* Filter: Ketersediaan */}
                <div>
                  <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-4">
                    Ketersediaan
                  </h3>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 group cursor-pointer">
                      <div className="relative flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={availabilityFilter.includes("available")}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAvailabilityFilter([...availabilityFilter, "available"]);
                            } else {
                              setAvailabilityFilter(availabilityFilter.filter((f) => f !== "available"));
                            }
                          }}
                          className="peer appearance-none w-5 h-5 border-2 border-border rounded-md checked:bg-primary checked:border-primary transition-all"
                        />
                        <svg className="absolute w-3 h-3 text-white hidden peer-checked:block pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">Tersedia Sekarang</span>
                    </label>
                    <label className="flex items-center gap-3 group cursor-pointer">
                      <div className="relative flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={availabilityFilter.includes("borrowed")}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAvailabilityFilter([...availabilityFilter, "borrowed"]);
                            } else {
                              setAvailabilityFilter(availabilityFilter.filter((f) => f !== "borrowed"));
                            }
                          }}
                          className="peer appearance-none w-5 h-5 border-2 border-border rounded-md checked:bg-primary checked:border-primary transition-all"
                        />
                        <svg className="absolute w-3 h-3 text-white hidden peer-checked:block pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">Sedang Dipinjam</span>
                    </label>
                  </div>
                </div>

                {/* Filter: Fakultas Dropdown */}
                <div>
                  <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2.5">
                    Fakultas
                  </h3>
                  <Select
                    value={selectedFaculty || "all"}
                    onValueChange={(val) => {
                      setSelectedFaculty(val === "all" ? "" : val);
                    }}
                  >
                    <SelectTrigger className="w-full h-11 rounded-xl bg-muted border-border font-semibold text-foreground text-left focus:ring-2 focus:ring-red-100 focus:border-primary transition-all cursor-pointer">
                      <SelectValue placeholder="Semua Fakultas" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover text-popover-foreground border-border rounded-xl">
                      <SelectItem value="all">Semua Fakultas</SelectItem>
                      {faculties.map((fac) => (
                        <SelectItem key={fac.id} value={String(fac.id)}>{fac.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Filter: Tahun Terbit */}
                <div>
                  <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-4">
                    Tahun Terbit
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <span className="text-[10px] text-muted-foreground font-bold uppercase ml-1 tracking-tighter">Mulai</span>
                      <input
                        type="number"
                        value={yearRange.start}
                        onChange={(e) => setYearRange({ ...yearRange, start: e.target.value })}
                        placeholder="1990"
                        className="w-full p-3 bg-muted border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-100 focus:border-primary transition-all"
                        min="1900"
                        max={new Date().getFullYear()}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <span className="text-[10px] text-muted-foreground font-bold uppercase ml-1 tracking-tighter">Sampai</span>
                      <input
                        type="number"
                        value={yearRange.end}
                        onChange={(e) => setYearRange({ ...yearRange, end: e.target.value })}
                        placeholder="2025"
                        className="w-full p-3 bg-muted border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-100 focus:border-primary transition-all"
                        min="1900"
                        max={new Date().getFullYear()}
                      />
                    </div>
                  </div>
                </div>

                {/* Active Filters Summary */}
                {hasActiveFilters && (
                  <div className="pt-6 border-t border-border">
                    <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
                      Filter Aktif
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {searchQuery && (
                        <span className="px-3 py-1.5 bg-red-50 text-primary rounded-lg text-[10px] font-bold border border-red-100">
                          "{searchQuery}"
                        </span>
                      )}
                      {availabilityFilter.map((filter) => (
                        <span key={filter} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-[10px] font-bold border border-blue-100">
                          {filter === "available" ? "Tersedia" : "Dipinjam"}
                        </span>
                      ))}
                      {selectedFaculty && (
                        <span className="px-3 py-1.5 bg-yellow-50 text-yellow-800 rounded-lg text-[10px] font-bold border border-yellow-100">
                          Fakultas: {faculties.find((f) => String(f.id) === selectedFaculty)?.name?.replace(/ \(.*\)/, "") || selectedFaculty}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </aside>

          {/* List Hasil (Kanan) */}
          <section className="w-full lg:w-3/4">
            <BookList
              searchQuery={searchQuery}
              searchType={searchType}
              availabilityFilter={availabilityFilter}
              yearRange={yearRange}
              currentUser={currentUser}
              selectedFaculty={selectedFaculty}
            />
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Katalog;
