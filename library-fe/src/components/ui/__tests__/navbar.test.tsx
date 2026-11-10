import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router";
import Navbar from "../navbar";

vi.mock("@/utils/auth-client", () => ({
  authClient: {
    useSession: vi.fn().mockReturnValue({ data: null }),
    signOut: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("@/hooks/useSiteSettings", () => ({
  useSiteSettings: vi.fn().mockReturnValue({
    settings: {
      branding: {
        logoUrl: "",
        libraryName: "UMC Library",
      },
      banner: {
        isActive: false,
        badgeText: "",
        message: "",
        linkText: "",
        linkUrl: "",
        dismissible: true,
      },
    },
  }),
}));

vi.mock("@/components/ui/theme-toggle", () => ({
  default: () => <button data-testid="theme-toggle">Theme Toggle</button>,
}));

describe("Navbar Component (Responsive Mobile Top Dropdown)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("merender tombol hamburger dan menu link publik", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Navbar />
      </MemoryRouter>
    );

    const hamburgerBtn = screen.getByLabelText("Toggle menu");
    expect(hamburgerBtn).toBeInTheDocument();
    expect(hamburgerBtn).toHaveAttribute("aria-expanded", "false");
  });

  it("membuka dropdown mobile ke bawah saat tombol hamburger diklik", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Navbar />
      </MemoryRouter>
    );

    const hamburgerBtn = screen.getByLabelText("Toggle menu");
    fireEvent.click(hamburgerBtn);

    expect(hamburgerBtn).toHaveAttribute("aria-expanded", "true");

    // Pastikan link navigasi publik tersedia
    const berandaLinks = screen.getAllByText("Beranda");
    expect(berandaLinks.length).toBeGreaterThan(0);
    const katalogLinks = screen.getAllByText("Katalog");
    expect(katalogLinks.length).toBeGreaterThan(0);
  });

  it("menutup menu saat tombol Escape ditekan", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Navbar />
      </MemoryRouter>
    );

    const hamburgerBtn = screen.getByLabelText("Toggle menu");
    fireEvent.click(hamburgerBtn);
    expect(hamburgerBtn).toHaveAttribute("aria-expanded", "true");

    fireEvent.keyDown(document, { key: "Escape" });
    expect(hamburgerBtn).toHaveAttribute("aria-expanded", "false");
  });

  it("menampilkan opsi akun dan tombol logout jika user terautentikasi", async () => {
    const { authClient } = await import("@/utils/auth-client");
    (authClient.useSession as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        user: {
          id: "usr-1",
          name: "Budi Santoso",
          email: "budi@mucilib.ac.id",
          role: "student",
        },
      },
    });

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Navbar />
      </MemoryRouter>
    );

    const hamburgerBtn = screen.getByLabelText("Toggle menu");
    fireEvent.click(hamburgerBtn);

    // Buka accordion akun di mobile
    const userNames = screen.getAllByText("Budi Santoso");
    expect(userNames.length).toBeGreaterThan(0);
    const mobileAccountTrigger = userNames[userNames.length - 1];
    fireEvent.click(mobileAccountTrigger);

    expect(screen.getByText("Profil Saya")).toBeInTheDocument();
    expect(screen.getByText("Peminjaman Saya")).toBeInTheDocument();
    expect(screen.getByText("Keluar Akun")).toBeInTheDocument();
  });
});
