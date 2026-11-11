import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import RepositoriPage from "../RepositoriPage";
import { repositoryService, type RepositoryProposal } from "@/services/repositoryService";
import { facultyApi, studyProgramApi } from "@/api/client";

vi.mock("@/services/repositoryService", () => ({
  repositoryService: {
    getPublishedProposals: vi.fn(),
  },
}));

vi.mock("@/api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/client")>();
  return {
    ...actual,
    facultyApi: {
      list: vi.fn(),
    },
    studyProgramApi: {
      list: vi.fn(),
    },
    getAuthHeaders: vi.fn().mockReturnValue({}),
  };
});

vi.mock("@/utils/auth-client", () => ({
  authClient: {
    useSession: () => ({
      data: {
        user: { role: "student", name: "Fauzan" },
      },
    }),
    signOut: vi.fn(),
  },
}));

const mockFaculties = [
  { id: 1, name: "Fakultas Teknik", code: "FT" },
  { id: 2, name: "Fakultas Ekonomi dan Bisnis", code: "FEB" },
];

const mockProposals: RepositoryProposal[] = [
  {
    id: "repo-1",
    proposalNumber: "PROP-FT-2026-001",
    title: "Implementasi Edge Computing Pada IoT Pertanian Presisi",
    abstract: "Penelitian ini mengkaji optimasi latensi jaringan menggunakan gateway edge di lingkungan smart farming.",
    keywords: ["IoT", "Edge Computing", "Smart Farming"],
    authorUserId: "user-1",
    authorNim: "202201001",
    authorName: "Ahmad Dahlan",
    studyProgramId: 1,
    advisorName1: "Dr. Ir. Budi Santoso",
    advisorName2: null,
    documentCategory: "THESIS",
    status: "APPROVED",
    fileSize: 2500000,
    pageCount: 120,
    reviewerUserId: "admin-1",
    reviewNotes: "Disetujui untuk arsip repositori",
    reviewedAt: "2026-05-10T10:00:00Z",
    createdAt: "2026-05-01T08:00:00Z",
    updatedAt: "2026-05-10T10:00:00Z",
    studyProgram: {
      id: 1,
      name: "Teknik Informatika",
      code: "TI",
      faculty: {
        id: 1,
        name: "Fakultas Teknik",
        code: "FT",
      },
    },
  },
];

describe("RepositoriPage Component (Anti-Slop & Academic Search)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(facultyApi.list).mockResolvedValue({ success: true, message: "OK", data: mockFaculties as any });
    vi.mocked(studyProgramApi.list).mockResolvedValue({ success: true, message: "OK", data: [] as any });
    vi.mocked(repositoryService.getPublishedProposals).mockResolvedValue(mockProposals);
  });

  it("renders clean academic search header and semantic form", async () => {
    render(
      <MemoryRouter>
        <RepositoriPage />
      </MemoryRouter>
    );

    expect(
      screen.getByRole("heading", { name: /Repositori Karya Ilmiah Mahasiswa/i, level: 1 })
    ).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(/Cari berdasarkan judul, penulis, NIM, atau abstrak.../i);
    expect(searchInput).toBeInTheDocument();

    const submitBtn = screen.getByRole("button", { name: /^Cari$/i });
    expect(submitBtn).toBeInTheDocument();
  });

  it("renders paper card with real metadata and NO fake views/downloads", async () => {
    render(
      <MemoryRouter>
        <RepositoriPage />
      </MemoryRouter>
    );

    // Judul naskah
    expect(await screen.findByText("Implementasi Edge Computing Pada IoT Pertanian Presisi")).toBeInTheDocument();

    // Penulis dan NIM
    expect(screen.getByText("Ahmad Dahlan")).toBeInTheDocument();
    expect(screen.getByText(/202201001/)).toBeInTheDocument();

    // Fakultas & Prodi
    expect(screen.getByText(/Teknik Informatika/)).toBeInTheDocument();
    expect(screen.getAllByText(/Fakultas Teknik/).length).toBeGreaterThanOrEqual(1);

    // Verifikasi Pustakawan Badge
    expect(screen.getByText(/Terverifikasi Pustakawan UMC/i)).toBeInTheDocument();

    // ANTI-SLOP VERIFICATION (R-17 & R-36): Tidak boleh ada kata/angka views atau downloads acak di kartu
    expect(screen.queryByText(/views/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/downloads/i)).not.toBeInTheDocument();
  });

  it("filters items by search input when form is submitted", async () => {
    render(
      <MemoryRouter>
        <RepositoriPage />
      </MemoryRouter>
    );

    await screen.findByText("Implementasi Edge Computing Pada IoT Pertanian Presisi");

    const searchInput = screen.getByPlaceholderText(/Cari berdasarkan judul, penulis, NIM, atau abstrak.../i);
    fireEvent.change(searchInput, { target: { value: "Judul Yang Tidak Ada" } });

    const submitBtn = screen.getByRole("button", { name: /^Cari$/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/Tidak ditemukan karya ilmiah/i)).toBeInTheDocument();
  });

  it("shows empty state and allows resetting filters", async () => {
    render(
      <MemoryRouter>
        <RepositoriPage />
      </MemoryRouter>
    );

    await screen.findByText("Implementasi Edge Computing Pada IoT Pertanian Presisi");

    const searchInput = screen.getByPlaceholderText(/Cari berdasarkan judul, penulis, NIM, atau abstrak.../i);
    fireEvent.change(searchInput, { target: { value: "NonExistentTerm" } });
    fireEvent.click(screen.getByRole("button", { name: /^Cari$/i }));

    const resetBtn = await screen.findByRole("button", { name: /Reset Filter Pencarian/i });
    expect(resetBtn).toBeInTheDocument();

    fireEvent.click(resetBtn);

    expect(await screen.findByText("Implementasi Edge Computing Pada IoT Pertanian Presisi")).toBeInTheDocument();
  });

  it("handles loading skeleton gracefully", async () => {
    vi.mocked(repositoryService.getPublishedProposals).mockReturnValue(new Promise(() => {}));

    render(
      <MemoryRouter>
        <RepositoriPage />
      </MemoryRouter>
    );

    expect(screen.getByTestId("repo-loading-skeleton")).toBeInTheDocument();
  });

  it("handles error state and provides retry action", async () => {
    vi.mocked(repositoryService.getPublishedProposals).mockRejectedValue(new Error("Network Error"));

    render(
      <MemoryRouter>
        <RepositoriPage />
      </MemoryRouter>
    );

    expect(await screen.findByText(/Gagal Memuat Repositori/i)).toBeInTheDocument();
    const retryBtn = screen.getByRole("button", { name: /Coba Lagi/i });
    expect(retryBtn).toBeInTheDocument();
  });
});
