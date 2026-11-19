import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ExportReportModal from "../reports/ExportReportModal";

// Mock the API client
vi.mock("@/api/client", () => ({
  facultyApi: {
    list: vi.fn().mockResolvedValue({
      data: [
        { id: 1, name: "Fakultas Teknik" },
        { id: 2, name: "Fakultas Ekonomi dan Bisnis" },
      ],
    }),
  },
  studyProgramApi: {
    list: vi.fn().mockResolvedValue({
      data: [
        { id: 101, name: "Teknik Informatika", facultyId: 1 },
        { id: 102, name: "Teknik Industri", facultyId: 1 },
        { id: 201, name: "Manajemen", facultyId: 2 },
      ],
    }),
  },
}));

describe("ExportReportModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders correctly with default loans report type and prodi options", async () => {
    await act(async () => {
      render(<ExportReportModal isOpen={true} onClose={vi.fn()} initialType="loans" />);
    });

    expect(screen.getByText("Export Laporan Peminjaman")).toBeInTheDocument();
    expect(screen.getByText("Program Studi (Pilihan Spesifik) *")).toBeInTheDocument();
    expect(screen.getByText("Semua Program Studi (Universitas)")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Teknik Informatika/)).toBeInTheDocument();
    });
  });

  it("allows selecting a specific study program and clicking Unduh Laporan", async () => {
    const windowOpenSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    const onCloseMock = vi.fn();

    await act(async () => {
      render(<ExportReportModal isOpen={true} onClose={onCloseMock} initialType="loans" />);
    });

    await waitFor(() => {
      expect(screen.getByText(/Teknik Informatika/)).toBeInTheDocument();
    });

    const prodiSelect = screen.getByLabelText("Program Studi (Pilihan Spesifik) *");
    await act(async () => {
      fireEvent.change(prodiSelect, { target: { value: "101" } });
    });

    const downloadBtn = screen.getByRole("button", { name: /Unduh Laporan/i });
    await act(async () => {
      fireEvent.click(downloadBtn);
    });

    expect(windowOpenSpy).toHaveBeenCalledWith(
      expect.stringContaining("studyProgramId=101"),
      "_blank"
    );

    windowOpenSpy.mockRestore();
  });

  it("switches to bibliographies report type when clicking Katalog Buku button", async () => {
    await act(async () => {
      render(<ExportReportModal isOpen={true} onClose={vi.fn()} initialType="loans" />);
    });

    const biblioTab = screen.getByRole("button", { name: /Katalog Buku/i });
    await act(async () => {
      fireEvent.click(biblioTab);
    });

    expect(screen.getByText("Export Katalog Koleksi Buku")).toBeInTheDocument();
  });

  it("calls onClose when Batal is clicked", async () => {
    const onCloseMock = vi.fn();
    await act(async () => {
      render(<ExportReportModal isOpen={true} onClose={onCloseMock} />);
    });

    const cancelBtn = screen.getByRole("button", { name: "Batal" });
    await act(async () => {
      fireEvent.click(cancelBtn);
    });

    expect(onCloseMock).toHaveBeenCalled();
  });
});
