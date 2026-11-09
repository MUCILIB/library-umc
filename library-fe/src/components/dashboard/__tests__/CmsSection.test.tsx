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

describe("CmsSection Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("merender judul dan 4 tab navigasi CMS", () => {
    render(<CmsSection />);

    expect(screen.getByText("Manajemen Konten (CMS)")).toBeInTheDocument();
    expect(screen.getByText("Banner Siaran")).toBeInTheDocument();
    expect(screen.getByText("Identitas & SEO")).toBeInTheDocument();
    expect(screen.getByText("Hero Landing")).toBeInTheDocument();
    expect(screen.getByText("Peta & Footer")).toBeInTheDocument();
  });

  it("merender live preview dan form banner pada tab banner default", () => {
    render(<CmsSection />);

    expect(screen.getByText("Pratinjau Langsung (Live Preview)")).toBeInTheDocument();
    expect(screen.getByLabelText("Tampilkan Banner (On/Off)")).toBeInTheDocument();
    expect(screen.getByLabelText("Teks Label Badge")).toBeInTheDocument();
    expect(screen.getByLabelText("Isi Pesan Siaran")).toBeInTheDocument();
  });

  it("berpindah ke tab Identitas & SEO saat tab diklik", async () => {
    render(<CmsSection />);

    const seoTab = screen.getByRole("tab", { name: /Identitas/i });
    fireEvent.keyDown(seoTab, { key: "Enter" });

    await waitFor(() => {
      expect(screen.getByLabelText("Judul Web (Title Tab Browser)")).toBeInTheDocument();
      expect(screen.getByLabelText("Tagline Portal")).toBeInTheDocument();
      expect(screen.getByText("Logo Perpustakaan (Navbar & Footer)")).toBeInTheDocument();
    });
  });

  it("memanggil updateSetting saat tombol simpan diklik", async () => {
    render(<CmsSection />);

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
});
