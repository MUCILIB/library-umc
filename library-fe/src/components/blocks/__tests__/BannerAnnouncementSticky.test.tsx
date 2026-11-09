import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { BannerAnnouncementSticky } from "../BannerAnnouncementSticky";

describe("BannerAnnouncementSticky Component", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("merender badge dan teks pengumuman di tengah secara default", () => {
    render(<BannerAnnouncementSticky />);

    expect(screen.getByText("Pengumuman")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Layanan repositori digital dan peminjaman buku fisik kini dapat diakses secara mandiri."
      )
    ).toBeInTheDocument();
    expect(screen.getByText("Lihat Katalog")).toBeInTheDocument();
  });

  it("tidak merender apa pun jika isActive bernilai false (mode OFF)", () => {
    render(<BannerAnnouncementSticky isActive={false} />);

    expect(screen.queryByText("Pengumuman")).not.toBeInTheDocument();
  });

  it("merender kustom badge, pesan, dan link yang diberikan", () => {
    render(
      <BannerAnnouncementSticky
        badgeText="Info Baru"
        message="Jam layanan perpustakaan diperpanjang hingga pukul 18.00 WIB."
        linkText="Pelajari Detail"
        linkUrl="/tentang"
      />
    );

    expect(screen.getByText("Info Baru")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Jam layanan perpustakaan diperpanjang hingga pukul 18.00 WIB."
      )
    ).toBeInTheDocument();
    const link = screen.getByText("Pelajari Detail").closest("a");
    expect(link).toHaveAttribute("href", "/tentang");
  });

  it("dapat ditutup saat tombol dismiss ditekan dan menyimpannya di localStorage", () => {
    render(<BannerAnnouncementSticky storageKey="test_banner_key" />);

    const dismissButton = screen.getByLabelText("Tutup pengumuman");
    expect(dismissButton).toBeInTheDocument();

    fireEvent.click(dismissButton);

    expect(
      screen.queryByText(
        "Layanan repositori digital dan peminjaman buku fisik kini dapat diakses secara mandiri."
      )
    ).not.toBeInTheDocument();
    expect(localStorage.getItem("test_banner_key")).toBe("dismissed");
  });

  it("tidak merender apa pun jika localStorage sudah berstatus dismissed", () => {
    localStorage.setItem("test_already_dismissed", "dismissed");

    render(
      <BannerAnnouncementSticky storageKey="test_already_dismissed" />
    );

    expect(
      screen.queryByText(
        "Layanan repositori digital dan peminjaman buku fisik kini dapat diakses secara mandiri."
      )
    ).not.toBeInTheDocument();
  });
});
