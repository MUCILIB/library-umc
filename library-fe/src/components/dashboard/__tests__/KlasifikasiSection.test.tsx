import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import KlasifikasiSection from "../KlasifikasiSection";

// Mock collectionTypeApi
vi.mock("@/api/client", () => ({
  collectionTypeApi: {
    list: vi.fn().mockResolvedValue({
      data: [
        {
          id: 1,
          name: "Sirkulasi",
          code: "S",
          canBeBorrowed: true,
          description: "Koleksi umum yang dapat dipinjam",
          colorTag: "emerald",
        },
        {
          id: 2,
          name: "Referensi",
          code: "R",
          canBeBorrowed: false,
          description: "Koleksi referensi hanya dapat dibaca di tempat",
          colorTag: "amber",
        },
      ],
    }),
    create: vi.fn().mockResolvedValue({
      data: {
        id: 3,
        name: "Koleksi Khusus",
        code: "K",
        canBeBorrowed: false,
      },
    }),
    update: vi.fn().mockResolvedValue({
      data: {
        id: 1,
        name: "Sirkulasi Umum",
        code: "S",
        canBeBorrowed: true,
      },
    }),
    delete: vi.fn().mockResolvedValue({ success: true }),
  },
}));

vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  }),
}));

describe("KlasifikasiSection Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders collection types list with dynamic codes", async () => {
    await act(async () => {
      render(<KlasifikasiSection />);
    });

    expect(screen.getByText("Manajemen Klasifikasi Buku")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Sirkulasi")).toBeInTheDocument();
      expect(screen.getByText("Referensi")).toBeInTheDocument();
      expect(screen.getAllByText("S").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("R").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Dapat Dipinjam (Sirkulasi)")).toBeInTheDocument();
      expect(screen.getByText("Hanya Baca di Tempat")).toBeInTheDocument();
    });
  });

  it("opens modal when clicking Tambah Klasifikasi button", async () => {
    await act(async () => {
      render(<KlasifikasiSection />);
    });

    const addBtn = screen.getByRole("button", { name: /Tambah Klasifikasi/i });
    fireEvent.click(addBtn);

    expect(screen.getByText("Tambah Klasifikasi Buku")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Contoh: Umum, Referensi/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Contoh: UM, REF/i)).toBeInTheDocument();
  });
});
