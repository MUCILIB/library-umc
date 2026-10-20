import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import CirculationSection from "@/components/dashboard/CirculationSection";

vi.mock("@/api/client", () => ({
  API_BASE_URL: "http://localhost:4100",
}));

describe("CirculationSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("renders scan form with default inputs", () => {
    render(<CirculationSection />);
    expect(screen.getByText("Sirkulasi")).toBeInTheDocument();
    expect(screen.getByText("Scan / Lookup Item")).toBeInTheDocument();
  });

  it("shows scan button disabled when input empty", () => {
    render(<CirculationSection />);
    const scanBtn = screen.getByRole("button", { name: /lookup/i });
    expect(scanBtn).toBeDisabled();
  });

  it("enables scan button when input is provided", () => {
    render(<CirculationSection />);
    const input = screen.getByPlaceholderText(/kode item/i);
    fireEvent.change(input, { target: { value: "ITEM-001" } });
    const scanBtn = screen.getByRole("button", { name: /lookup/i });
    expect(scanBtn).not.toBeDisabled();
  });

  it("shows error on failed lookup", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ success: false, message: "Item not found" }),
    } as any);

    render(<CirculationSection />);
    const input = screen.getByPlaceholderText(/kode item/i);
    fireEvent.change(input, { target: { value: "INVALID" } });
    fireEvent.click(screen.getByRole("button", { name: /lookup/i }));

    await waitFor(() => {
      expect(screen.getByText("Item not found")).toBeInTheDocument();
    });
  });

  it("shows Item result after successful lookup", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          item: { id: "1", itemCode: "ITEM-001", title: "Test Book", status: "available", location: "Main" },
          activeLoan: null,
          allowedActions: ["loan"],
        },
      }),
    } as any);

    render(<CirculationSection />);
    const input = screen.getByPlaceholderText(/kode item/i);
    fireEvent.change(input, { target: { value: "ITEM-001" } });
    fireEvent.click(screen.getByRole("button", { name: /lookup/i }));

    await waitFor(() => {
      expect(screen.getByText("ITEM-001")).toBeInTheDocument();
      expect(screen.getByText("Test Book")).toBeInTheDocument();
      expect(screen.getByText("available")).toBeInTheDocument();
    });
  });

  it("shows tailored loan info and does not show raw bulk return buttons when item is loaned", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          item: { id: "2", itemCode: "ITEM-002", title: "Loaned Book", status: "loaned", location: "Main" },
          activeLoan: {
            id: "loan-123",
            memberName: "Budi Santoso",
            dueDate: "2026-11-01T00:00:00.000Z",
          },
          allowedActions: ["return"],
        },
      }),
    } as any);

    render(<CirculationSection />);
    const input = screen.getByPlaceholderText(/kode item/i);
    fireEvent.change(input, { target: { value: "ITEM-002" } });
    fireEvent.click(screen.getByRole("button", { name: /lookup/i }));

    await waitFor(() => {
      expect(screen.getByText("ITEM-002")).toBeInTheDocument();
      expect(screen.getAllByText("Budi Santoso").length).toBeGreaterThanOrEqual(1);
      // Inspect mode (default) does not render the 3 raw return buttons
      expect(screen.queryByText("Kembalikan (Kondisi Baik)")).not.toBeInTheDocument();
      expect(screen.queryByText("Kembalikan (Kondisi Rusak)")).not.toBeInTheDocument();
      expect(screen.queryByText("Kembalikan (Hilang)")).not.toBeInTheDocument();
    });
  });
});
