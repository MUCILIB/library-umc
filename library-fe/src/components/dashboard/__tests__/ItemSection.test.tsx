import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ItemSection from "@/components/dashboard/ItemSection";

vi.mock("@/api/client", () => ({
  itemApi: {
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateStatus: vi.fn(),
    updateLocation: vi.fn(),
    delete: vi.fn(),
    getQrSvg: vi.fn(() => "http://localhost:4000/api/items/1/qr?format=svg"),
    getQrPng: vi.fn(() => "http://localhost:4000/api/items/1/qr?format=png"),
    regenerateQr: vi.fn(),
    revokeQr: vi.fn(),
  },
  bibliographyApi: {
    list: vi.fn(),
  },
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const mockItems = [
  {
    id: "1",
    bibliographyId: "bib-1",
    itemCode: "ITEM-001",
    inventoryCode: "INV-001",
    callNumber: "QA76",
    status: "available",
    location: { id: 1, room: "Ruang A", rack: "R1", shelf: "S1" },
    bibliography: { id: "bib-1", title: "Test Book" },
    qrToken: "qr-token-1",
    qrVersion: 1,
    createdAt: "2024-01-01",
  },
  {
    id: "2",
    bibliographyId: "bib-2",
    itemCode: "ITEM-002",
    status: "loaned",
    bibliography: { id: "bib-2", title: "Another Book" },
  },
];

describe("ItemSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { items: mockItems } }),
    });
  });

  it("should render loading state", () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));
    const { container } = render(<ItemSection />);
    const spinner = container.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  it("should render item list", async () => {
    render(<ItemSection />);
    await waitFor(() => {
      expect(screen.getByText("ITEM-001")).toBeInTheDocument();
      expect(screen.getByText("ITEM-002")).toBeInTheDocument();
    });
  });

  it("should display bibliography title", async () => {
    render(<ItemSection />);
    await waitFor(() => {
      expect(screen.getByText("Test Book")).toBeInTheDocument();
    });
  });

  it("should display location", async () => {
    render(<ItemSection />);
    await waitFor(() => {
      expect(screen.getByText("Ruang A, R1")).toBeInTheDocument();
    });
  });

  it("should display status", async () => {
    render(<ItemSection />);
    await waitFor(() => {
      expect(screen.getByText("available")).toBeInTheDocument();
      expect(screen.getByText("loaned")).toBeInTheDocument();
    });
  });

  it("should show QR indicator for items with QR", async () => {
    render(<ItemSection />);
    await waitFor(() => {
      const qrElements = document.querySelectorAll(".text-emerald-500");
      expect(qrElements.length).toBeGreaterThan(0);
    });
  });

  it("should show empty state when no items", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { items: [] } }),
    });
    render(<ItemSection />);
    await waitFor(() => {
      expect(screen.getByText("Belum ada item")).toBeInTheDocument();
    });
  });

  it("should show error state when API fails", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));
    render(<ItemSection />);
    await waitFor(() => {
      expect(screen.getByText("Error")).toBeInTheDocument();
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });

  it("should have search input", async () => {
    render(<ItemSection />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Cari item...")).toBeInTheDocument();
    });
  });

  it("should have add button", async () => {
    render(<ItemSection />);
    await waitFor(() => {
      expect(screen.getByText("Tambah")).toBeInTheDocument();
    });
  });

  it("should open create form", async () => {
    render(<ItemSection />);
    await waitFor(() => {
      expect(screen.getByText("ITEM-001")).toBeInTheDocument();
    });
    await fireEvent.click(screen.getByText("Tambah"));
    await waitFor(() => {
      expect(screen.getAllByText(/Tambah Item/).length).toBeGreaterThan(0);
    });
  });

  it('should open and close QR code modal dialog', async () => {
    render(<ItemSection />);
    await waitFor(() => {
      expect(screen.getByText('ITEM-001')).toBeInTheDocument();
    });
    const qrButtons = screen.getAllByTitle('Lihat QR Code');
    expect(qrButtons.length).toBeGreaterThan(0);
    fireEvent.click(qrButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('QR Code Salinan (Exemplar)')).toBeInTheDocument();
      expect(screen.getByText('Unduh PNG')).toBeInTheDocument();
      expect(screen.getByText('Unduh SVG')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Tutup'));
    await waitFor(() => {
      expect(screen.queryByText('QR Code Salinan (Exemplar)')).not.toBeInTheDocument();
    });
  });
});
