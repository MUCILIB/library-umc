import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import TentangPage from "../TentangPage";
import { DEFAULT_SITE_SETTINGS } from "@/api/siteSettingApi";

let currentSettings = { ...DEFAULT_SITE_SETTINGS };

vi.mock("@/hooks/useSiteSettings", () => ({
  useSiteSettings: () => ({
    settings: currentSettings,
    loading: false,
    error: null,
  }),
}));

vi.mock("@/components/ui/navbar", () => ({
  default: () => <div data-testid="mock-navbar">Navbar</div>,
}));

vi.mock("@/components/Footer", () => ({
  default: () => <div data-testid="mock-footer">Footer</div>,
}));

describe("TentangPage - Profil, Lokasi, dan Saluran Media Sosial", () => {
  beforeEach(() => {
    currentSettings = JSON.parse(JSON.stringify(DEFAULT_SITE_SETTINGS));
  });

  it("merender hero banner dan informasi utama perpustakaan", () => {
    render(<TentangPage />);

    expect(screen.getByText("Profil & Lokasi Resmi")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Tentang Perpustakaan UMC", level: 1 })
    ).toBeInTheDocument();
    expect(screen.getByText(/Gedung Perpustakaan Pusat Kampus 1, Lantai 2/i)).toBeInTheDocument();
    expect(screen.getByText("Jam Operasional")).toBeInTheDocument();
    expect(screen.getByText("Senin - Jumat")).toBeInTheDocument();
    expect(screen.getByText("Sabtu")).toBeInTheDocument();
  });

  it("merender tautan petunjuk arah Google Maps dan peta interaktif iframe", () => {
    render(<TentangPage />);

    const mapsBtn = screen.getByRole("link", { name: /Petunjuk Arah \(Google Maps\)/i });
    expect(mapsBtn).toHaveAttribute("href", currentSettings.location.directUrl);
    expect(mapsBtn).toHaveAttribute("target", "_blank");

    const iframe = screen.getByTitle("Lokasi Perpustakaan UMC");
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute("src", currentSettings.location.embedUrl);
  });

  it("merender informasi media sosial lengkap pada daftar kontak cepat", () => {
    render(<TentangPage />);

    expect(screen.getByText("Media Sosial & Saluran Resmi")).toBeInTheDocument();

    // Instagram
    const igLinks = screen.getAllByRole("link", { name: /@perpusumc/i });
    expect(igLinks.length).toBeGreaterThanOrEqual(1);
    expect(igLinks[0]).toHaveAttribute("href", "https://www.instagram.com/perpusumc");

    // YouTube
    const ytLinks = screen.getAllByRole("link", { name: /UMC TV \(@umctv\)/i });
    expect(ytLinks.length).toBeGreaterThanOrEqual(1);
    expect(ytLinks[0]).toHaveAttribute("href", "https://youtube.com/@umctv");

    // WhatsApp
    const waLinks = screen.getAllByRole("link", { name: /Layanan Chat Pustakawan/i });
    expect(waLinks.length).toBeGreaterThanOrEqual(1);
    expect(waLinks[0]).toHaveAttribute("href", "https://wa.me/6281234567890");

    // Facebook
    const fbLinks = screen.getAllByRole("link", { name: /Universitas Muhammadiyah Cirebon/i });
    expect(fbLinks.length).toBeGreaterThanOrEqual(1);
    expect(fbLinks[0]).toHaveAttribute("href", "https://facebook.com/umcirebon");

    // Twitter / X
    const twLinks = screen.getAllByRole("link", { name: /@umcirebon/i });
    expect(twLinks.length).toBeGreaterThanOrEqual(1);
    expect(twLinks[0]).toHaveAttribute("href", "https://twitter.com/umcirebon");

    // Website
    const webLinks = screen.getAllByRole("link", { name: /^umc\.ac\.id$/i });
    expect(webLinks.length).toBeGreaterThanOrEqual(1);
    expect(webLinks[0]).toHaveAttribute("href", "https://umc.ac.id");
  });

  it("merender seksi showcase media sosial dengan kartu-kartu interaktif", () => {
    render(<TentangPage />);

    expect(
      screen.getByRole("heading", { name: "Saluran Media Sosial & Komunikasi Resmi", level: 2 })
    ).toBeInTheDocument();

    // Verifikasi masing-masing kartu showcase berdasarkan label aksesibilitas
    const igCard = screen.getByRole("link", { name: /Instagram Resmi - @perpusumc/i });
    expect(igCard).toHaveAttribute("href", "https://www.instagram.com/perpusumc");
    expect(igCard).toHaveAttribute("target", "_blank");
    expect(igCard).toHaveAttribute("rel", "noopener noreferrer");

    const ytCard = screen.getByRole("link", { name: /YouTube Channel - UMC TV \(@umctv\)/i });
    expect(ytCard).toHaveAttribute("href", "https://youtube.com/@umctv");

    const waCard = screen.getByRole("link", { name: /WhatsApp Layanan - Layanan Chat Pustakawan/i });
    expect(waCard).toHaveAttribute("href", "https://wa.me/6281234567890");

    const fbCard = screen.getByRole("link", { name: /Halaman Facebook - Universitas Muhammadiyah Cirebon/i });
    expect(fbCard).toHaveAttribute("href", "https://facebook.com/umcirebon");

    const twCard = screen.getByRole("link", { name: /X \(Twitter\) Resmi - @umcirebon/i });
    expect(twCard).toHaveAttribute("href", "https://twitter.com/umcirebon");

    const webCard = screen.getByRole("link", { name: /Portal Utama UMC - umc\.ac\.id/i });
    expect(webCard).toHaveAttribute("href", "https://umc.ac.id");
  });

  it("menyesuaikan tautan media sosial secara dinamis jika diperbarui dari CMS", () => {
    currentSettings.footer.socialMedia = {
      instagram: "https://www.instagram.com/perpustakaan_baru_umc",
      youtube: "https://youtube.com/@umcofficial",
      whatsapp: "https://wa.me/6289999999999",
      facebook: "https://facebook.com/perpustakaan.umc",
      twitter: "https://twitter.com/perpus_umc",
    };

    render(<TentangPage />);

    const igCard = screen.getByRole("link", { name: /Instagram Resmi/i });
    expect(igCard).toHaveAttribute("href", "https://www.instagram.com/perpustakaan_baru_umc");

    const ytCard = screen.getByRole("link", { name: /YouTube Channel/i });
    expect(ytCard).toHaveAttribute("href", "https://youtube.com/@umcofficial");

    const waCard = screen.getByRole("link", { name: /WhatsApp Layanan/i });
    expect(waCard).toHaveAttribute("href", "https://wa.me/6289999999999");
  });

  it("merender informasi layanan perpustakaan di bagian bawah halaman", () => {
    render(<TentangPage />);

    expect(screen.getByText("Koleksi Buku & Referensi")).toBeInTheDocument();
    expect(screen.getByText("E-Resource & Jurnal Digital")).toBeInTheDocument();
    expect(screen.getByText("Layanan Referensi & Konsultasi")).toBeInTheDocument();
  });
});
