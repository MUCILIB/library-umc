import { render, screen, fireEvent } from "@testing-library/react";
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
    bulkCreate: vi.fn().mockResolvedValue({ data: { count: 3 } }),
    getQrSvg: vi.fn(() => "http://localhost:4000/api/items/1/qr?format=svg"),
    getQrPng: vi.fn(() => "http://localhost:4000/api/items/1/qr?format=png"),
  },
  bibliographyApi: {
    list: vi.fn().mockResolvedValue({
      data: {
        items: [{ id: "bib-1", title: "Katalog Buku UMC", callNumber: "QA76" }],
      },
    }),
  },
  locationApi: {
    list: vi.fn().mockResolvedValue({ data: [] }),
    getById: vi.fn(),
  },
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("ItemSection Bulk Create Quantity Input", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { items: [] } }),
    });
  });

  it("renders quantity input as text with numeric inputMode, rejects non-digits, and allows typing custom number", async () => {
    render(<ItemSection />);

    // Buka modal Bulk Item
    const bulkBtn = await screen.findByRole("button", { name: /^Bulk$/i });
    fireEvent.click(bulkBtn);

    // Cari input jumlah item
    const quantityInput = await screen.findByLabelText(/Jumlah Item/i);
    expect(quantityInput).toBeInTheDocument();

    // Verifikasi tipe input adalah text (bukan number yang mengunci input)
    expect(quantityInput).toHaveAttribute("type", "text");
    expect(quantityInput).toHaveAttribute("inputmode", "numeric");

    // Uji ketik huruf dan karakter non-digit: harus difilter
    fireEvent.change(quantityInput, { target: { value: "abc!@#" } });
    expect((quantityInput as HTMLInputElement).value).toBe("");

    // Uji ketik angka kustom secara bebas (misal 15)
    fireEvent.change(quantityInput, { target: { value: "15" } });
    expect((quantityInput as HTMLInputElement).value).toBe("15");

    // Uji ketik angka lain (misal 5)
    fireEvent.change(quantityInput, { target: { value: "5" } });
    expect((quantityInput as HTMLInputElement).value).toBe("5");
  });
});
