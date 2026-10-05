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

import { bibliographyApi, exportApi, studyProgramApi } from "@/api/client";

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
        expect.objectContaining({ facultyId: 1 })
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
        expect.objectContaining({ studyProgramId: 10 })
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
});
