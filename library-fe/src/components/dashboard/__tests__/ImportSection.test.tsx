import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ImportSection from "@/components/dashboard/ImportSection";

vi.mock("@/api/client", () => ({
  importApi: {
    list: vi.fn(),
    uploadBibliography: vi.fn(),
    uploadItem: vi.fn(),
    get: vi.fn(),
    parse: vi.fn(),
    validate: vi.fn(),
    preview: vi.fn(),
    approve: vi.fn(),
    cancel: vi.fn(),
    downloadErrors: vi.fn(),
  },
}));

import { importApi } from "@/api/client";

const mockBatches = [
  {
    id: "batch-1",
    type: "bibliography",
    filename: "test-biblio.csv",
    status: "committed",
    totalRows: 10,
    processedRows: 10,
    validRows: 8,
    invalidRows: 2,
    committedRows: 8,
    duplicateRows: 0,
    failedRows: 0,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "batch-2",
    type: "item",
    filename: "test-items.csv",
    status: "uploading",
    totalRows: 5,
    processedRows: 0,
    validRows: 0,
    invalidRows: 0,
    committedRows: 0,
    duplicateRows: 0,
    failedRows: 0,
    createdAt: "2024-01-02T00:00:00Z",
  },
];

describe("ImportSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (importApi.list as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: mockBatches,
    });
  });

  it("should render import section", async () => {
    render(<ImportSection />);
    await waitFor(() => {
      expect(screen.getByText("Import Data")).toBeInTheDocument();
    });
  });

  it("should render batch list", async () => {
    render(<ImportSection />);
    await waitFor(() => {
      expect(screen.getByText("test-biblio.csv")).toBeInTheDocument();
      expect(screen.getByText("test-items.csv")).toBeInTheDocument();
    });
  });

  it("should display batch type", async () => {
    render(<ImportSection />);
    await waitFor(() => {
      expect(screen.getAllByText(/Bibliografi/).length).toBeGreaterThan(0);
    });
  });

  it("should display batch status", async () => {
    render(<ImportSection />);
    await waitFor(() => {
      expect(screen.getByText("committed")).toBeInTheDocument();
      expect(screen.getByText("uploading")).toBeInTheDocument();
    });
  });

  it("should display row counts", async () => {
    render(<ImportSection />);
    await waitFor(() => {
      expect(screen.getByText(/10 baris/)).toBeInTheDocument();
      expect(screen.getByText(/5 baris/)).toBeInTheDocument();
    });
  });

  it("should show empty state", async () => {
    (importApi.list as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [],
    });
    render(<ImportSection />);
    await waitFor(() => {
      expect(screen.getByText("Belum ada import")).toBeInTheDocument();
    });
  });

  it("should have upload form", async () => {
    render(<ImportSection />);
    await waitFor(() => {
      expect(screen.getByText("Upload File CSV")).toBeInTheDocument();
      expect(screen.getByText("Upload")).toBeInTheDocument();
    });
  });

  it("should have type selector", async () => {
    render(<ImportSection />);
    await waitFor(() => {
      const selects = screen.getAllByRole("combobox");
      expect(selects.length).toBeGreaterThan(0);
    });
  });

  it("should open batch detail on click", async () => {
    (importApi.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: mockBatches[0],
    });
    render(<ImportSection />);
    await waitFor(() => {
      expect(screen.getByText("test-biblio.csv")).toBeInTheDocument();
    });
    await fireEvent.click(screen.getByText("test-biblio.csv"));
    await waitFor(() => {
      expect(screen.getByText("Kembali ke daftar")).toBeInTheDocument();
    });
  });
});

describe("ImportSection Batch Detail", () => {
  it("should show parse button for uploading status", async () => {
    (importApi.list as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [mockBatches[1]],
    });
    (importApi.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: mockBatches[1],
    });
    render(<ImportSection />);
    await waitFor(() => {
      expect(screen.getByText("test-items.csv")).toBeInTheDocument();
    });
    await fireEvent.click(screen.getByText("test-items.csv"));
    await waitFor(() => {
      expect(screen.getByText("Parse")).toBeInTheDocument();
    });
  });

  it("should show validate button for parsed status", async () => {
    const parsedBatch = { ...mockBatches[1], status: "parsed" };
    (importApi.list as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [parsedBatch],
    });
    (importApi.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: parsedBatch,
    });
    render(<ImportSection />);
    await waitFor(() => {
      expect(screen.getByText("test-items.csv")).toBeInTheDocument();
    });
    await fireEvent.click(screen.getByText("test-items.csv"));
    await waitFor(() => {
      expect(screen.getByText("Validate")).toBeInTheDocument();
    });
  });

  it("should show approve button for preview status", async () => {
    const previewBatch = { ...mockBatches[1], status: "preview" };
    (importApi.list as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [previewBatch],
    });
    (importApi.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: previewBatch,
    });
    render(<ImportSection />);
    await waitFor(() => {
      expect(screen.getByText("test-items.csv")).toBeInTheDocument();
    });
    await fireEvent.click(screen.getByText("test-items.csv"));
    await waitFor(() => {
      expect(screen.getByText("Approve")).toBeInTheDocument();
    });
  });

  it("should handle approval result", async () => {
    const previewBatch = { ...mockBatches[1], status: "preview" };
    (importApi.list as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [previewBatch],
    });
    (importApi.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: previewBatch,
    });
    (importApi.approve as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { processed: 5, committed: 5, failed: 0, remaining: 5, hasMore: true },
    });
    render(<ImportSection />);
    await waitFor(() => {
      expect(screen.getByText("test-items.csv")).toBeInTheDocument();
    });
    await fireEvent.click(screen.getByText("test-items.csv"));
    await waitFor(() => {
      expect(screen.getByText("Approve")).toBeInTheDocument();
    });
    await fireEvent.click(screen.getByText("Approve"));
    await waitFor(() => {
      expect(screen.getByText("Hasil Approval")).toBeInTheDocument();
      expect(screen.getByText("Masih ada data yang perlu di-approve. Klik Approve lagi.")).toBeInTheDocument();
    });
  });
});
