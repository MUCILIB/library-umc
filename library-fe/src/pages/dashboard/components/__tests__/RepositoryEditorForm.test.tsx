import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RepositoryEditorForm } from "../RepositoryEditorForm";
import { repositoryService } from "@/services/repositoryService";

vi.mock("@/services/repositoryService", () => ({
  repositoryService: {
    getChapterSettings: vi.fn().mockResolvedValue({}),
    getProposalById: vi.fn(),
    submitProposal: vi.fn(),
    updateProposal: vi.fn(),
    configurePageRule: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("@/api/client", () => ({
  studyProgramApi: {
    list: vi.fn().mockResolvedValue({
      data: [
        { id: 1, name: "Teknik Informatika", degree: "S1" },
        { id: 2, name: "Ilmu Komunikasi", degree: "S1" },
      ],
    }),
  },
}));

describe("RepositoryEditorForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders new repository upload form with live word count and submits proposal", async () => {
    vi.mocked(repositoryService.submitProposal).mockResolvedValue({
      id: "prop-123",
      title: "Skripsi Sistem AI",
      authorName: "Ahmad Mahasiswa",
      authorNim: "2021001",
      studyProgramId: 1,
      documentCategory: "THESIS",
      advisorName1: "Dr. Pembimbing Utama",
      status: "APPROVED",
    } as any);

    const onBack = vi.fn();
    const onSuccess = vi.fn();

    render(
      <RepositoryEditorForm
        isEdit={false}
        onBack={onBack}
        onSuccess={onSuccess}
      />
    );

    expect(screen.getByText("Unggah Naskah Repositori Baru")).toBeInTheDocument();
    expect(screen.getByText("Entri Naskah Baru")).toBeInTheDocument();

    // Fill Author & NIM
    fireEvent.change(screen.getByPlaceholderText(/Nama lengkap beserta gelar/i), {
      target: { value: "Ahmad Mahasiswa" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Contoh: 2021081001/i), {
      target: { value: "2021001" },
    });

    // Fill Title
    fireEvent.change(screen.getByPlaceholderText(/Contoh: Rancang Bangun Sistem Informasi/i), {
      target: { value: "Skripsi Sistem AI" },
    });

    // Fill Advisor 1
    fireEvent.change(screen.getByPlaceholderText(/Contoh: Dr. Ir. H. Ahmad Dahlan/i), {
      target: { value: "Dr. Pembimbing Utama" },
    });

    // Fill Abstract and check live word counter
    const abstractArea = screen.getByPlaceholderText(/Tuliskan atau tempelkan teks abstrak lengkap/i);
    fireEvent.change(abstractArea, {
      target: { value: "Ini adalah pengujian ringkasan abstrak lima kata." },
    });
    expect(screen.getByText("7 / 500 Kata")).toBeInTheDocument();

    // Attach PDF file
    const file = new File(["dummy skripsi content"], "skripsi.pdf", {
      type: "application/pdf",
    });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Submit
    const submitBtn = screen.getByRole("button", { name: /Unggah & Terbitkan/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(repositoryService.submitProposal).toHaveBeenCalledTimes(1);
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
  });

  it("loads existing proposal and submits update in edit mode", async () => {
    vi.mocked(repositoryService.getProposalById).mockResolvedValue({
      id: "prop-999",
      title: "Skripsi Lama UMC",
      authorName: "Siti Mahasiswi",
      authorNim: "2020002",
      studyProgramId: 1,
      documentCategory: "THESIS",
      chapter: "BAB_1",
      chapterTitle: "Bab 1 - Pendahuluan",
      advisorName1: "Dr. Pembimbing Satu",
      advisorName2: "Siti Pembimbing Dua",
      abstract: "Abstrak naskah lama",
      keywords: ["AI", "Library"],
      status: "APPROVED",
      fileSize: 1024 * 1024 * 15,
      pageCount: 80,
      storagePath: "repo/123.pdf",
      pageRules: [{ roleScope: "PUBLIC", allowedStartPage: 1, allowedEndPage: 12 }],
    } as any);

    vi.mocked(repositoryService.updateProposal).mockResolvedValue({
      id: "prop-999",
      title: "Skripsi Lama UMC Updated",
    } as any);

    const onBack = vi.fn();
    const onSuccess = vi.fn();

    render(
      <RepositoryEditorForm
        isEdit={true}
        editId="prop-999"
        onBack={onBack}
        onSuccess={onSuccess}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue("Skripsi Lama UMC")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Siti Mahasiswi")).toBeInTheDocument();
    });

    expect(screen.getByText("Edit Naskah Skripsi / Karya Ilmiah")).toBeInTheDocument();
    expect(screen.getByText("Mode Edit")).toBeInTheDocument();

    // Submit update
    const updateBtn = screen.getByRole("button", { name: /Perbarui Naskah/i });
    fireEvent.click(updateBtn);

    await waitFor(() => {
      expect(repositoryService.updateProposal).toHaveBeenCalledWith(
        "prop-999",
        expect.objectContaining({
          title: "Skripsi Lama UMC",
          authorName: "Siti Mahasiswi",
        }),
        undefined
      );
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
  });
});
