import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ExportReportModal from "../reports/ExportReportModal";

vi.mock("@/api/client", () => ({
  getAuthHeaders: vi.fn(() => ({})),
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

vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  }),
}));

describe("ExportReportModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.URL.createObjectURL = vi.fn(() => "blob:mock-report");
    globalThis.URL.revokeObjectURL = vi.fn();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({
        "Content-Disposition": 'attachment; filename="laporan-peminjaman.csv"',
      }),
      blob: vi.fn().mockResolvedValue(new Blob(["a;b\n"], { type: "text/csv" })),
    }) as unknown as typeof fetch;
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

  it("shows ; and , delimiter options when Excel / CSV is selected and passes chosen delimiter to fetch", async () => {
    await act(async () => {
      render(<ExportReportModal isOpen={true} onClose={vi.fn()} initialType="loans" />);
    });

    // Delimiter picker is hidden when PDF is selected
    expect(screen.queryByText("Pemisah Kolom CSV:")).not.toBeInTheDocument();

    // Switch to Excel / CSV
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Excel \/ CSV/i }));
    });

    expect(screen.getByText("Pemisah Kolom CSV:")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Titik Koma \(;\)/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Koma \(,\)/i })).toBeInTheDocument();

    // Select comma delimiter and download
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Koma \(,\)/i }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Unduh Laporan/i }));
    });

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/format=csv.*delimiter=%2C|delimiter=%2C.*format=csv/),
        expect.any(Object)
      );
    });

    // Switch to Katalog Buku + Standar Sistem UMC while keeping comma delimiter
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Katalog Buku/i }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Standar Sistem UMC/i }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Unduh Laporan/i }));
    });

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenLastCalledWith(
        expect.stringMatching(/\/api\/export\/bibliographies\?format=library&delimiter=%2C/),
        expect.any(Object)
      );
    });

    // Switch back to semicolon delimiter and download
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Titik Koma \(;\)/i }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Unduh Laporan/i }));
    });

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenLastCalledWith(
        expect.stringMatching(/delimiter=%3B/),
        expect.any(Object)
      );
    });
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
