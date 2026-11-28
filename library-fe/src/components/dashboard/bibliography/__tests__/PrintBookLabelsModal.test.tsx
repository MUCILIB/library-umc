import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PrintBookLabelsModal } from "../PrintBookLabelsModal";
import { bibliographyApi, type Bibliography } from "@/api/client";

vi.mock("@/api/client", () => ({
  bibliographyApi: {
    getById: vi.fn(),
    getItems: vi.fn(),
    fetchLabelsPdf: vi.fn(),
  },
}));

vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  }),
}));

const mockBib: Bibliography = {
  id: "bib-label-1",
  title: "Algoritma dan Pemrograman",
  classification: "005.1",
  callNumber: "005.1 RIR a",
  stock: 6,
  totalItems: 6,
  availableItems: 6,
  authors: [{ id: 1, name: "Rinaldi Munir", role: "primary", position: 1 }],
  subjects: [],
};

const mockItems = Array.from({ length: 6 }, (_, i) => ({
  id: `item-${i + 1}`,
  bibliographyId: "bib-label-1",
  itemCode: `S-26-10001-c${i + 1}`,
  status: "available" as const,
  location: { id: 1, room: "Ruang Sirkulasi", rack: "Rak A", shelf: "1" },
}));

describe("PrintBookLabelsModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(bibliographyApi.getById).mockResolvedValue({
      success: true,
      message: "ok",
      data: mockBib,
    });
    vi.mocked(bibliographyApi.getItems).mockResolvedValue({
      success: true,
      message: "ok",
      data: mockItems,
    });
    vi.mocked(bibliographyApi.fetchLabelsPdf).mockResolvedValue({
      blob: new Blob(["%PDF-1.4"], { type: "application/pdf" }),
      filename: "label-buku_algoritma_6-per-lembar.pdf",
    });

    globalThis.URL.createObjectURL = vi.fn(() => "blob:mock-pdf");
    globalThis.URL.revokeObjectURL = vi.fn();
  });

  it("displays classification, author, title, barcode preview, and defaults to 6 labels per sheet", async () => {
    render(<PrintBookLabelsModal bib={mockBib} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Daftar Salinan Buku (6/6 dipilih)")).toBeInTheDocument();
    });

    expect(screen.getAllByText("Algoritma dan Pemrograman").length).toBeGreaterThan(0);
    expect(screen.getByText("Rinaldi Munir")).toBeInTheDocument();
    expect(screen.getByText("005.1")).toBeInTheDocument();
    expect(screen.getByText("RIR")).toBeInTheDocument();
    expect(screen.getByText("a")).toBeInTheDocument();
    expect(screen.getByLabelText("Barcode S-26-10001-c1")).toBeInTheDocument();

    // Change layout from 6 to 12 per sheet
    fireEvent.click(screen.getByText("12").closest("button")!);

    // Trigger PDF download
    fireEvent.click(screen.getByText("Unduh PDF Label"));

    await waitFor(() => {
      expect(bibliographyApi.fetchLabelsPdf).toHaveBeenCalledWith("bib-label-1", {
        perPage: 12,
        itemIds: undefined,
      });
    });
  });
});
