import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import BeritaPage from "../BeritaPage";
import { newsService } from "@/services/newsService";

vi.mock("@/services/newsService", () => ({
  newsService: {
    getNewsList: vi.fn(),
    getImageUrl: (val: string) => val,
  },
  CATEGORY_LABELS: {
    pengumuman: "Pengumuman",
    agenda: "Agenda",
    kegiatan: "Kegiatan",
    layanan: "Layanan",
    literasi: "Literasi",
  },
  CATEGORY_STYLES: {
    pengumuman: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
    agenda: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
    kegiatan: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
    layanan: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
    literasi: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  },
}));

vi.mock("@/utils/auth-client", () => ({
  authClient: {
    useSession: vi.fn().mockReturnValue({ data: null }),
    signOut: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("@/components/Footer", () => ({
  default: () => <footer data-testid="mock-footer">Footer</footer>,
}));

describe("BeritaPage Component", () => {
  const mockNews = {
    items: [
      {
        id: "1",
        title: "Peresmian Pojok Baca Digital UMC",
        slug: "peresmian-pojok-baca-digital-umc",
        category: "kegiatan",
        excerpt: "Fasilitas baru untuk mendukung literasi digital mahasiswa.",
        content: "<p>Konten lengkap peresmian.</p>",
        coverImage: "/api/news/assets/pojok.png",
        status: "published",
        views: 120,
        createdAt: "2026-11-20T10:00:00Z",
        publishedAt: "2026-11-20T10:00:00Z",
      },
    ],
    total: 1,
    page: 1,
    limit: 9,
    totalPages: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (newsService.getNewsList as any).mockResolvedValue(mockNews);
  });

  it("merender hero berita dan daftar kartu artikel publik", async () => {
    render(
      <MemoryRouter initialEntries={["/berita"]}>
        <BeritaPage />
      </MemoryRouter>
    );

    expect(screen.getByText("Kabar Perpustakaan UMC")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Cari berita, agenda, pengumuman/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByText("Peresmian Pojok Baca Digital UMC")
      ).toBeInTheDocument();
      expect(screen.getAllByText("Kegiatan").length).toBeGreaterThanOrEqual(1);
    });
  });
});
