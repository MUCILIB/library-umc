// import { authClient } from "@/lib/auth-client";
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// import { useNavigate } from "react-router";
import Navbar from "@/components/ui/navbar";
// import Handle from "@/pages/handlelogout"
import Background from "@/assets/hero-bg.jpeg";
import DialogUnauthorized from "@/components/DialogUnauthorized";

export default function Home() {
  return (
    <div className="w-full min-h-screen bg-gray-50">
      <div>
        <div className="absolute w-full">
          <Navbar />
          <DialogUnauthorized />
        </div>
        {/* halaman pertama */}
        <div
          className="flex w-full h-screen items-center justify-center text-center bg-opacity-50"
          style={{
            backgroundImage: `url(${Background}`, // sesuaikan path gambar
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        >
          <div className="space-y-2">
            <div className="text-4xl font-bold text-white space-y-2">
              <h1>
                Perpustakaan
                <br /> Universitas Muhammadiyah Cirebon
              </h1>
              <p className="text-lg font-normal">
                Akses koleksi buku, jurnal, dan e-book resmi UMC
              </p>
            </div>
            {/* search */}
            <div className="bg-white rounded-xl shadow-lg p-6 mt-6">
              <div className="flex flex-col space-y-4">
                {/* Input Search & Dropdown */}
                <div className="flex items-center space-x-2">
                  <div className="relative flex-grow">
                    <input
                      type="text"
                      placeholder="Cari Judul, penulis, ISBN, atau kata kunci"
                      className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 absolute left-3 top-3.5 text-gray-400"
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
                  <select className="px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500">
                    <option>Penulis</option>
                    <option>Judul</option>
                    <option>ISBN</option>
                    <option>Kata Kunci</option>
                  </select>
                </div>

                {/* Tombol Telusuri Koleksi */}
                <button className="bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-6 rounded-full transition-colors duration-200">
                  Telusuri Koleksi
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
