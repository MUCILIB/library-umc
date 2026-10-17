import {
  MapPin,
  Clock,
  Phone,
  Mail,
  MapPinned,
  ExternalLink,
  Navigation,
} from "lucide-react";
import Navbar from "@/components/ui/navbar";
import Footer from "@/components/Footer";

export default function TentangPage() {
  const googleMapsUrl = "https://maps.app.goo.gl/v9gnnAVj762L1EbK8";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-muted/30">
      <Navbar />

      {/* Hero Banner */}
      <div className="bg-[#8E0C17] text-white py-12 sm:py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold mb-3 backdrop-blur-xs">
            <MapPin className="w-3.5 h-3.5" />
            <span>Lokasi Resmi</span>
          </div>
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black mb-3 tracking-tight">
            Informasi Lokasi Perpustakaan
          </h1>
          <p className="text-white/85 text-xs sm:text-base max-w-xl leading-relaxed">
            Akses alamat lengkap, panduan kunjungan, dan navigasi peta lokasi
            perpustakaan Universitas Muhammadiyah Cirebon
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto py-8 sm:py-12 px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* Left Column - Information */}
          <div className="space-y-6">
            <div className="bg-card rounded-2xl border border-slate-100 dark:border-border shadow-xs p-6 sm:p-8">
              <div className="flex items-center gap-3.5 mb-6">
                <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-950/40 text-[#9D171D] dark:text-red-400 flex items-center justify-center shrink-0">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">
                    Perpustakaan UMC
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                    Universitas Muhammadiyah Cirebon
                  </p>
                </div>
              </div>

              {/* Address Section */}
              <div className="mb-6 pb-6 border-b border-slate-100 dark:border-border/60">
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#9D171D]" />
                  Alamat Lengkap
                </h3>
                <p className="text-foreground font-bold text-base">
                  Gedung Djuanda - Lantai 7 (Kampus 2 UMC)
                </p>
                <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed mt-1">
                  Jl. Fatahillah - Watubelah No. 40, Kelurahan Watubelah, Kec.
                  Sumber, Kabupaten Cirebon, Jawa Barat 45611
                </p>
                <div className="mt-4">
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#9D171D] hover:bg-[#7f1318] text-white text-xs sm:text-sm font-semibold shadow-xs hover:shadow-md transition-all active:scale-95"
                  >
                    <Navigation className="w-4 h-4" />
                    <span>Petunjuk Arah (Google Maps)</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                  </a>
                </div>
              </div>

              {/* Operating Hours Section */}
              <div className="mb-6 pb-6 border-b border-slate-100 dark:border-border/60">
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#9D171D]" />
                  Jam Operasional
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-muted/50 border border-slate-100 dark:border-border/50">
                    <p className="font-semibold text-foreground">Senin - Jumat</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      08:00 - 16:00 WIB
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-muted/50 border border-slate-100 dark:border-border/50">
                    <p className="font-semibold text-foreground">Sabtu</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      08:00 - 12:00 WIB
                    </p>
                  </div>
                </div>
              </div>

              {/* Contact Section */}
              <div>
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">
                  Kontak Layanan
                </h3>
                <div className="space-y-2.5 text-xs sm:text-sm">
                  <a
                    href="tel:0231209608"
                    className="text-muted-foreground hover:text-[#9D171D] flex items-center gap-3 transition-colors"
                  >
                    <Phone className="w-4 h-4 text-[#9D171D] shrink-0" />
                    <span>(0231) 209608, 209617</span>
                  </a>
                  <a
                    href="mailto:perpustakaan@umc.ac.id"
                    className="text-muted-foreground hover:text-[#9D171D] flex items-center gap-3 transition-colors"
                  >
                    <Mail className="w-4 h-4 text-[#9D171D] shrink-0" />
                    <span>perpustakaan@umc.ac.id</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Map */}
          <div className="space-y-6">
            <div className="bg-card rounded-2xl border border-slate-100 dark:border-border shadow-xs overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-100 dark:border-border/60 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <MapPin className="w-4 h-4 text-[#9D171D]" />
                  <span>Peta Interaktif UMC Kampus 2</span>
                </div>
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-[#9D171D] hover:underline flex items-center gap-1"
                >
                  <span>Buka di Maps</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Embed Google Map with coordinates (no intrusive place card) */}
              <div className="w-full h-[360px] sm:h-[400px]">
                <iframe
                  title="Lokasi Perpustakaan UMC Kampus 2"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  src="https://maps.google.com/maps?q=-6.742389,108.4931841&hl=id&z=17&iwloc=&output=embed"
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  className="w-full h-full"
                ></iframe>
              </div>
            </div>

            {/* Quick Links / Panduan Pengunjung */}
            <div className="bg-card rounded-2xl border border-slate-100 dark:border-border shadow-xs p-6">
              <h3 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
                <MapPinned className="w-5 h-5 text-[#9D171D]" />
                Panduan Pengunjung
              </h3>
              <ul className="space-y-3 text-xs sm:text-sm text-muted-foreground">
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#9D171D] mt-1.5 shrink-0"></span>
                  <span>
                    Harap menunjukkan kartu anggota atau kartu mahasiswa (KTM)
                    saat memasuki perpustakaan.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#9D171D] mt-1.5 shrink-0"></span>
                  <span>
                    Lokasi berada di <strong>Gedung Djuanda Lantai 7</strong>{" "}
                    (tersedia lift &amp; tangga utama).
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#9D171D] mt-1.5 shrink-0"></span>
                  <span>
                    Area parkir motor &amp; mobil luas tersedia di dalam
                    lingkungan Kampus 2 UMC.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#9D171D] mt-1.5 shrink-0"></span>
                  <span>
                    Fasilitas WiFi berkecepatan tinggi, ruang baca ber-AC, dan area
                    colokan listrik tersedia.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Additional Information Section */}
        <div className="mt-8 sm:mt-12 bg-card rounded-2xl border border-slate-100 dark:border-border shadow-xs p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-6">
            Tentang Perpustakaan UMC
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
            <div className="p-5 rounded-xl bg-slate-50 dark:bg-muted/40 border-l-4 border-[#9D171D]">
              <h3 className="font-semibold text-foreground mb-1.5">
                Koleksi Buku
              </h3>
              <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
                Perpustakaan UMC memiliki ribuan judul buku cetak dari berbagai
                bidang ilmu untuk mendukung pembelajaran mahasiswa dan dosen.
              </p>
            </div>
            <div className="p-5 rounded-xl bg-slate-50 dark:bg-muted/40 border-l-4 border-[#9D171D]">
              <h3 className="font-semibold text-foreground mb-1.5">
                E-Resource &amp; Jurnal
              </h3>
              <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
                Akses digital koleksi jurnal ilmiah, e-book resmi, dan database
                akademik yang tersedia 24 jam untuk sivitas akademika UMC.
              </p>
            </div>
            <div className="p-5 rounded-xl bg-slate-50 dark:bg-muted/40 border-l-4 border-[#9D171D]">
              <h3 className="font-semibold text-foreground mb-1.5">
                Layanan Referensi
              </h3>
              <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
                Pustakawan siap mendampingi kebutuhan riset, penelusuran pustaka,
                serta peminjaman buku fisik dan digital.
              </p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
