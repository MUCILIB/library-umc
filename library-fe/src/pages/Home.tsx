// src/pages/Home.tsx
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router";
import Navbar from "@/components/ui/navbar";
import Background from "@/assets/bg1.jpeg";
import DialogUnauthorized from "@/components/DialogUnauthorized";
import Footer from "@/components/Footer";
import HomeBookList from "@/components/HomeBookList";
import { authClient } from "@/utils/auth-client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  ArrowRight,
  BookOpen,
  FileText,
  MapPin,
  BookPlus,
} from "lucide-react";

export default function Home() {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();

  // Redirect admin to dashboard
  useEffect(() => {
    if (session?.user) {
      const role = (session.user as any).role;
      if (role === "super_admin" || role === "staff") {
        navigate("/dashboard/super-admin");
      }
    }
  }, [session, navigate]);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState("all");

  // Handle search and redirect to Katalog page
  const handleSearch = () => {
    if (!searchQuery.trim()) {
      navigate("/katalog");
      return;
    }

    navigate(
      `/katalog?search=${encodeURIComponent(searchQuery)}&type=${searchType}`
    );
  };

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // Handle quick search suggestions
  const handleTagClick = (tag: string) => {
    setSearchQuery(tag);
    navigate(`/katalog?search=${encodeURIComponent(tag)}&type=all`);
  };

  return (
    <div className="w-full min-h-screen bg-[#F8FAFC] dark:bg-muted selection:bg-red-500/20">
      <div>
        <div className="absolute w-full z-30">
          <Navbar />
          <DialogUnauthorized />
        </div>

        {/* Hero Section with Search - Full screen on mobile (100dvh) with vertical optical centering */}
        <div
          className="relative w-full min-h-[100dvh] sm:min-h-[580px] lg:min-h-[640px] flex flex-col justify-center pt-20 pb-12 sm:pt-28 sm:pb-20"
          style={{
            backgroundImage: `linear-gradient(to bottom right, rgba(28, 7, 10, 0.94) 0%, rgba(28, 7, 10, 0.78) 50%, rgba(28, 7, 10, 0.40) 100%), url(${Background})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="max-w-3xl text-left">
              {/* Heading */}
              <h1 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl lg:text-[54px] font-black text-white leading-[1.18] sm:leading-[1.12] tracking-tight">
                Perpustakaan
                <br />
                Universitas Muhammadiyah Cirebon
              </h1>

              {/* Subtitle */}
              <p className="text-xs sm:text-base md:text-lg text-white/85 font-normal mt-2 sm:mt-4 max-w-xl">
                Akses Koleksi buku, jurnal, dan e-book resmi UMC
              </p>

              {/* Search Bar Capsule */}
              <div className="bg-white rounded-full shadow-2xl p-1.5 sm:p-2 pl-3 sm:pl-5 flex items-center gap-1.5 sm:gap-2 max-w-2xl w-full border border-white/20 mt-6 sm:mt-8">
                <Search size={18} className="text-slate-400 shrink-0 ml-0.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Cari judul, penulis, ISBN..."
                  className="w-full bg-transparent border-0 outline-none focus:outline-none focus:ring-0 text-slate-800 text-xs sm:text-sm md:text-base placeholder:text-slate-400 px-1 sm:px-2 min-w-0"
                />

                {/* Filter Dropdown */}
                <div className="shrink-0">
                  <Select value={searchType} onValueChange={setSearchType}>
                    <SelectTrigger className="w-auto h-8 sm:h-9 rounded-full border border-slate-200 bg-slate-50/90 text-slate-700 text-[11px] sm:text-sm font-medium px-2 sm:px-4 gap-1 sm:gap-1.5 focus:ring-0 focus:border-slate-300 shadow-none cursor-pointer">
                      <SelectValue placeholder="Semua" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Koleksi</SelectItem>
                      <SelectItem value="title">Judul</SelectItem>
                      <SelectItem value="author">Penulis</SelectItem>
                      <SelectItem value="isbn">ISBN</SelectItem>
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

              {/* Contoh Pencarian Chips */}
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-4 sm:mt-5 text-xs sm:text-sm text-white/90">
                <span className="text-white/80 font-normal text-[11px] sm:text-xs">Contoh:</span>
                {["Pemrograman", "Manajemen", "Algoritma", "Jurnal"].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleTagClick(tag)}
                    className="rounded-full border border-white/30 bg-black/25 backdrop-blur-xs text-white text-[11px] sm:text-xs px-2.5 sm:px-3.5 py-0.5 sm:py-1 hover:bg-white/20 hover:border-white/50 transition-all cursor-pointer"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pintasan Fitur Utama - Responsif tanpa memotong Hero di HP */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 sm:-mt-8 md:-mt-10 relative z-10 mb-10 sm:mb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-6">
          {/* Card 1: Katalog Online */}
          <Link
            to="/katalog"
            className="bg-white dark:bg-card rounded-2xl p-4 sm:p-6 shadow-sm hover:shadow-xl border border-slate-100 dark:border-border/60 transition-all duration-300 hover:-translate-y-1.5 group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-red-50 dark:bg-red-950/30 text-[#9D171D] dark:text-red-400 flex items-center justify-center transition-transform group-hover:scale-105">
                <BookOpen size={22} className="sm:w-6 sm:h-6" strokeWidth={2} />
              </div>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-50 dark:bg-muted border border-slate-100 dark:border-border flex items-center justify-center text-slate-400 group-hover:bg-[#9D171D] group-hover:text-white group-hover:border-[#9D171D] transition-all">
                <ArrowRight size={13} className="sm:w-3.5 sm:h-3.5" />
              </div>
            </div>
            <div>
              <h2 className="text-sm sm:text-base md:text-lg font-bold text-slate-900 dark:text-foreground mt-3.5 sm:mt-5 mb-1 group-hover:text-[#9D171D] transition-colors">
                Katalog Online
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400 dark:text-muted-foreground leading-relaxed">
                Lihat koleksi buku, e-book dan ketersediaan secara real-time
              </p>
            </div>
          </Link>

          {/* Card 2: Repositori Digital */}
          <Link
            to="/e-resource"
            className="bg-white dark:bg-card rounded-2xl p-4 sm:p-6 shadow-sm hover:shadow-xl border border-slate-100 dark:border-border/60 transition-all duration-300 hover:-translate-y-1.5 group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-red-50 dark:bg-red-950/30 text-[#9D171D] dark:text-red-400 flex items-center justify-center transition-transform group-hover:scale-105">
                <FileText size={22} className="sm:w-6 sm:h-6" strokeWidth={2} />
              </div>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-50 dark:bg-muted border border-slate-100 dark:border-border flex items-center justify-center text-slate-400 group-hover:bg-[#9D171D] group-hover:text-white group-hover:border-[#9D171D] transition-all">
                <ArrowRight size={13} className="sm:w-3.5 sm:h-3.5" />
              </div>
            </div>
            <div>
              <h2 className="text-sm sm:text-base md:text-lg font-bold text-slate-900 dark:text-foreground mt-3.5 sm:mt-5 mb-1 group-hover:text-[#9D171D] transition-colors">
                Repositori Digital
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400 dark:text-muted-foreground leading-relaxed">
                Akses link repositori dan jurnal UMC
              </p>
            </div>
          </Link>

          {/* Card 3: Informasi Lokasi */}
          <Link
            to="/lokasi"
            className="bg-white dark:bg-card rounded-2xl p-4 sm:p-6 shadow-sm hover:shadow-xl border border-slate-100 dark:border-border/60 transition-all duration-300 hover:-translate-y-1.5 group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-red-50 dark:bg-red-950/30 text-[#9D171D] dark:text-red-400 flex items-center justify-center transition-transform group-hover:scale-105">
                <MapPin size={22} className="sm:w-6 sm:h-6" strokeWidth={2} />
              </div>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-50 dark:bg-muted border border-slate-100 dark:border-border flex items-center justify-center text-slate-400 group-hover:bg-[#9D171D] group-hover:text-white group-hover:border-[#9D171D] transition-all">
                <ArrowRight size={13} className="sm:w-3.5 sm:h-3.5" />
              </div>
            </div>
            <div>
              <h2 className="text-sm sm:text-base md:text-lg font-bold text-slate-900 dark:text-foreground mt-3.5 sm:mt-5 mb-1 group-hover:text-[#9D171D] transition-colors">
                Informasi Lokasi
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400 dark:text-muted-foreground leading-relaxed">
                Lihat lokasi perpustakaan melalui peta digital untuk memudahkan kunjungan
              </p>
            </div>
          </Link>

          {/* Card 4: Pinjam Buku */}
          <Link
            to="/katalog"
            className="bg-white dark:bg-card rounded-2xl p-4 sm:p-6 shadow-sm hover:shadow-xl border border-slate-100 dark:border-border/60 transition-all duration-300 hover:-translate-y-1.5 group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-red-50 dark:bg-red-950/30 text-[#9D171D] dark:text-red-400 flex items-center justify-center transition-transform group-hover:scale-105">
                <BookPlus size={22} className="sm:w-6 sm:h-6" strokeWidth={2} />
              </div>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-50 dark:bg-muted border border-slate-100 dark:border-border flex items-center justify-center text-slate-400 group-hover:bg-[#9D171D] group-hover:text-white group-hover:border-[#9D171D] transition-all">
                <ArrowRight size={13} className="sm:w-3.5 sm:h-3.5" />
              </div>
            </div>
            <div>
              <h2 className="text-sm sm:text-base md:text-lg font-bold text-slate-900 dark:text-foreground mt-3.5 sm:mt-5 mb-1 group-hover:text-[#9D171D] transition-colors">
                Pinjam Buku
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400 dark:text-muted-foreground leading-relaxed">
                Kelola peminjaman buku fisik dan akses reservasi koleksi
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* Koleksi Terbaru Section */}
      <div id="koleksi-terbaru" className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pb-12 sm:pb-20">
        <HomeBookList />
      </div>

      {/* Footer */}
      <div>
        <Footer />
      </div>
    </div>
  );
}
