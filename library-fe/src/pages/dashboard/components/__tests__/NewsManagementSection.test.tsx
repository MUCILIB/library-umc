import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import NewsManagementSection from "../NewsManagementSection";
import { newsService } from "@/services/newsService";

vi.mock("@/services/newsService", () => ({
  newsService: {
    getNewsList: vi.fn(),
    getNewsById: vi.fn(),
    getNewsStats: vi.fn(),
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

vi.mock("@/utils/auth-client", () => ({
  authClient: {
    useSession: vi.fn().mockReturnValue({
      data: { user: { id: "u1", name: "Admin Perpustakaan", email: "admin@umc.ac.id" } },
    }),
  },
}));

// Mock RichTextEditor
vi.mock("@/components/ui/RichTextEditor", () => ({
  RichTextEditor: ({ value, onChange, placeholder }: any) => (
    <div data-testid="mock-rich-editor">
      <textarea
        data-testid="rich-editor-textarea"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  ),
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

  const mockStats = {
    total: 1,
    published: 1,
    draft: 0,
    archived: 0,
    totalViews: 1250,
    topArticles: [
      {
        id: "news-1",
        title: "Sosialisasi Perpustakaan Digital UMC 2026",
        slug: "sosialisasi-perpustakaan-digital-umc-2026",
        views: 1250,
        category: "kegiatan" as const,
        publishedAt: "2026-03-20T10:00:00.000Z",
        status: "published" as const,
      },
    ],
    categoryStats: [{ category: "kegiatan" as const, count: 1, views: 1250 }],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (newsService.getNewsList as any).mockResolvedValue(mockNewsData);
    (newsService.getNewsById as any).mockResolvedValue(mockNewsData.items[0]);
    (newsService.getNewsStats as any).mockResolvedValue(mockStats);
  });

  it("merender judul seksi dan data berita dari API", async () => {
    render(
      <MemoryRouter>
        <NewsManagementSection />
      </MemoryRouter>
    );

    expect(screen.getByText("Kabar & Berita Perpustakaan")).toBeInTheDocument();
    expect(screen.getByText("Tambah Berita")).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getAllByText("Sosialisasi Perpustakaan Digital UMC 2026").length
      ).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Kegiatan").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Terbit").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("membuka form berita di dalam dashboard saat tombol tambah diklik", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <NewsManagementSection />
      </MemoryRouter>
    );

    const addButton = screen.getByText("Tambah Berita");
    await user.click(addButton);

    await waitFor(() => {
      expect(screen.getByText("Tulis Berita Baru")).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Ketik judul artikel berita/i)).toBeInTheDocument();
      expect(screen.getByText("Kembali ke Daftar")).toBeInTheDocument();
    });
  });

  it("membuka form edit berita saat tombol edit diklik", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <NewsManagementSection />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(
        screen.getAllByText("Sosialisasi Perpustakaan Digital UMC 2026").length
      ).toBeGreaterThanOrEqual(1);
    });

    const editButton = screen.getByTitle("Edit Artikel");
    await user.click(editButton);

    await waitFor(() => {
      expect(screen.getByText("Edit Berita")).toBeInTheDocument();
      expect(screen.getByText("Kembali ke Daftar")).toBeInTheDocument();
    });
  });

  it("merender EmptyState saat data berita kosong", async () => {
    (newsService.getNewsList as any).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    });

    render(
      <MemoryRouter>
        <NewsManagementSection />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Belum ada berita ditemukan")).toBeInTheDocument();
    });
  });
});
