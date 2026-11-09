export interface BrandingSettings {
  siteTitle: string;
  siteTagline: string;
  faviconUrl: string;
  logoUrl: string;
  metaDescription: string;
}

export interface BannerSettings {
  isActive: boolean;
  badgeText: string;
  message: string;
  linkText: string;
  linkUrl: string;
  dismissible: boolean;
}

export interface HeroSettings {
  title: string;
  subtitle: string;
  backgroundImage: string;
  searchPlaceholder: string;
  quickChips: string[];
}

export interface LocationSettings {
  embedUrl: string;
  directUrl: string;
  building: string;
  operationalHours: string;
  phone: string;
  email: string;
}

export interface CampusAddress {
  name: string;
  address: string;
  phone: string;
}

export interface CampusLink {
  title: string;
  url: string;
}

export interface FooterSettings {
  motto: string;
  socialMedia: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
    whatsapp?: string;
  };
  campuses: CampusAddress[];
  campusLinks: CampusLink[];
}

export interface AllSiteSettings {
  branding: BrandingSettings;
  banner: BannerSettings;
  hero: HeroSettings;
  location: LocationSettings;
  footer: FooterSettings;
}

export const DEFAULT_SITE_SETTINGS: AllSiteSettings = {
  branding: {
    siteTitle: "Perpustakaan Universitas Muhammadiyah Cirebon",
    siteTagline: "Portal Riset & Sumber Belajar Digital",
    faviconUrl: "/favicon.ico",
    logoUrl: "",
    metaDescription: "Layanan perpustakaan digital resmi Universitas Muhammadiyah Cirebon.",
  },
  banner: {
    isActive: true,
    badgeText: "PENGUMUMAN",
    message: "Layanan repositori digital dan peminjaman buku fisik kini dapat diakses secara mandiri.",
    linkText: "Lihat Katalog",
    linkUrl: "/katalog",
    dismissible: true,
  },
  hero: {
    title: "Perpustakaan Universitas Muhammadiyah Cirebon",
    subtitle: "Akses Koleksi buku, jurnal, dan e-book resmi UMC",
    backgroundImage: "/assets/bg1-BOtzP3_E.jpeg",
    searchPlaceholder: "Cari judul, penulis, ISBN...",
    quickChips: ["Pemrograman", "Manajemen", "Algoritma", "Jurnal", "Kesehatan"],
  },
  location: {
    embedUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3962.395781358931!2d108.53075257577555!3d-6.721464593274536!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e6ee2629e46a789%3A0xc0051b439c29c878!2sUniversitas%20Muhammadiyah%20Cirebon!5e0!3m2!1sid!2sid!4v1700000000000!5m2!1sid!2sid",
    directUrl: "https://maps.app.goo.gl/UMCirebon",
    building: "Gedung Perpustakaan Pusat Kampus 1, Lantai 2",
    operationalHours: "Senin - Jumat: 08.00 - 16.00 WIB | Sabtu: 08.00 - 12.00 WIB",
    phone: "+62 231 209608",
    email: "perpustakaan@umc.ac.id",
  },
  footer: {
    motto: "Unggul, Islami, Mandiri & Profesional",
    socialMedia: {
      facebook: "https://facebook.com/umcirebon",
      instagram: "https://instagram.com/perpustakaan_umc",
      twitter: "https://twitter.com/umcirebon",
      youtube: "https://youtube.com/@umctv",
      whatsapp: "https://wa.me/6281234567890",
    },
    campuses: [
      {
        name: "Kampus 1 (Pusat)",
        address: "Jl. Tuparev No. 70, Cirebon 45153",
        phone: "(0231) 209608",
      },
      {
        name: "Kampus 2 (Watubelah)",
        address: "Jl. Fatahillah - Watubelah, Kab. Cirebon",
        phone: "(0231) 204276",
      },
      {
        name: "Kampus 3 (Kedawung)",
        address: "Jl. Tuparev No. 111, Cirebon",
        phone: "(0231) 209610",
      },
    ],
    campusLinks: [
      { title: "LPM UMC", url: "https://lpm.umc.ac.id" },
      { title: "LPPM UMC", url: "https://lppm.umc.ac.id" },
      { title: "LPAIK UMC", url: "https://lpaik.umc.ac.id" },
      { title: "Kantor Urusan Internasional (KUI)", url: "https://kui.umc.ac.id" },
      { title: "Career Development Center (CDC)", url: "https://cdc.umc.ac.id" },
    ],
  },
};

export const VALID_SETTING_KEYS = [
  "branding",
  "banner",
  "hero",
  "location",
  "footer",
] as const;

export type ValidSettingKey = (typeof VALID_SETTING_KEYS)[number];
