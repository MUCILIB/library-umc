import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ExportSection from "@/components/dashboard/ExportSection";

// Mock the API client
vi.mock("@/api/client", () => ({
  exportApi: {
    downloadBibliographies: vi.fn(),
    downloadItems: vi.fn(),
    downloadBibliographiesPdf: vi.fn(),
  },
  facultyApi: {
    list: vi.fn().mockResolvedValue({
      data: [
        { id: 1, name: "Fakultas Teknik" },
        { id: 2, name: "Fakultas Ekonomi" },
      ],
    }),
  },
  studyProgramApi: {
    list: vi.fn().mockResolvedValue({
      data: [{ id: 10, name: "Teknik Informatika", facultyId: 1 }],
    }),
  },
}));

import { exportApi, facultyApi, studyProgramApi } from "@/api/client";

describe("ExportSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (facultyApi.list as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [
        { id: 1, name: "Fakultas Teknik" },
        { id: 2, name: "Fakultas Ekonomi" },
      ],
    });
    (studyProgramApi.list as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [{ id: 10, name: "Teknik Informatika", facultyId: 1 }],
    });
  });

  it("should render export section with title and buttons", async () => {
    render(<ExportSection />);

    expect(screen.getByText("Export Data")).toBeInTheDocument();
    expect(screen.getAllByText("Export Bibliografi").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Export Item").length).toBeGreaterThan(0);
    await waitFor(() => {
      expect(screen.getByText("Fakultas Teknik")).toBeInTheDocument();
    });
  });

  it("should open delimiter modal and show loading state when exporting bibliographies", async () => {
    (exportApi.downloadBibliographies as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    render(<ExportSection />);

    const biblioButton = screen.getByRole("button", { name: /Export Bibliografi/i });
    fireEvent.click(biblioButton);

    expect(screen.getByText("Pilih Delimiter Format CSV")).toBeInTheDocument();

    const submitBtn = screen.getByRole("button", { name: /Unduh Berkas CSV/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("Mengexport...")).toBeInTheDocument();
    });
  });

  it("should show success state after successful bibliography export", async () => {
    (exportApi.downloadBibliographies as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    render(<ExportSection />);

    const biblioButton = screen.getByRole("button", { name: /Export Bibliografi/i });
    fireEvent.click(biblioButton);

    const submitBtn = screen.getByRole("button", { name: /Unduh Berkas CSV/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("Berhasil!")).toBeInTheDocument();
    });
  });

  it("should show error state when bibliography export fails", async () => {
    (exportApi.downloadBibliographies as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Network error")
    );

    render(<ExportSection />);

    const biblioButton = screen.getByRole("button", { name: /Export Bibliografi/i });
    fireEvent.click(biblioButton);

    const submitBtn = screen.getByRole("button", { name: /Unduh Berkas CSV/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });

  it("should handle item export success", async () => {
    (exportApi.downloadItems as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    render(<ExportSection />);

    const itemButton = screen.getByRole("button", { name: /Export Item/i });
    fireEvent.click(itemButton);

    const submitBtn = screen.getByRole("button", { name: /Unduh Berkas CSV/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("Berhasil!")).toBeInTheDocument();
    });
  });

  it("should pass selected facultyId, studyProgramId, and delimiter when exporting", async () => {
    (exportApi.downloadBibliographies as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (exportApi.downloadItems as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    render(<ExportSection />);

    await waitFor(() => {
      expect(screen.getByText("Fakultas Teknik")).toBeInTheDocument();
    });

    const facultySelect = screen.getByLabelText("Filter Fakultas");
    fireEvent.change(facultySelect, { target: { value: "1" } });

    await waitFor(() => {
      expect(studyProgramApi.list).toHaveBeenCalledWith(1);
      expect(screen.getByText("Teknik Informatika")).toBeInTheDocument();
    });

    const prodiSelect = screen.getByLabelText("Filter Program Studi");
    fireEvent.change(prodiSelect, { target: { value: "10" } });

    // Test bibliography export with comma delimiter
    const biblioButton = screen.getByRole("button", { name: /Export Bibliografi/i });
    fireEvent.click(biblioButton);

    const commaRadio = screen.getByDisplayValue(",");
    fireEvent.click(commaRadio);

    const submitBtn = screen.getByRole("button", { name: /Unduh Berkas CSV/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(exportApi.downloadBibliographies).toHaveBeenCalledWith({
        facultyId: 1,
        studyProgramId: 10,
        delimiter: ",",
      });
    });

    // Test item export
    const itemButton = screen.getByRole("button", { name: /Export Item/i });
    fireEvent.click(itemButton);

    const itemSubmitBtn = screen.getByRole("button", { name: /Unduh Berkas CSV/i });
    fireEvent.click(itemSubmitBtn);

    await waitFor(() => {
      expect(exportApi.downloadItems).toHaveBeenCalledWith({
        facultyId: 1,
        studyProgramId: 10,
        delimiter: ",",
      });
    });
  });

  it("should export collection PDF with faculty and study program filters", async () => {
    (exportApi.downloadBibliographiesPdf as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    render(<ExportSection />);

    await waitFor(() => {
      expect(screen.getByText("Fakultas Teknik")).toBeInTheDocument();
    });

    const facultySelect = screen.getByLabelText("Filter Fakultas");
    fireEvent.change(facultySelect, { target: { value: "1" } });

    const pdfButton = screen.getByRole("button", { name: /Cetak Katalog PDF/i });
    fireEvent.click(pdfButton);

    await waitFor(() => {
      expect(exportApi.downloadBibliographiesPdf).toHaveBeenCalledWith({
        facultyId: 1,
        studyProgramId: undefined,
      });
      expect(screen.getByText("Berhasil Diunduh!")).toBeInTheDocument();
    });
  });
});
