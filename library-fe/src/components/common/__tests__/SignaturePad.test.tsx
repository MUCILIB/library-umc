import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { SignaturePad } from "../SignaturePad";

describe("SignaturePad Component", () => {
  it("renders correctly with canvas and clear button", () => {
    const onSignatureChange = vi.fn();
    render(<SignaturePad onSignatureChange={onSignatureChange} />);

    expect(screen.getByText(/Tanda Tangan Digital Petugas/i)).toBeInTheDocument();
    expect(screen.getByText(/Hapus/i)).toBeInTheDocument();
  });

  it("calls onSignatureChange with null when clear button is clicked", () => {
    const onSignatureChange = vi.fn();
    render(<SignaturePad onSignatureChange={onSignatureChange} />);

    const clearBtn = screen.getByText(/Hapus/i);
    fireEvent.click(clearBtn);

    expect(onSignatureChange).toHaveBeenCalledWith(null);
  });
});
