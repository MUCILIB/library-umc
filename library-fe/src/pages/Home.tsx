import Navbar from "@/components/ui/navbar";
// import Handle from "@/pages/handlelogout"
import Background from "@/assets/bg1.jpeg";
import DialogUnauthorized from "@/components/DialogUnauthorized";
import Footer from "@/components/Footer";
import BookList from "@/components/BookList";

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
          className="flex w-full h-screen items-center justify-center text-center"
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
                      className="w-full px-4 py-3 pl-10 border text-black border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500"
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
                  <select className="px-4 py-3 border text-black border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500">
                    <option>Penulis</option>
                    <option>Judul</option>
                    <option>ISBN</option>
                    <option>Kata Kunci</option>
                  </select>
                </div>

                {/* Tombol Telusuri Koleksi */}
                <button className="bg-red-600 hover:bg-red-700 font-medium py-3 px-6 rounded-full transition-colors duration-200">
                  Telusuri Koleksi
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Pintasan */}
      <div className="w-full p-6 lg:p-[40px]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 px-4 lg:px-16">
          {/* Card 1 */}
          <a
            href="#"
            className="flex flex-col items-center text-center shadow-lg rounded-lg p-6 bg-white hover:shadow-xl transition-shadow h-full"
          >
            <span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="80px"
                height="80px"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-book-open-text text-red-700"
              >
                <path d="M12 7v14" />
                <path d="M16 12h2" />
                <path d="M16 8h2" />
                <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
                <path d="M6 12h2" />
                <path d="M6 8h2" />
              </svg>
            </span>
            <h2 className="text-lg font-bold mt-4">Katalog Online</h2>
            <p className="text-[12px] text-gray-600 mt-2">
              Lorem ipsum dolor sit amet, consectetur adipisicing elit. Ducimus,
              distinctio.
            </p>
          </a>

          {/* Card 2 */}
          <a
            href="#"
            className="flex flex-col items-center text-center shadow-lg rounded-lg p-6 bg-white hover:shadow-xl transition-shadow h-full"
          >
            <span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="80px"
                height="80px"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-file-minus text-red-700"
              >
                <path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" />
                <path d="M14 2v5a1 1 0 0 0 1 1h5" />
                <path d="M9 15h6" />
              </svg>
            </span>
            <h2 className="text-lg font-bold mt-4">Repositori Digital</h2>
            <p className="text-[12px] text-gray-600 mt-2">
              Lorem ipsum dolor sit amet, consectetur adipisicing elit. Ducimus,
              distinctio.
            </p>
          </a>

          {/* Card 3 */}
          <a
            href="#"
            className="flex flex-col items-center text-center shadow-lg rounded-lg p-6 bg-white hover:shadow-xl transition-shadow h-full"
          >
            <span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="80px"
                height="80px"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                className="lucide lucide-map-pinned-icon lucide-map-pinned text-red-700"
              >
                <path d="M18 8c0 3.613-3.869 7.429-5.393 8.795a1 1 0 0 1-1.214 0C9.87 15.429 6 11.613 6 8a6 6 0 0 1 12 0" />
                <circle cx="12" cy="8" r="2" />
                <path d="M8.714 14h-3.71a1 1 0 0 0-.948.683l-2.004 6A1 1 0 0 0 3 22h18a1 1 0 0 0 .948-1.316l-2-6a1 1 0 0 0-.949-.684h-3.712" />
              </svg>
            </span>
            <h2 className="text-lg font-bold mt-4">Informasi Lokasi</h2>
            <p className="text-[12px] text-gray-600 mt-2">
              Lorem ipsum dolor sit amet, consectetur adipisicing elit. Ducimus,
              distinctio.
            </p>
          </a>

          {/* Card 4 */}
          <a
            href="#"
            className="flex flex-col items-center text-center shadow-lg rounded-lg p-6 bg-white hover:shadow-xl transition-shadow h-full"
          >
            <span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="80px"
                height="80px"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                className="lucide lucide-book-plus-icon lucide-book-plus text-red-700"
              >
                <path d="M12 7v6" />
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" />
                <path d="M9 10h6" />
              </svg>
            </span>
            <h2 className="text-lg font-bold mt-4">Katalog Online</h2>
            <p className="text-[12px] text-gray-600 mt-2">
              Lorem ipsum dolor sit amet, consectetur adipisicing elit. Ducimus,
              distinctio.
            </p>
          </a>
        </div>
      </div>
      {/* Pintasan end */}

      {/* Daftar buku dan Ebook */}

      <div className="p-6 lg:p-[50px]">
        <BookList />
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
