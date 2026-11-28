import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router";
import RepositorySection from "../RepositorySection";
import { repositoryService, type RepositoryProposal } from "@/services/repositoryService";

vi.mock("@/services/repositoryService", () => ({
  repositoryService: {
    getAllProposals: vi.fn(),
    reviewProposal: vi.fn(),
    configurePageRule: vi.fn(),
    deleteProposal: vi.fn(),
  },
}));

vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock("@/hooks/dashboard/useDashboardBadges", () => ({
  triggerBadgeRefresh: vi.fn(),
}));

vi.mock("../repository/ProgramChapterSettingsModal", () => ({
  default: () => null,
}));

vi.mock("@/pages/dashboard/components/RepositoryEditorForm", () => ({
  RepositoryEditorForm: () => null,
}));

const makeProposal = (
  overrides: Partial<RepositoryProposal>
): RepositoryProposal => ({
  id: "id-1",
  proposalNumber: "PROP-202611-0001",
  title: "Judul Default",
  abstract: null,
  keywords: null,
  authorUserId: "user-1",
  authorNim: "230511001",
  authorName: "Mahasiswa Default",
  studyProgramId: 1,
  advisorName1: "Dr. Pembimbing",
  advisorName2: null,
  documentCategory: "THESIS",
  chapter: "FULL_TEXT",
  chapterTitle: "Naskah Lengkap Skripsi",
  status: "APPROVED",
  fileSize: 1024,
  pageCount: 10,
  reviewerUserId: null,
  reviewNotes: null,
  reviewedAt: null,
  createdAt: "2026-11-28T10:00:00.000Z",
  updatedAt: "2026-11-28T10:00:00.000Z",
  pageRules: [],
  ...overrides,
});

describe("RepositorySection - Prioritas Urutan Pengajuan Baru", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("otomatis menempatkan status Pengajuan Baru (SUBMITTED) paling atas di atas status Disetujui", async () => {
    vi.mocked(repositoryService.getAllProposals).mockResolvedValue([
      makeProposal({
        id: "prop-approved-newer",
        proposalNumber: "PROP-202611-7404",
        title: "Naskah Sudah Disetujui Terbaru",
        status: "APPROVED",
        createdAt: "2026-11-28T12:00:00.000Z",
      }),
      makeProposal({
        id: "prop-submitted-older",
        proposalNumber: "PROP-202611-3144",
        title: "Pengajuan Baru Lama",
        status: "SUBMITTED",
        createdAt: "2026-11-28T08:00:00.000Z",
      }),
      makeProposal({
        id: "prop-submitted-newer",
        proposalNumber: "PROP-202611-6633",
        title: "Pengajuan Baru Terbaru",
        status: "SUBMITTED",
        createdAt: "2026-11-28T09:00:00.000Z",
      }),
    ]);

    render(
      <MemoryRouter>
        <RepositorySection />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Pengajuan Baru Terbaru")).toBeInTheDocument();
    });

    const rows = screen.getAllByRole("row").slice(1); // skip thead row
    expect(rows[0]).toHaveTextContent("Pengajuan Baru Terbaru");
    expect(rows[0]).toHaveTextContent("Pengajuan Baru");
    expect(rows[1]).toHaveTextContent("Pengajuan Baru Lama");
    expect(rows[1]).toHaveTextContent("Pengajuan Baru");
    expect(rows[2]).toHaveTextContent("Naskah Sudah Disetujui Terbaru");
    expect(rows[2]).toHaveTextContent("Disetujui");
  });
});
