import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { TablePagination } from "../TablePagination";

describe("TablePagination", () => {
  it("renders correctly with single page and keeps page 1 visible", () => {
    const handlePageChange = vi.fn();
    render(
      <TablePagination
        currentPage={1}
        totalPages={1}
        totalItems={5}
        itemsPerPage={10}
        onPageChange={handlePageChange}
      />
    );

    expect(screen.getByText("Menampilkan 1-5 dari 5 data")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sebelumnya/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Berikutnya/i })).toBeDisabled();
  });

  it("renders page buttons and triggers onPageChange", () => {
    const handlePageChange = vi.fn();
    render(
      <TablePagination
        currentPage={2}
        totalPages={5}
        totalItems={50}
        itemsPerPage={10}
        onPageChange={handlePageChange}
      />
    );

    expect(screen.getByText("Menampilkan 11-20 dari 50 data")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2" })).toBeInTheDocument();

    const nextBtn = screen.getByRole("button", { name: /Berikutnya/i });
    expect(nextBtn).not.toBeDisabled();
    fireEvent.click(nextBtn);
    expect(handlePageChange).toHaveBeenCalledWith(3);

    const prevBtn = screen.getByRole("button", { name: /Sebelumnya/i });
    expect(prevBtn).not.toBeDisabled();
    fireEvent.click(prevBtn);
    expect(handlePageChange).toHaveBeenCalledWith(1);

    const page4Btn = screen.getByRole("button", { name: "4" });
    fireEvent.click(page4Btn);
    expect(handlePageChange).toHaveBeenCalledWith(4);
  });

  it("handles ellipses for large number of pages", () => {
    render(
      <TablePagination
        currentPage={5}
        totalPages={10}
        totalItems={100}
        itemsPerPage={10}
        onPageChange={() => {}}
      />
    );

    expect(screen.getByRole("button", { name: "1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "5" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "10" })).toBeInTheDocument();
  });
});
