import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import BibliographySection from "@/components/dashboard/BibliographySection";

// Mock the API client
vi.mock("@/api/client", () => ({
  bibliographyApi: {
    list: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deduplicate: vi.fn(),
  },
  locationApi: {
    list: vi.fn().mockResolvedValue({
      data: [{ id: 13, room: "Ruang Server", rack: "Rak 01", shelf: "Lantai 1" }],
    }),
  },
  itemApi: {
    bulkCreate: vi.fn().mockResolvedValue({
      success: true,
      data: { created: 3, items: [], errors: [] },
    }),
  },
  facultyApi: {
    list: vi.fn().mockResolvedValue({ data: [{ id: 1, name: "Teknik" }] }),
  },
  studyProgramApi: {
    list: vi.fn().mockResolvedValue({ data: [{ id: 10, name: "Teknik Informatika", facultyId: 1 }] }),
  },
  exportApi: {
    downloadBibliographies: vi.fn(),
  },
}));

import { bibliographyApi, exportApi, itemApi } from "@/api/client";

const mockBibliographies = {
  items: [
    {
      id: "1",
      title: "Test Book",
      isbnIssn: "978-0-123456-78-9",
      edition: "1st",
      publishYear: 2024,
      stock: 5,
      authors: [{ id: 1, name: "John Doe", role: "primary", position: 1 }],
      subjects: [{ id: 1, name: "Programming" }],
      faculties: [{ id: 1, name: "Teknik" }],
      studyPrograms: [{ id: 10, name: "Teknik Informatika" }],
      totalItems: 5,
      availableItems: 3,
      publisher: { id: 1, name: "Test Publisher" },
    },
    {
      id: "2",
      title: "Another Book",
      isbnIssn: "",
      publishYear: 2023,
      stock: 2,
      authors: [],
      subjects: [],
      faculties: [],
      studyPrograms: [],
      totalItems: 2,
      availableItems: 2,
    },
  ],
  total: 2,
  page: 1,
  limit: 10,
  totalPages: 1,
};

describe("BibliographySection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (bibliographyApi.list as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: mockBibliographies,
    });
  });

  it("should render bibliography list", async () => {
    render(<BibliographySection searchTerm="" onSearchChange={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Test Book")).toBeInTheDocument();
      expect(screen.getByText("Another Book")).toBeInTheDocument();
    });
  });

  it("should display author names", async () => {
    render(<BibliographySection searchTerm="" onSearchChange={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });
  });

  it("should display publisher name", async () => {
    render(<BibliographySection searchTerm="" onSearchChange={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Test Publisher")).toBeInTheDocument();
    });
  });

  it("should display stock information", async () => {
    render(<BibliographySection searchTerm="" onSearchChange={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("3/5")).toBeInTheDocument();
    });
  });

  it("should display faculty and prodi in table", async () => {
    render(<BibliographySection searchTerm="" onSearchChange={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Fakultas & Prodi")).toBeInTheDocument();
      expect(screen.getAllByText("Teknik").length).toBeGreaterThan(0);
      // "Teknik Informatika" appears in both the dropdown option and the table badge
      expect(screen.getAllByText("Teknik Informatika").length).toBeGreaterThan(0);
    });
  });

  it("should show empty state when no data", async () => {
    (bibliographyApi.list as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { items: [], total: 0, page: 1, limit: 10, totalPages: 0 },
    });

    render(<BibliographySection searchTerm="" onSearchChange={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Belum ada bibliografi")).toBeInTheDocument();
    });
  });

  it("should show search results empty state", async () => {
    (bibliographyApi.list as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { items: [], total: 0, page: 1, limit: 10, totalPages: 0 },
    });

    render(<BibliographySection searchTerm="nonexistent" onSearchChange={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Tidak ada hasil")).toBeInTheDocument();
    });
  });

  it("should show error state when API fails", async () => {
    (bibliographyApi.list as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Network error")
    );

    render(<BibliographySection searchTerm="" onSearchChange={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Error")).toBeInTheDocument();
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });

  it("should have add button", async () => {
    render(<BibliographySection searchTerm="" onSearchChange={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Tambah")).toBeInTheDocument();
    });
  });

  it("should have search input", async () => {
    render(<BibliographySection searchTerm="" onSearchChange={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Cari bibliografi...")).toBeInTheDocument();
    });
  });

  it("should render faculty filter and trigger export with selected faculty", async () => {
    (exportApi.downloadBibliographies as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    render(<BibliographySection searchTerm="" onSearchChange={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByLabelText("Filter Fakultas")).toBeInTheDocument();
      expect(screen.getAllByText("Teknik").length).toBeGreaterThan(0);
    });

    const select = screen.getByLabelText("Filter Fakultas");
    fireEvent.change(select, { target: { value: "1" } });

    await waitFor(() => {
      expect(bibliographyApi.list).toHaveBeenCalledWith(
        expect.objectContaining({ facultyId: 1 }),
        expect.anything()
      );
    });

    const exportButton = screen.getByRole("button", { name: /Export/i });
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(exportApi.downloadBibliographies).toHaveBeenCalledWith(
        expect.objectContaining({ facultyId: 1 })
      );
    });
  });

  it("should render prodi filter and trigger filter and export with selected prodi", async () => {
    (exportApi.downloadBibliographies as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    render(<BibliographySection searchTerm="" onSearchChange={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByLabelText("Filter Program Studi")).toBeInTheDocument();
    });

    const prodiSelect = screen.getByLabelText("Filter Program Studi");
    fireEvent.change(prodiSelect, { target: { value: "10" } });

    await waitFor(() => {
      expect(bibliographyApi.list).toHaveBeenCalledWith(
        expect.objectContaining({ studyProgramId: 10 }),
        expect.anything()
      );
    });

    const exportButton = screen.getByRole("button", { name: /Export/i });
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(exportApi.downloadBibliographies).toHaveBeenCalledWith(
        expect.objectContaining({ studyProgramId: 10 })
      );
    });
  });

  it("should render column picker button", async () => {
    render(<BibliographySection searchTerm="" onSearchChange={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByLabelText("Pilih Kolom")).toBeInTheDocument();
    });
  });

  it("should open column picker and show all columns as checked", async () => {
    render(<BibliographySection searchTerm="" onSearchChange={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByLabelText("Pilih Kolom")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText("Pilih Kolom"));

    await waitFor(() => {
      expect(screen.getByText("Tampilkan Kolom")).toBeInTheDocument();
      expect(screen.getByText("Tampilkan semua")).toBeInTheDocument();
    });
  });

  it("should hide a column when toggled off in column picker", async () => {
    render(<BibliographySection searchTerm="" onSearchChange={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByLabelText("Pilih Kolom")).toBeInTheDocument();
    });

    // Initially, "Tahun" column header is visible
    expect(screen.getByRole("columnheader", { name: "Tahun" })).toBeInTheDocument();

    // Open column picker
    fireEvent.click(screen.getByLabelText("Pilih Kolom"));

    await waitFor(() => {
      expect(screen.getByText("Tampilkan Kolom")).toBeInTheDocument();
    });

    // Toggle off "Tahun" column
    const allButtons = screen.getAllByRole("button");
    const tahunButton = allButtons.find(
      (btn) => btn.textContent?.includes("Tahun") && !btn.getAttribute("aria-label")
    );
    expect(tahunButton).toBeDefined();
    fireEvent.click(tahunButton!);

    await waitFor(() => {
      expect(screen.queryByRole("columnheader", { name: "Tahun" })).not.toBeInTheDocument();
    });
  });

  it("should render deduplicate button and call bibliographyApi.deduplicate when confirmed", async () => {
    const { bibliographyApi } = await import("@/api/client");
    (bibliographyApi.deduplicate as any) = vi.fn().mockResolvedValue({
      data: { processedGroups: 2, mergedCount: 4, cleanedDuplicates: 3 },
    });
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<BibliographySection searchTerm="" onSearchChange={vi.fn()} />);

    const dedupBtn = await screen.findByRole("button", { name: /Deduplikasi/i });
    expect(dedupBtn).toBeInTheDocument();

    fireEvent.click(dedupBtn);

    await waitFor(() => {
      expect(bibliographyApi.deduplicate).toHaveBeenCalled();
    });
  });

  it("should open quick add item modal and submit bulk items", async () => {
    render(<BibliographySection searchTerm="" onSearchChange={vi.fn()} />);

    // Wait for table to load
    await waitFor(() => {
      expect(screen.getByText("Test Book")).toBeInTheDocument();
    });

    // Find the quick add exemplar button for Test Book
    const addExemplarBtn = screen.getByLabelText("Tambah eksemplar fisik untuk Test Book");
    expect(addExemplarBtn).toBeInTheDocument();

    fireEvent.click(addExemplarBtn);

    // Modal should be opened
    await waitFor(() => {
      expect(screen.getByText("Tambah Eksemplar Fisik Buku")).toBeInTheDocument();
      expect(screen.getByText("Buku Induk (Katalog)")).toBeInTheDocument();
    });

    // Click submit button in modal
    const submitBtn = screen.getByRole("button", { name: /Simpan Eksemplar/i });
    expect(submitBtn).toBeInTheDocument();

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(itemApi.bulkCreate).toHaveBeenCalledWith("1", expect.objectContaining({
        defaults: expect.objectContaining({ locationId: 13 }),
        items: expect.arrayContaining([
          expect.objectContaining({
            locationId: 13,
          }),
        ]),
      }));
    });
  });

  it("opens delete confirmation modal with active items warning and confirms deletion", async () => {
    vi.mocked(bibliographyApi.delete).mockResolvedValue({ success: true, message: "Deleted" } as any);

    render(<BibliographySection searchTerm="" onSearchChange={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Test Book")).toBeInTheDocument();
    });

    // Cari tombol hapus untuk baris buku pertama
    const deleteButtons = screen.getAllByTitle("Hapus Bibliografi");
    expect(deleteButtons.length).toBeGreaterThan(0);

    fireEvent.click(deleteButtons[0]);

    // Modal konfirmasi harus muncul dengan peringatan eksemplar fisik
    await waitFor(() => {
      expect(screen.getByText("Konfirmasi Penghapusan Bibliografi")).toBeInTheDocument();
      expect(screen.getByText("Peringatan Eksemplar Fisik Aktif")).toBeInTheDocument();
      expect(screen.getByText(/5 eksemplar fisik aktif/i)).toBeInTheDocument();
    });

    // Klik tombol konfirmasi Hapus Bibliografi
    const confirmDeleteBtn = screen.getByTestId("confirm-delete-bib-btn");
    fireEvent.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(bibliographyApi.delete).toHaveBeenCalledWith("1");
    });
  });
});
