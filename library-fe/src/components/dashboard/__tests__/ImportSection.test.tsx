import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
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

  it("should display batch status in Indonesian", async () => {
    render(<ImportSection />);
    await waitFor(() => {
      expect(screen.getByText("Selesai")).toBeInTheDocument();
      expect(screen.getByText("Mengunggah")).toBeInTheDocument();
    });
    expect(screen.queryByText("committed")).not.toBeInTheDocument();
    expect(screen.queryByText("uploading")).not.toBeInTheDocument();
  });

  it("should display row counts", async () => {
    render(<ImportSection />);
    await waitFor(() => {
      expect(screen.getByText(/10 baris/)).toBeInTheDocument();
      expect(screen.getByText(/5 baris/)).toBeInTheDocument();
    });
  });

  it("should show empty state and handle empty file selection", async () => {
    (importApi.list as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [],
    });
    render(<ImportSection />);
    await waitFor(() => {
      expect(screen.getByText("Belum ada import")).toBeInTheDocument();
    });
    expect(screen.getByText("Belum ada berkas dipilih")).toBeInTheDocument();
    await fireEvent.click(screen.getByRole("button", { name: /^Upload$/ }));
    await waitFor(() => {
      expect(screen.getByText("Pilih berkas CSV terlebih dahulu.")).toBeInTheDocument();
    });
    expect(importApi.uploadBibliography).not.toHaveBeenCalled();
  });

  it("should show selected filename and upload it", async () => {
    (importApi.uploadBibliography as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { batchId: "batch-3", filename: "baru.csv" },
    });
    render(<ImportSection />);
    await waitFor(() => {
      expect(screen.getByText("Belum ada berkas dipilih")).toBeInTheDocument();
    });
    const file = new File(["a,b\n1,2"], "baru.csv", { type: "text/csv" });
    const input = screen.getByLabelText("File CSV") as HTMLInputElement;
    await fireEvent.change(input, { target: { files: [file] } });
    expect(screen.getByText("baru.csv")).toBeInTheDocument();
    expect(screen.queryByText("Belum ada berkas dipilih")).not.toBeInTheDocument();
    await fireEvent.click(screen.getByRole("button", { name: /^Upload$/ }));
    await waitFor(() => {
      expect(importApi.uploadBibliography).toHaveBeenCalledWith(file);
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

  it("opens a batch with the keyboard", async () => {
    vi.mocked(importApi.get).mockResolvedValue({ data: mockBatches[0] } as Awaited<ReturnType<typeof importApi.get>>);
    vi.mocked(importApi.preview).mockResolvedValue({ data: { batch: mockBatches[0], rows: [], errors: [], pagination: { total: 0, limit: 20 } } } as unknown as Awaited<ReturnType<typeof importApi.preview>>);
    const user = userEvent.setup();
    render(<ImportSection />);
    const batchButton = await screen.findByRole("button", { name: /test-biblio.csv/ });
    batchButton.focus();
    await user.keyboard("{Enter}");
    expect(await screen.findByText("Kembali ke daftar")).toBeInTheDocument();
    expect(importApi.get).toHaveBeenCalledWith("batch-1");
  });

  it("should open batch detail on click and show step guidance", async () => {
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
      expect(screen.getByText("1")).toBeInTheDocument();
      expect(screen.getByText("Unggah")).toBeInTheDocument();
      expect(screen.getByText("Parse / Validasi")).toBeInTheDocument();
      expect(screen.getByText("Tinjau")).toBeInTheDocument();
      expect(screen.getByText("Setujui")).toBeInTheDocument();
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
    (importApi.preview as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        batch: previewBatch,
        rows: [
          { id: "r1", rowNumber: 1, rawData: { title: "Judul A", item_code: "S001" }, status: "valid" },
          { id: "r2", rowNumber: 2, rawData: { title: "Judul B", item_code: "S002" }, status: "invalid" },
        ],
        errors: [{ rowNumber: 2, errors: ["existing item detail conflicts: invoice"] }],
        pagination: { total: 2, limit: 20 },
      },
    });
    render(<ImportSection />);
    await waitFor(() => {
      expect(screen.getByText("test-items.csv")).toBeInTheDocument();
    });
    await fireEvent.click(screen.getByText("test-items.csv"));
    await waitFor(() => {
      expect(screen.getByText("Approve")).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText("Preview Data")).toBeInTheDocument();
      expect(screen.getByText(/1 baris bermasalah/)).toBeInTheDocument();
      expect(screen.getByText(/Baris 2:/)).toBeInTheDocument();
      expect(screen.getByText(/title: Judul A/)).toBeInTheDocument();
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
