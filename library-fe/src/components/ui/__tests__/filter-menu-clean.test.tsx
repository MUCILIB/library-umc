import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { FilterMenu, type FilterGroup, type FilterValue } from "../filter-menu-clean";

describe("FilterMenu (AffectUI Clean Component)", () => {
  const mockGroups: FilterGroup[] = [
    {
      id: "availability",
      label: "Ketersediaan",
      chipPrefix: "Status: ",
      options: [
        { id: "available", label: "Tersedia" },
        { id: "borrowed", label: "Dipinjam" },
      ],
    },
    {
      id: "collectionType",
      label: "Jenis Koleksi",
      chipPrefix: "Tipe: ",
      options: [
        { id: "physical_book", label: "Buku Cetak" },
        { id: "ebook", label: "E-Book Digital" },
      ],
    },
  ];

  it("merender judul dan grup filter secara benar", () => {
    render(<FilterMenu groups={mockGroups} title="Filter Koleksi" />);

    expect(screen.getByText("Filter Koleksi")).toBeInTheDocument();
    expect(screen.getByText("Ketersediaan")).toBeInTheDocument();
    expect(screen.getByText("Jenis Koleksi")).toBeInTheDocument();
  });

  it("menampilkan opsi saat grup dibuka dan memicu onChange saat opsi dipilih", () => {
    const handleChange = vi.fn();
    render(
      <FilterMenu
        groups={mockGroups}
        defaultOpen={["availability"]}
        onChange={handleChange}
      />
    );

    const availableOption = screen.getByText("Tersedia");
    expect(availableOption).toBeInTheDocument();

    fireEvent.click(availableOption);
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        availability: ["available"],
      })
    );
  });

  it("merender chip filter aktif dan dapat dihapus dengan tombol x", () => {
    const handleChange = vi.fn();
    const controlledValue: FilterValue = {
      availability: ["available"],
    };

    render(
      <FilterMenu
        groups={mockGroups}
        value={controlledValue}
        onChange={handleChange}
      />
    );

    // Chip label has chipPrefix: "Status: Tersedia"
    const chipLabels = screen.getAllByText("Status: Tersedia");
    expect(chipLabels.length).toBeGreaterThan(0);

    const removeBtn = screen.getByLabelText("Remove Status: Tersedia");
    expect(removeBtn).toBeInTheDocument();

    fireEvent.click(removeBtn);
    expect(handleChange).toHaveBeenCalledWith({
      availability: [],
    });
  });

  it("tombol reset mengosongkan seluruh filter", () => {
    const handleChange = vi.fn();
    const controlledValue: FilterValue = {
      availability: ["available"],
      collectionType: ["ebook"],
    };

    render(
      <FilterMenu
        groups={mockGroups}
        value={controlledValue}
        onChange={handleChange}
        clearLabel="Reset Filter"
      />
    );

    const resetBtn = screen.getByText("Reset Filter");
    expect(resetBtn).not.toBeDisabled();

    fireEvent.click(resetBtn);
    expect(handleChange).toHaveBeenCalledWith({});
  });
});
