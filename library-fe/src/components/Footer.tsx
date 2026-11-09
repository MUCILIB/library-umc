// src/components/Footer.tsx
import LogoUmc from "@/assets/logo_umc.png";
import {
  IconBrandWhatsappFilled,
  IconBrandFacebookFilled,
  IconBrandInstagram,
  IconBrandX,
  IconBrandYoutubeFilled,
} from "@tabler/icons-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const Footer = () => {
  const { settings } = useSiteSettings();
  const footerData = settings.footer;
  const brandingData = settings.branding;

  return (
    <footer className="bg-[#8E0C17] text-white pt-12 sm:pt-16 pb-6 px-4 sm:px-8 lg:px-14 w-full">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10 lg:gap-12">
        {/* Kolom 1: Logo, Nama Kampus, Motto & Media Sosial */}
        <div className="flex flex-col md:order-1 lg:order-1">
          <div className="flex items-center gap-3.5 sm:gap-4">
            <img
              src={brandingData.logoUrl || LogoUmc}
              alt="Logo Universitas Muhammadiyah Cirebon"
              className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = LogoUmc;
              }}
            />
            <div>
              <h3 className="font-bold text-base sm:text-lg text-white leading-tight">
                Universitas
                <br />
                Muhammadiyah Cirebon
              </h3>
              <p className="font-motto text-white text-lg sm:text-xl tracking-wide leading-tight mt-0.5 opacity-95">
                {footerData.motto || "Unggul, Islami, Mandiri & Profesional"}
              </p>
            </div>
          </div>

          {/* Ikon Media Sosial Dinamis */}
          <div className="flex items-center gap-4 mt-6 text-white">
            {footerData.socialMedia?.facebook && (
              <a
                href={footerData.socialMedia.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:opacity-80 transition-opacity"
                aria-label="Facebook"
              >
                <IconBrandFacebookFilled size={20} />
              </a>
            )}
            {footerData.socialMedia?.instagram && (
              <a
                href={footerData.socialMedia.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:opacity-80 transition-opacity"
                aria-label="Instagram"
              >
                <IconBrandInstagram size={20} stroke={2} />
              </a>
            )}
            {footerData.socialMedia?.twitter && (
              <a
                href={footerData.socialMedia.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:opacity-80 transition-opacity"
                aria-label="Twitter / X"
              >
                <IconBrandX size={20} stroke={2} />
              </a>
            )}
            {footerData.socialMedia?.youtube && (
              <a
                href={footerData.socialMedia.youtube}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:opacity-80 transition-opacity"
                aria-label="YouTube"
              >
                <IconBrandYoutubeFilled size={20} />
              </a>
            )}
            {footerData.socialMedia?.whatsapp && (
              <a
                href={footerData.socialMedia.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:opacity-80 transition-opacity"
                aria-label="WhatsApp"
              >
                <IconBrandWhatsappFilled size={20} />
              </a>
            )}
          </div>
        </div>

        {/* Kolom 2: Lembaga dan Pusat */}
        <div className="md:col-span-2 lg:col-span-1 md:order-3 lg:order-2">
          <h4 className="font-bold text-sm sm:text-base text-white mb-5 sm:mb-6">
            Lembaga dan Pusat
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-x-8 gap-y-3.5 sm:gap-y-4 text-xs sm:text-[13px] font-bold text-white">
            <ul className="space-y-3.5 sm:space-y-4">
              {footerData.campusLinks && footerData.campusLinks.length > 0 ? (
                footerData.campusLinks.map((link, idx) => (
                  <li key={idx}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {link.title}
                    </a>
                  </li>
                ))
              ) : (
                <>
                  <li>
                    <a href="https://lpm.umc.ac.id" className="hover:underline">
                      Lembaga Penjamin Mutu (LPM) UMC
                    </a>
                  </li>
                  <li>
                    <a href="https://lppm.umc.ac.id" className="hover:underline">
                      Lembaga Penelitian dan Pengabdian Masyarakat (LPPM)
                    </a>
                  </li>
                  <li>
                    <a href="https://lpaik.umc.ac.id" className="hover:underline">
                      Lembaga Pengembangan dan Kajian Al-Islam (LPAIK)
                    </a>
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>

        {/* Kolom 3: Hubungi Kami */}
        <div className="md:order-2 lg:order-3">
          <h4 className="font-bold text-sm sm:text-base text-white mb-5 sm:mb-6">
            Hubungi Kami
          </h4>
          <div className="space-y-4 text-xs sm:text-[13px]">
            {footerData.campuses && footerData.campuses.length > 0 ? (
              footerData.campuses.map((c, idx) => (
                <div key={idx}>
                  <p className="font-bold text-white">{c.name} :</p>
                  <p className="text-white leading-relaxed mt-1">
                    {c.address} {c.phone ? `No. Telp. ${c.phone}` : ""}
                  </p>
                </div>
              ))
            ) : (
              <div>
                <p className="font-bold text-white">Kampus 1 (Pusat) :</p>
                <p className="text-white leading-relaxed mt-1">
                  Jl. Tuparev No. 70 Cirebon No. Telp. (0231) 209608, 209617
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bagian Bawah: Hak Cipta & Tautan Hukum */}
      <div className="max-w-7xl mx-auto border-t border-[#9B151C] mt-10 sm:mt-16 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 text-xs sm:text-[13px] text-white">
        <p className="text-center sm:text-left leading-relaxed text-white/90">
          &copy; 2026 Universitas Muhammadiyah Cirebon.{" "}
          <span className="block sm:inline">Hak Cipta Dilindungi.</span>
        </p>

        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-x-5 sm:gap-x-8 gap-y-2 text-center text-white/90 font-medium">
          <a href="#" className="hover:underline hover:text-white transition-colors">
            Syarat &amp; Ketentuan
          </a>
          <a href="#" className="hover:underline hover:text-white transition-colors">
            Kebijakan Privasi
          </a>
          <a href="#" className="hover:underline hover:text-white transition-colors">
            Bantuan
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
