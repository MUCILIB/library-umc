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
      alert("Silakan masukkan kata kunci pencarian");
      return;
    }

    // Navigate to Katalog page with search parameters
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

  return (
    <div className="w-full min-h-screen bg-muted">
      <div>
        <div className="absolute w-full">
          <Navbar />
          <DialogUnauthorized />
        </div>

        {/* Hero Section with Search */}
        <div
          className="flex w-full h-screen items-center justify-center text-center"
          style={{
            backgroundImage: `url(${Background})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat"
          }}
        >
          {/* Perbaikan: Menambahkan flex, flex-col, dan items-center di sini */}
          <div className="flex flex-col items-center space-y-3 sm:space-y-4 px-4 sm:px-6 w-full">
            <div className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white space-y-2">
              <h1>
                Perpustakaan
                <br /> Universitas Muhammadiyah Cirebon
              </h1>
              <p className="text-base sm:text-lg font-normal">
                Akses koleksi buku, jurnal, dan e-book resmi UMC
              </p>
            </div>

            {/* Search Bar - Sekarang dijamin 100% presisi di tengah */}
            <div className="bg-card rounded-xl shadow-lg p-4 sm:p-6 mt-6 w-full sm:max-w-2xl text-left">
              <div className="flex flex-col space-y-3 sm:space-y-4">
                {/* Input Search & Dropdown */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:space-x-2">
                  <div className="relative grow">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Cari Judul, penulis, ISBN..."
                      className="w-full px-4 py-2.5 sm:py-3 pl-10 border text-sm sm:text-base text-foreground border-border rounded-full focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 absolute left-3 top-3.5 text-muted-foreground"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                  <Select value={searchType} onValueChange={setSearchType}>
                    <SelectTrigger className="w-full sm:w-[130px] rounded-full h-[42px] sm:h-[48px] px-4 border border-border bg-card text-foreground focus:ring-2 focus:ring-primary">
                      <SelectValue placeholder="Pilih tipe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua</SelectItem>
                      <SelectItem value="title">Judul</SelectItem>
                      <SelectItem value="author">Penulis</SelectItem>
                      <SelectItem value="isbn">ISBN</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Tombol Telusuri Koleksi - Diubah agar selalu full */}
                <div className="w-full pt-2">
                  <button
                    onClick={handleSearch}
                    className="w-full bg-primary hover:bg-primary/90 font-medium py-2.5 sm:py-3 px-6 rounded-full transition-colors duration-200 text-sm sm:text-base text-white"
                  >
                    Telusuri Koleksi
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pintasan */}
      <div className="w-full p-4 sm:p-6 lg:p-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 px-2 sm:px-4 lg:px-16 text-foreground">
          {/* Card 1 */}
          <a
            href="/katalog"
            className="flex flex-col items-center text-center shadow-lg rounded-lg p-6 bg-card hover:shadow-xl transition-shadow h-full"
          >
            <span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="60px"
                height="60px"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-book-open-text text-primary sm:h-20"
              >
                <path d="M12 7v14" />
                <path d="M16 12h2" />
                <path d="M16 8h2" />
                <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
                <path d="M6 12h2" />
                <path d="M6 8h2" />
              </svg>
            </span>
            <h2 className="text-base sm:text-lg font-bold mt-3 sm:mt-4">
              Katalog Online
            </h2>
            <p className="text-[12px] text-muted-foreground mt-2">
              Telusuri koleksi buku dan e-book perpustakaan UMC
            </p>
          </a>

          {/* Card 2 */}
          <a
            href="e-resource"
            className="flex flex-col items-center text-center shadow-lg rounded-lg p-4 sm:p-6 bg-card hover:shadow-xl transition-shadow h-full"
          >
            <span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="60px"
                height="60px"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-file-minus text-primary sm:w-20 sm:h-20"
              >
                <path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" />
                <path d="M14 2v5a1 1 0 0 0 1 1h5" />
                <path d="M9 15h6" />
              </svg>
            </span>
            <h2 className="text-base sm:text-lg font-bold mt-3 sm:mt-4">
              Repositori Digital
            </h2>
            <p className="text-[10px] sm:text-[12px] text-muted-foreground mt-2">
              Akses jurnal, skripsi, dan publikasi ilmiah UMC
            </p>
          </a>

          {/* Card 3 */}
          <Link
            to="/lokasi"
            className="flex flex-col items-center text-center shadow-lg rounded-lg p-4 sm:p-6 bg-card hover:shadow-xl transition-shadow h-full"
          >
            <span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="60px"
                height="60px"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-map-pinned-icon lucide-map-pinned text-primary sm:w-20 sm:h-20"
              >
                <path d="M18 8c0 3.613-3.869 7.429-5.393 8.795a1 1 0 0 1-1.214 0C9.87 15.429 6 11.613 6 8a6 6 0 0 1 12 0" />
                <circle cx="12" cy="8" r="2" />
                <path d="M8.714 14h-3.71a1 1 0 0 0-.948.683l-2.004 6A1 1 0 0 0 3 22h18a1 1 0 0 0 .948-1.316l-2-6a1 1 0 0 0-.949-.684h-3.712" />
              </svg>
            </span>
            <h2 className="text-base sm:text-lg font-bold mt-3 sm:mt-4">
              Informasi Lokasi
            </h2>
            <p className="text-[10px] sm:text-[12px] text-muted-foreground mt-2">
              Temukan lokasi perpustakaan dan fasilitasnya
            </p>
          </Link>

          {/* Card 4 */}
          <a
            href="/katalog"
            className="flex flex-col items-center text-center shadow-lg rounded-lg p-4 sm:p-6 bg-card hover:shadow-xl transition-shadow h-full"
          >
            <span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="60px"
                height="60px"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-book-plus-icon lucide-book-plus text-primary sm:w-20 sm:h-20"
              >
                <path d="M12 7v6" />
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" />
                <path d="M9 10h6" />
              </svg>
            </span>
            <h2 className="text-base sm:text-lg font-bold mt-3 sm:mt-4">
              Koleksi Terbaru
            </h2>
            <p className="text-[10px] sm:text-[12px] text-muted-foreground mt-2">
              Lihat koleksi buku terbaru yang tersedia
            </p>
          </a>
        </div>
      </div>

      {/* Daftar buku dan Ebook */}
      <div className="p-4 sm:p-6 lg:p-12.5 flex justify-center">
        <HomeBookList />
      </div>

      {/* Footer */}
      <div>
        <Footer />
      </div>
    </div>
  );
}
