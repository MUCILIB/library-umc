import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { EbookEditorForm } from "../EbookEditorForm";
import { ebookService } from "@/services/ebookService";

vi.mock("@/services/ebookService", () => ({
  ebookService: {
    getEbookById: vi.fn(),
    createEbook: vi.fn(),
    updateEbook: vi.fn(),
  },
}));

vi.mock("@/services/dashboard/dashboardDataService", () => ({
  dashboardDataService: {
    getCategories: vi.fn().mockResolvedValue([
      { id: 1, name: "Teknologi" },
      { id: 2, name: "Sains" },
    ]),
  },
}));

describe("EbookEditorForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders create form with empty fields and calls createEbook on submit", async () => {
    vi.mocked(ebookService.createEbook).mockResolvedValue({
      id: "ebook-123",
      title: "Buku Baru React",
      authors: [],
      type: "ebook",
    });

    const onBack = vi.fn();
    const onSuccess = vi.fn();

    render(
      <EbookEditorForm
        isEdit={false}
        onBack={onBack}
        onSuccess={onSuccess}
      />
    );

    expect(screen.getByText("Tambah Koleksi E-Book Baru")).toBeInTheDocument();
    expect(screen.getByText("Entri Baru")).toBeInTheDocument();

    // Fill title
    const titleInput = screen.getByPlaceholderText(
      /Contoh: Pemrograman Web Modern dengan React dan TypeScript/i
    );
    fireEvent.change(titleInput, { target: { value: "Buku Baru React" } });

    // Attach mock PDF file
    const file = new File(["dummy pdf content"], "sample.pdf", {
      type: "application/pdf",
    });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Submit
    const saveButton = screen.getByRole("button", { name: /Simpan Koleksi/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(ebookService.createEbook).toHaveBeenCalledTimes(1);
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
  });

  it("loads existing ebook and calls updateEbook on edit", async () => {
    vi.mocked(ebookService.getEbookById).mockResolvedValue({
      id: "ebook-456",
      title: "Ebook Existing Data",
      authors: [{ id: 1, name: "Dr. Budi" }],
      publisher: { id: 1, name: "Penerbit UMC" },
      publishYear: 2023,
      isbn: "978-1234567890",
      description: "Deskripsi buku",
      type: "ebook",
      content: {
        id: "c-1",
        fileSize: 1024 * 1024 * 5,
        pageCount: 150,
        isFullAccess: true,
        previewStartPage: 1,
        previewEndPage: 10,
        allowDownload: true,
      },
    });

    vi.mocked(ebookService.updateEbook).mockResolvedValue({
      id: "ebook-456",
      title: "Ebook Existing Data Updated",
      authors: [],
      type: "ebook",
    });

    const onBack = vi.fn();
    const onSuccess = vi.fn();

    render(
      <EbookEditorForm
        isEdit={true}
        editId="ebook-456"
        onBack={onBack}
        onSuccess={onSuccess}
      />
    );

    // Verify populated title
    await waitFor(() => {
      expect(screen.getByDisplayValue("Ebook Existing Data")).toBeInTheDocument();
    });

    expect(screen.getByText("Edit Metadata E-Book")).toBeInTheDocument();
    expect(screen.getByText("Mode Edit")).toBeInTheDocument();

    // Click submit
    const updateButton = screen.getByRole("button", { name: /Perbarui E-Book/i });
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(ebookService.updateEbook).toHaveBeenCalledWith(
        "ebook-456",
        expect.any(FormData)
      );
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
  });
});
