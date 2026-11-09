import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CmsSection } from "../CmsSection";
import { DEFAULT_SITE_SETTINGS } from "@/api/siteSettingApi";

const mockUpdateSetting = vi.fn().mockResolvedValue({ success: true });
const mockRefetch = vi.fn();
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
};

vi.mock("@/hooks/useSiteSettings", () => ({
  useSiteSettings: () => ({
    settings: DEFAULT_SITE_SETTINGS,
    loading: false,
    refetch: mockRefetch,
    updateSetting: mockUpdateSetting,
  }),
}));

vi.mock("@/hooks/useToast", () => ({
  useToast: () => mockToast,
}));

describe("CmsSection Component (Focused Sub-Page Views)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("merender sub-halaman banner secara default", () => {
    render(<CmsSection subPage="banner" />);

    expect(screen.getByText("Bilah Pengumuman (Banner Sticky)")).toBeInTheDocument();
    expect(screen.getByText("Pratinjau Langsung (Live Preview)")).toBeInTheDocument();
    expect(screen.getByLabelText("Tampilkan Banner (On/Off)")).toBeInTheDocument();
    expect(screen.getByLabelText("Teks Label Badge")).toBeInTheDocument();
    expect(screen.getByLabelText("Isi Pesan Siaran")).toBeInTheDocument();
  });

  it("merender sub-halaman identitas dan branding saat subPage='branding'", () => {
    render(<CmsSection subPage="branding" />);

    expect(
      screen.getByRole("heading", { name: /Identitas Portal, Logo & SEO/i, level: 1 })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Judul Web (Title Tab Browser)")).toBeInTheDocument();
    expect(screen.getByLabelText("Tagline Portal")).toBeInTheDocument();
    expect(screen.getByText("Logo Perpustakaan (Navbar & Footer)")).toBeInTheDocument();
    expect(screen.getByText("Favicon Tab Browser")).toBeInTheDocument();
  });

  it("merender sub-halaman hero landing saat subPage='hero'", () => {
    render(<CmsSection subPage="hero" />);

    expect(screen.getByText("Hero Section (Halaman Utama)")).toBeInTheDocument();
    expect(screen.getByLabelText("Judul Utama Hero (Heading 1)")).toBeInTheDocument();
    expect(screen.getByLabelText("Subjudul / Deskripsi Sambutan")).toBeInTheDocument();
    expect(screen.getByText("Gambar Latar Hero (Hero Background Image)")).toBeInTheDocument();
  });

  it("merender sub-halaman lokasi dan peta saat subPage='location'", () => {
    render(<CmsSection subPage="location" />);

    expect(screen.getByText("Peta Lokasi & Footer Kampus")).toBeInTheDocument();
    expect(screen.getByLabelText("Nama Gedung & Lantai")).toBeInTheDocument();
    expect(screen.getByLabelText("URL Iframe Sematan Google Maps")).toBeInTheDocument();
    expect(screen.getByLabelText("Motto Universitas / Perpustakaan")).toBeInTheDocument();
  });

  it("memanggil updateSetting saat tombol simpan diklik pada sub-halaman banner", async () => {
    render(<CmsSection subPage="banner" />);

    const saveButtons = screen.getAllByText("Simpan Perubahan");
    fireEvent.click(saveButtons[0]);

    await waitFor(() => {
      expect(mockUpdateSetting).toHaveBeenCalledWith("banner", expect.any(Object));
      expect(mockToast.success).toHaveBeenCalledWith(
        "Pengaturan Disimpan",
        expect.stringContaining("Banner Pengumuman")
      );
    });
  });

  it("dapat memunculkan kembali pratinjau banner setelah ditutup via icon x", async () => {
    render(<CmsSection subPage="banner" />);

    // Pastikan tombol tutup pengumuman ada di pratinjau
    const closeBtn = screen.getByLabelText("Tutup pengumuman");
    expect(closeBtn).toBeInTheDocument();

    // Klik tombol tutup pengumuman
    fireEvent.click(closeBtn);

    // Verifikasi pesan pratinjau disembunyikan dan tombol pemulihan muncul
    expect(
      screen.getByText(/Pratinjau banner disembunyikan sementara/i)
    ).toBeInTheDocument();
    const restoreBtn = screen.getByRole("button", { name: /Munculkan Kembali Pratinjau/i });
    expect(restoreBtn).toBeInTheDocument();

    // Klik tombol pemulihan
    fireEvent.click(restoreBtn);

    // Verifikasi banner pratinjau muncul kembali
    expect(screen.getByLabelText("Tutup pengumuman")).toBeInTheDocument();
  });
});
