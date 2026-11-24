import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import NewsManagementSection from "../NewsManagementSection";
import { newsService } from "@/services/newsService";

const mockNavigate = vi.fn();
vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@/services/newsService", () => ({
  newsService: {
    getNewsList: vi.fn(),
    createNews: vi.fn(),
    updateNews: vi.fn(),
    deleteNews: vi.fn(),
    uploadImage: vi.fn(),
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

describe("NewsManagementSection Component", () => {
  const mockNewsData = {
    items: [
      {
        id: "1",
        title: "Sosialisasi Perpustakaan Digital UMC 2026",
        slug: "sosialisasi-perpustakaan-digital-umc-2026",
        category: "kegiatan",
        excerpt: "Kegiatan sosialisasi pemanfaatan katalog dan repositori digital.",
        content: "<p>Konten lengkap sosialisasi perpustakaan.</p>",
        coverImage: "/api/news/assets/test.png",
        status: "published",
        views: 42,
        createdAt: "2026-11-20T10:00:00Z",
        updatedAt: "2026-11-20T10:00:00Z",
        publishedAt: "2026-11-20T10:00:00Z",
        author: { id: "a1", name: "Pustakawan UMC", email: "pustaka@umc.ac.id" },
      },
    ],
    total: 1,
    page: 1,
    limit: 10,
    totalPages: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (newsService.getNewsList as any).mockResolvedValue(mockNewsData);
  });

  it("merender judul seksi dan data berita dari API", async () => {
    render(
      <MemoryRouter>
        <NewsManagementSection />
      </MemoryRouter>
    );

    expect(screen.getByText("Kabar & Berita Perpustakaan")).toBeInTheDocument();
    expect(screen.getByText("+ Tambah Berita")).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByText("Sosialisasi Perpustakaan Digital UMC 2026")
      ).toBeInTheDocument();
      expect(screen.getAllByText("Kegiatan").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Terbit").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("mengarahkan ke halaman form berita baru saat tombol tambah diklik", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <NewsManagementSection />
      </MemoryRouter>
    );

    const addButton = screen.getByText("+ Tambah Berita");
    await user.click(addButton);

    expect(mockNavigate).toHaveBeenCalledWith("/dashboard/berita/baru");
  });

  it("mengarahkan ke halaman edit berita saat tombol edit diklik", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <NewsManagementSection />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(
        screen.getByText("Sosialisasi Perpustakaan Digital UMC 2026")
      ).toBeInTheDocument();
    });

    const editButton = screen.getByTitle("Edit Artikel");
    await user.click(editButton);

    expect(mockNavigate).toHaveBeenCalledWith("/dashboard/berita/edit/1");
  });
});
