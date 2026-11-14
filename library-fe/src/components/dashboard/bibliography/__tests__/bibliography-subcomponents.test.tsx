import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QuickAddItemModal } from "../QuickAddItemModal";
import { DeleteBibliographyDialog } from "../DeleteBibliographyDialog";
import { BibliographyDetail } from "../BibliographyDetail";
import type { Bibliography } from "@/api/client";

vi.mock("@/api/client", () => ({
  locationApi: {
    list: vi.fn().mockResolvedValue({
      data: [{ id: 1, room: "Ruang Utama", rack: "Rak A", shelf: "Lantai 1" }],
    }),
  },
  itemApi: {
    bulkCreate: vi.fn().mockResolvedValue({
      data: { created: 1, items: [], errors: [] },
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

const mockBib: Bibliography = {
  id: "bib-123456",
  title: "Struktur Data & Algoritma",
  isbn: "978-602-000-000-0",
  edition: "Edisi 2",
  publishYear: 2025,
  stock: 10,
  totalItems: 5,
  availableItems: 3,
  authors: [{ id: 1, name: "Dr. Budi", role: "Penulis Utama", position: 1 }],
  subjects: [{ id: 1, name: "Komputer" }],
};

describe("Bibliography Modular Subcomponents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("DeleteBibliographyDialog", () => {
    it("merender konfirmasi hapus beserta jumlah eksemplar aktif", () => {
      const onConfirm = vi.fn();
      const onClose = vi.fn();

      render(
        <DeleteBibliographyDialog
          bib={mockBib}
          isOpen={true}
          onClose={onClose}
          onConfirm={onConfirm}
          isDeleting={false}
        />
      );

      expect(screen.getByText("Konfirmasi Penghapusan Bibliografi")).toBeInTheDocument();
      expect(screen.getByText(/Struktur Data & Algoritma/i)).toBeInTheDocument();
      expect(screen.getByText(/5 eksemplar fisik aktif/i)).toBeInTheDocument();

      const confirmBtn = screen.getByTestId("confirm-delete-bib-btn");
      fireEvent.click(confirmBtn);
      expect(onConfirm).toHaveBeenCalled();
    });

    it("tidak merender apa pun jika isOpen false", () => {
      const { container } = render(
        <DeleteBibliographyDialog
          bib={mockBib}
          isOpen={false}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          isDeleting={false}
        />
      );
      expect(container.firstChild).toBeNull();
    });
  });

  describe("BibliographyDetail", () => {
    it("merender rincian buku, penulis, dan subjek", () => {
      const onBack = vi.fn();
      const onEdit = vi.fn();
      const onDelete = vi.fn();

      render(
        <BibliographyDetail
          bib={mockBib}
          loading={false}
          onBack={onBack}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      );

      expect(screen.getByText("Struktur Data & Algoritma")).toBeInTheDocument();
      expect(screen.getByText("Dr. Budi")).toBeInTheDocument();
      expect(screen.getByText("Komputer")).toBeInTheDocument();
      expect(screen.getByText("3/5 tersedia")).toBeInTheDocument();

      const backBtn = screen.getByText("Kembali ke daftar");
      fireEvent.click(backBtn);
      expect(onBack).toHaveBeenCalled();
    });
  });

  describe("QuickAddItemModal", () => {
    it("merender form tambah eksemplar fisik dengan lokasi rak", async () => {
      const onClose = vi.fn();
      const onSuccess = vi.fn();

      render(
        <QuickAddItemModal
          bib={mockBib}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("Tambah Eksemplar Fisik Buku")).toBeInTheDocument();
      });

      expect(screen.getByText("Struktur Data & Algoritma")).toBeInTheDocument();
      expect(screen.getByText("Simpan Eksemplar")).toBeInTheDocument();
    });
  });
});
