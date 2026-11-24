import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import NewsEditorForm from "../components/NewsEditorForm";
import { newsService } from "@/services/newsService";

const mockBack = vi.fn();
const mockSuccess = vi.fn();

vi.mock("@/services/newsService", () => ({
  newsService: {
    getNewsById: vi.fn(),
    createNews: vi.fn(),
    updateNews: vi.fn(),
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

describe("NewsEditorForm Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("merender form halaman create berita baru dengan elemen lengkap", async () => {
    render(
      <MemoryRouter>
        <NewsEditorForm onBack={mockBack} onSuccess={mockSuccess} />
      </MemoryRouter>
    );

    expect(screen.getByText("Tulis Berita Baru")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ketik judul artikel berita/i)).toBeInTheDocument();
    expect(screen.getByText(/Permalink/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Ringkasan Singkat/i)).toBeInTheDocument();
    expect(screen.getByTestId("mock-rich-editor")).toBeInTheDocument();
    expect(screen.getByText("Status & Publikasi")).toBeInTheDocument();
    expect(screen.getByText("Gambar Sampul")).toBeInTheDocument();
  });

  it("otomatis membuat slug saat judul diketik dan bersifat readOnly", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <NewsEditorForm onBack={mockBack} onSuccess={mockSuccess} />
      </MemoryRouter>
    );

    const titleInput = screen.getByPlaceholderText(/Ketik judul artikel berita/i);
    await user.type(titleInput, "Pelatihan Literasi Informasi 2026");

    const slugInput = screen.getByPlaceholderText("otomatis-mengikuti-judul") as HTMLInputElement;
    expect(slugInput.value).toBe("pelatihan-literasi-informasi-2026");
    expect(slugInput.readOnly).toBe(true);
  });

  it("memuat data berita saat dalam mode edit", async () => {
    const mockItem = {
      id: "news-123",
      title: "Judul Berita Lama",
      slug: "judul-berita-lama",
      category: "agenda",
      excerpt: "Ringkasan lama",
      content: "<p>Konten artikel lama</p>",
      coverImage: "/api/news/assets/sample.png",
      status: "published",
      views: 120,
      publishedAt: "2026-11-20T10:00:00.000Z",
      author: { id: "a1", name: "Pustakawan UMC", email: "p@umc.ac.id" },
    };

    (newsService.getNewsById as any).mockResolvedValue(mockItem);

    render(
      <MemoryRouter>
        <NewsEditorForm id="news-123" onBack={mockBack} onSuccess={mockSuccess} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Edit Berita")).toBeInTheDocument();
      expect(
        (screen.getByPlaceholderText(/Ketik judul artikel berita/i) as HTMLInputElement).value
      ).toBe("Judul Berita Lama");
      expect(
        (screen.getByLabelText(/Ringkasan Singkat/i) as HTMLTextAreaElement).value
      ).toBe("Ringkasan lama");
    });
  });

  it("berhasil memanggil newsService.createNews saat form disimpan", async () => {
    const user = userEvent.setup();
    (newsService.createNews as any).mockResolvedValue({ id: "new-id", title: "Berita Baru" });

    render(
      <MemoryRouter>
        <NewsEditorForm onBack={mockBack} onSuccess={mockSuccess} />
      </MemoryRouter>
    );

    const titleInput = screen.getByPlaceholderText(/Ketik judul artikel berita/i);
    await user.type(titleInput, "Judul Berita Baru Mantap");

    const editorTextarea = screen.getByTestId("rich-editor-textarea");
    await user.type(editorTextarea, "<p>Ini konten lengkap berita baru yang panjang dan informatif.</p>");

    const submitBtn = screen.getAllByRole("button", { name: /Terbitkan Berita/i })[0];
    await user.click(submitBtn);

    await waitFor(() => {
      expect(newsService.createNews).toHaveBeenCalled();
      expect(mockSuccess).toHaveBeenCalled();
    });
  });
});
