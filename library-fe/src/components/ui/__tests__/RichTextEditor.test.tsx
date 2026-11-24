import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RichTextEditor } from "../RichTextEditor";

describe("RichTextEditor Component", () => {
  it("merender toolbar tombol Word-like yang lengkap", () => {
    const onChange = vi.fn();
    render(<RichTextEditor value="<p>Halo UMC</p>" onChange={onChange} />);

    expect(screen.getByTitle("Tebal (Bold)")).toBeInTheDocument();
    expect(screen.getByTitle("Miring (Italic)")).toBeInTheDocument();
    expect(screen.getByTitle("Garis Bawah (Underline)")).toBeInTheDocument();
    expect(screen.getByTitle("Coret (Strikethrough)")).toBeInTheDocument();
    expect(screen.getByTitle("Daftar Poin")).toBeInTheDocument();
    expect(screen.getByTitle("Daftar Nomor")).toBeInTheDocument();
    expect(screen.getByTitle("Sisipkan Tautan")).toBeInTheDocument();
    expect(screen.getByTitle("Sisipkan Gambar")).toBeInTheDocument();
  });

  it("menampilkan jumlah kata dan karakter", () => {
    const onChange = vi.fn();
    render(<RichTextEditor value="<p>Perpustakaan Universitas Muhammadiyah Cirebon</p>" onChange={onChange} />);

    expect(screen.getByText(/4 kata/i)).toBeInTheDocument();
    expect(screen.getByText(/\d+ karakter/i)).toBeInTheDocument();
  });

  it("memanggil onChange saat pengguna mengetik di area editor", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<RichTextEditor value="" onChange={onChange} placeholder="Tulis isi berita..." />);

    const editorArea = screen.getByRole("textbox");
    expect(editorArea).toBeInTheDocument();

    await user.type(editorArea, "Berita terbaru");
    expect(onChange).toHaveBeenCalled();
  });
});
