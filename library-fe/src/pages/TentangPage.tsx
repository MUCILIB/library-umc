import {
  MapPin,
  Clock,
  Phone,
  Mail,
  MapPinned,
  ExternalLink,
  Navigation,
  Globe,
  Share2,
} from "lucide-react";
import {
  IconBrandInstagram,
  IconBrandYoutubeFilled,
  IconBrandFacebookFilled,
  IconBrandX,
  IconBrandWhatsappFilled,
} from "@tabler/icons-react";
import Navbar from "@/components/ui/navbar";
import Footer from "@/components/Footer";
import { useSiteSettings } from "@/hooks/useSiteSettings";

export default function TentangPage() {
  const { settings } = useSiteSettings();
  const locationData = settings.location;
  const googleMapsUrl = locationData.directUrl || "https://maps.app.goo.gl/v9gnnAVj762L1EbK8";

  const social = settings.footer?.socialMedia || {};

  const instagramUrl =
    social.instagram &&
    social.instagram !== "https://instagram.com/perpustakaan_umc" &&
    social.instagram !== "https://www.instagram.com/perpustakaan_umc"
      ? social.instagram
      : "https://www.instagram.com/perpusumc";

  const youtubeUrl = social.youtube || "https://youtube.com/@umctv";
  const facebookUrl = social.facebook || "https://facebook.com/umcirebon";
  const twitterUrl = social.twitter || "https://twitter.com/umcirebon";
  const whatsappUrl = social.whatsapp || "https://wa.me/6281234567890";
  const websiteUrl = "https://umc.ac.id";

  const socialCards = [
    {
      id: "instagram",
      title: "Instagram Resmi",
      handle: "@perpusumc",
      description: "Pembaruan koleksi buku baru, agenda literasi, kuis, dan pengumuman operasional perpustakaan.",
      url: instagramUrl,
      icon: IconBrandInstagram,
      iconBg: "bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white",
      badge: "Koleksi & Info",
    },
    {
      id: "youtube",
      title: "YouTube Channel",
      handle: "UMC TV (@umctv)",
      description: "Tutorial akses e-resource, panduan peminjaman mandiri, dan dokumentasi seminar akademik.",
      url: youtubeUrl,
      icon: IconBrandYoutubeFilled,
      iconBg: "bg-red-600 text-white",
      badge: "Video Tutorial",
    },
    {
      id: "whatsapp",
      title: "WhatsApp Layanan",
      handle: "Layanan Chat Pustakawan",
      description: "Konsultasi referensi riset, asistensi perpanjangan buku, dan bantuan cepat petugas perpustakaan.",
      url: whatsappUrl,
      icon: IconBrandWhatsappFilled,
      iconBg: "bg-emerald-600 text-white",
      badge: "Chat Langsung",
    },
    {
      id: "facebook",
      title: "Halaman Facebook",
      handle: "Universitas Muhammadiyah Cirebon",
      description: "Kabar universitas, publikasi riset, serta jejaring sivitas akademika UMC Cirebon.",
      url: facebookUrl,
      icon: IconBrandFacebookFilled,
      iconBg: "bg-blue-600 text-white",
      badge: "Komunitas",
    },
    {
      id: "twitter",
      title: "X (Twitter) Resmi",
      handle: "@umcirebon",
      description: "Pemberitahuan kilat (flash update), jadwal layanan khusus, dan info kampus cepat.",
      url: twitterUrl,
      icon: IconBrandX,
      iconBg: "bg-slate-900 dark:bg-slate-800 text-white",
      badge: "Info Cepat",
    },
    {
      id: "website",
      title: "Portal Utama UMC",
      handle: "umc.ac.id",
      description: "Pusat informasi resmi kampus, sistem akademik terintegrasi, fakultas, dan pendaftaran.",
      url: websiteUrl,
      icon: Globe,
      iconBg: "bg-[#9D171D] text-white",
      badge: "Portal Utama",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-muted/30">
      <Navbar />

      {/* Hero Banner */}
      <div className="bg-[#8E0C17] text-white py-12 sm:py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold mb-3 backdrop-blur-xs">
            <MapPin className="w-3.5 h-3.5" />
            <span>Profil &amp; Lokasi Resmi</span>
          </div>
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black mb-3 tracking-tight">
            Tentang Perpustakaan UMC
          </h1>
          <p className="text-white/85 text-xs sm:text-base max-w-xl leading-relaxed">
            Akses informasi lengkap alamat, panduan kunjungan, navigasi peta lokasi,
            serta kanal media sosial resmi perpustakaan Universitas Muhammadiyah Cirebon.
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
                  {locationData.building || "Gedung Djuanda - Lantai 7 (Kampus 2 UMC)"}
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
                    href={`tel:${(locationData.phone || "0231209608").replace(/[^0-9+]/g, "")}`}
                    className="text-muted-foreground hover:text-[#9D171D] flex items-center gap-3 transition-colors"
                  >
                    <Phone className="w-4 h-4 text-[#9D171D] shrink-0" />
                    <span>{locationData.phone || "(0231) 209608, 209617"}</span>
                  </a>
                  <a
                    href={`mailto:${locationData.email || "perpustakaan@umc.ac.id"}`}
                    className="text-muted-foreground hover:text-[#9D171D] flex items-center gap-3 transition-colors"
                  >
                    <Mail className="w-4 h-4 text-[#9D171D] shrink-0" />
                    <span>{locationData.email || "perpustakaan@umc.ac.id"}</span>
                  </a>
                </div>
              </div>

              {/* Media Sosial & Web Quick Links */}
              <div className="mt-6 pt-6 border-t border-slate-100 dark:border-border/60">
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-[#9D171D]" />
                  Media Sosial &amp; Saluran Resmi
                </h3>
                <div className="space-y-2.5 text-xs sm:text-sm">
                  <a
                    href={instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-[#9D171D] flex items-center justify-between group transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <IconBrandInstagram className="w-4 h-4 text-[#9D171D] shrink-0" />
                      <span>@perpusumc</span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                  </a>

                  {youtubeUrl && (
                    <a
                      href={youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-[#9D171D] flex items-center justify-between group transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <IconBrandYoutubeFilled className="w-4 h-4 text-[#9D171D] shrink-0" />
                        <span>UMC TV (@umctv)</span>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                    </a>
                  )}

                  {whatsappUrl && (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-[#9D171D] flex items-center justify-between group transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <IconBrandWhatsappFilled className="w-4 h-4 text-[#9D171D] shrink-0" />
                        <span>Layanan Chat Pustakawan</span>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                    </a>
                  )}

                  {facebookUrl && (
                    <a
                      href={facebookUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-[#9D171D] flex items-center justify-between group transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <IconBrandFacebookFilled className="w-4 h-4 text-[#9D171D] shrink-0" />
                        <span>Universitas Muhammadiyah Cirebon</span>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                    </a>
                  )}

                  {twitterUrl && (
                    <a
                      href={twitterUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-[#9D171D] flex items-center justify-between group transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <IconBrandX className="w-4 h-4 text-[#9D171D] shrink-0" />
                        <span>@umcirebon</span>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                    </a>
                  )}

                  <a
                    href={websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-[#9D171D] flex items-center justify-between group transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Globe className="w-4 h-4 text-[#9D171D] shrink-0" />
                      <span>umc.ac.id</span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
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

              {/* Embed Google Map with coordinates */}
              <div className="w-full h-[360px] sm:h-[400px]">
                <iframe
                  title="Lokasi Perpustakaan UMC"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  src={
                    locationData.embedUrl ||
                    "https://maps.google.com/maps?q=-6.742389,108.4931841&hl=id&z=17&iwloc=&output=embed"
                  }
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

        {/* Dedicated Social Media Showcase Section */}
        <div className="mt-8 sm:mt-12 bg-card rounded-2xl border border-slate-100 dark:border-border/60 shadow-xs p-6 sm:p-8">
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 dark:bg-red-950/40 text-[#9D171D] dark:text-red-400 text-xs font-semibold mb-2">
              <Share2 className="w-3.5 h-3.5" />
              <span>Jejaring &amp; Media Sosial</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">
              Saluran Media Sosial &amp; Komunikasi Resmi
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-2xl leading-relaxed">
              Ikuti dan hubungi saluran resmi Perpustakaan UMC untuk mendapatkan informasi koleksi buku terkini, agenda literasi, video tutorial, serta konsultasi langsung dengan pustakawan.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {socialCards.map((channel) => {
              const Icon = channel.icon;
              return (
                <a
                  key={channel.id}
                  href={channel.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group p-5 rounded-xl bg-slate-50 dark:bg-muted/40 border border-slate-100 dark:border-border/50 hover:border-[#9D171D]/40 dark:hover:border-red-500/40 hover:shadow-md transition-all flex flex-col justify-between"
                  aria-label={`${channel.title} - ${channel.handle}`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${channel.iconBg} shadow-xs`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-card border border-border text-muted-foreground">
                        {channel.badge}
                      </span>
                    </div>
                    <h3 className="font-bold text-foreground text-sm group-hover:text-[#9D171D] transition-colors flex items-center gap-1.5">
                      {channel.title}
                    </h3>
                    <p className="text-xs font-semibold text-[#9D171D] dark:text-red-400 mb-2">
                      {channel.handle}
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {channel.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-border/40 flex items-center justify-between text-xs font-semibold text-[#9D171D] dark:text-red-400 group-hover:underline">
                    <span>Kunjungi Saluran</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </a>
              );
            })}
          </div>
        </div>

        {/* Additional Information Section */}
        <div className="mt-8 bg-card rounded-2xl border border-slate-100 dark:border-border/60 shadow-xs p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-6">
            Tentang Layanan Perpustakaan UMC
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
            <div className="p-5 rounded-xl bg-slate-50 dark:bg-muted/40 border-l-4 border-[#9D171D]">
              <h3 className="font-semibold text-foreground mb-1.5">
                Koleksi Buku &amp; Referensi
              </h3>
              <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
                Perpustakaan UMC memiliki ribuan judul buku cetak dari berbagai
                bidang ilmu untuk mendukung pembelajaran mahasiswa, dosen, dan peneliti.
              </p>
            </div>
            <div className="p-5 rounded-xl bg-slate-50 dark:bg-muted/40 border-l-4 border-[#9D171D]">
              <h3 className="font-semibold text-foreground mb-1.5">
                E-Resource &amp; Jurnal Digital
              </h3>
              <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
                Akses digital koleksi jurnal ilmiah, e-book resmi, dan database
                akademik yang tersedia secara daring untuk seluruh sivitas akademika UMC.
              </p>
            </div>
            <div className="p-5 rounded-xl bg-slate-50 dark:bg-muted/40 border-l-4 border-[#9D171D]">
              <h3 className="font-semibold text-foreground mb-1.5">
                Layanan Referensi &amp; Konsultasi
              </h3>
              <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
                Pustakawan siap mendampingi kebutuhan riset, penelusuran literatur ilmiah,
                serta asistensi peminjaman buku fisik dan digital.
              </p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
