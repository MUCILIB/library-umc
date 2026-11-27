import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import GmdSection from "../GmdSection";
import { gmdApi } from "@/api/client";

vi.mock("@/api/client", () => ({
  gmdApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
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

describe("GmdSection Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (gmdApi.list as any).mockResolvedValue({
      data: [
        { id: 1, name: "Buku Inti" },
        { id: 2, name: "Audio" },
      ],
    });
    (gmdApi.create as any).mockResolvedValue({
      data: { id: 3, name: "Jurnal Elektronik" },
    });
    (gmdApi.update as any).mockResolvedValue({
      data: { id: 2, name: "Audio Book" },
    });
    (gmdApi.delete as any).mockResolvedValue({ success: true });
  });

  it("merender daftar tipe GMD dari API", async () => {
    render(<GmdSection />);

    expect(screen.getByText("Manajemen Tipe GMD")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("Buku Inti")).toBeInTheDocument();
      expect(screen.getByText("Audio")).toBeInTheDocument();
    });
  });

  it("dapat menambah tipe GMD baru lewat modal", async () => {
    render(<GmdSection />);
    await waitFor(() => expect(screen.getByText("Buku Inti")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /Tambah Tipe GMD/i }));
    const input = screen.getByLabelText(/Nama Tipe GMD/i);
    fireEvent.change(input, { target: { value: "Jurnal Elektronik" } });
    fireEvent.click(screen.getByRole("button", { name: /^Simpan$/i }));

    await waitFor(() => {
      expect(gmdApi.create).toHaveBeenCalledWith({ name: "Jurnal Elektronik" });
    });
  });

  it("dapat mengedit tipe GMD lewat modal", async () => {
    render(<GmdSection />);
    await waitFor(() => expect(screen.getByText("Audio")).toBeInTheDocument());

    const editBtns = screen.getAllByTitle("Edit tipe GMD");
    fireEvent.click(editBtns[1]);

    const input = screen.getByLabelText(/Nama Tipe GMD/i);
    fireEvent.change(input, { target: { value: "Audio Book" } });
    fireEvent.click(screen.getByRole("button", { name: /^Perbarui$/i }));

    await waitFor(() => {
      expect(gmdApi.update).toHaveBeenCalledWith(2, { name: "Audio Book" });
    });
  });

  it("dapat menghapus tipe GMD lewat modal konfirmasi", async () => {
    render(<GmdSection />);
    await waitFor(() => expect(screen.getByText("Audio")).toBeInTheDocument());

    const deleteBtns = screen.getAllByTitle("Hapus tipe GMD");
    fireEvent.click(deleteBtns[1]);

    expect(screen.getByText("Hapus Tipe GMD")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^Hapus$/i }));

    await waitFor(() => {
      expect(gmdApi.delete).toHaveBeenCalledWith(2);
    });
  });
});
