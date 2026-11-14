import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ItemTable } from "../ItemTable";
import { ItemFilterBar } from "../ItemFilterBar";
import { ItemQrModal } from "../ItemQrModal";
import { ItemDetail } from "../ItemDetail";
import type { Item, Location, Bibliography } from "@/api/client";

const mockItem: Item = {
  id: "item-101",
  bibliographyId: "bib-202",
  itemCode: "UMC-TI-001",
  inventoryCode: "INV-2026-001",
  callNumber: "005.1 UMC",
  status: "available",
  locationId: 1,
  source: "Pengadaan 2026",
  price: "150000",
  priceCurrency: "IDR",
  qrToken: "qr-token-mock",
  qrVersion: 1,
  createdAt: "2026-11-01T00:00:00.000Z",
  updatedAt: "2026-11-01T00:00:00.000Z",
  bibliography: {
    id: "bib-202",
    title: "Pemrograman Web Modern dengan TypeScript",
    stock: 5,
    authors: [],
    subjects: [],
    totalItems: 5,
    availableItems: 5,
  } as unknown as Bibliography,
  location: {
    id: 1,
    room: "Lantai 2",
    rack: "R-05",
    shelf: "S-1",
  },
};

const mockLocations: Location[] = [
  {
    id: 1,
    room: "Lantai 2",
    rack: "R-05",
    shelf: "S-1",
  },
];

describe("Item Modular Subcomponents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ItemTable", () => {
    it("merender item dalam tabel dan mentrigger aksi detail & QR modal", () => {
      const onOpenDetail = vi.fn();
      const onOpenQrModal = vi.fn();
      const onEdit = vi.fn();
      const onDelete = vi.fn();
      const onToggleSort = vi.fn();
      const onPageChange = vi.fn();

      render(
        <ItemTable
          items={[mockItem]}
          sortBy="itemCode"
          sortOrder="asc"
          onToggleSort={onToggleSort}
          onOpenDetail={onOpenDetail}
          onOpenQrModal={onOpenQrModal}
          onEdit={onEdit}
          onDelete={onDelete}
          canEdit={() => true}
          canDelete={() => true}
          page={1}
          totalPages={1}
          totalItems={1}
          limit={10}
          onPageChange={onPageChange}
        />
      );

      expect(screen.getByText("UMC-TI-001")).toBeInTheDocument();
      expect(screen.getByText("Pemrograman Web Modern dengan TypeScript")).toBeInTheDocument();
      expect(screen.getByText("Lantai 2, R-05")).toBeInTheDocument();

      const detailBtn = screen.getByTitle("Lihat detail");
      fireEvent.click(detailBtn);
      expect(onOpenDetail).toHaveBeenCalledWith("item-101");

      const qrBtn = screen.getByTitle("Lihat QR Code");
      fireEvent.click(qrBtn);
      expect(onOpenQrModal).toHaveBeenCalledWith(mockItem);
    });

    it("merender empty state jika tidak ada item", () => {
      render(
        <ItemTable
          items={[]}
          sortBy="itemCode"
          sortOrder="asc"
          onToggleSort={vi.fn()}
          onOpenDetail={vi.fn()}
          onOpenQrModal={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          canEdit={() => true}
          canDelete={() => true}
          page={1}
          totalPages={1}
          totalItems={0}
          limit={10}
          onPageChange={vi.fn()}
        />
      );

      expect(screen.getByText("Belum ada item")).toBeInTheDocument();
    });
  });

  describe("ItemFilterBar", () => {
    it("merender input pencarian dan tombol reset saat filter aktif", () => {
      const onSearchInputChange = vi.fn();
      const onSearch = vi.fn();
      const onReset = vi.fn();

      render(
        <ItemFilterBar
          searchInput="UMC"
          onSearchInputChange={onSearchInputChange}
          onSearch={onSearch}
          statusFilter="available"
          onStatusFilterChange={vi.fn()}
          locationFilter="all"
          onLocationFilterChange={vi.fn()}
          locations={mockLocations}
          sortBy="itemCode"
          sortOrder="asc"
          onSortChange={vi.fn()}
          onReset={onReset}
          isFiltered={true}
        />
      );

      const input = screen.getByPlaceholderText("Cari item...");
      expect(input).toHaveValue("UMC");

      const resetBtn = screen.getByTitle("Reset filter");
      expect(resetBtn).toBeInTheDocument();
      fireEvent.click(resetBtn);
      expect(onReset).toHaveBeenCalled();
    });
  });

  describe("ItemQrModal", () => {
    it("merender modal dengan informasi item dan tombol download", () => {
      const onClose = vi.fn();

      render(
        <ItemQrModal
          isOpen={true}
          item={mockItem}
          onClose={onClose}
        />
      );

      expect(screen.getByText("QR Code Salinan (Exemplar)")).toBeInTheDocument();
      expect(screen.getAllByText("UMC-TI-001").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Unduh PNG")).toBeInTheDocument();
      expect(screen.getByText("Unduh SVG")).toBeInTheDocument();

      const closeBtn = screen.getByRole("button", { name: /Tutup/i });
      fireEvent.click(closeBtn);
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe("ItemDetail", () => {
    it("merender rincian item lengkap dengan tombol kembali", () => {
      const onBack = vi.fn();
      const onEdit = vi.fn();
      const onDelete = vi.fn();
      const onRefresh = vi.fn().mockResolvedValue(undefined);

      render(
        <ItemDetail
          item={mockItem}
          loading={false}
          onBack={onBack}
          onEdit={onEdit}
          onDelete={onDelete}
          onRefresh={onRefresh}
        />
      );

      expect(screen.getByText("UMC-TI-001")).toBeInTheDocument();
      expect(screen.getByText("005.1 UMC")).toBeInTheDocument();
      expect(screen.getByText("INV-2026-001")).toBeInTheDocument();
      expect(screen.getByText("Lantai 2, R-05, S-1")).toBeInTheDocument();

      const backBtn = screen.getByRole("button", { name: /Kembali ke daftar/i });
      fireEvent.click(backBtn);
      expect(onBack).toHaveBeenCalled();
    });
  });
});
