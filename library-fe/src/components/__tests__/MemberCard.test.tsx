import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MemberCard from "@/components/MemberCard";
import { type MemberProfile } from "@/services/memberService";

const baseProfile: MemberProfile = {
  id: "mem-1",
  userId: "user-1",
  memberType: "student",
  nimNidn: "230511110",
  faculty: "Fakultas Teknik",
  originRegion: "Jl. Mawar Desa Matahari Kec. Melati",
  institution: "Universitas Muhammadiyah Cirebon",
  phone: "0891231234718",
  phoneVerified: true,
  cardStatus: "active",
  cardNumber: "UMC-2026-0042",
  cardRequestedAt: "2026-01-10T00:00:00.000Z",
  cardApprovedAt: "2026-01-11T00:00:00.000Z",
  cardExpiresAt: "2099-12-21T00:00:00.000Z",
  cardRenewalStatus: "none",
  cardRenewalRequestedAt: null,
  cardRejectedAt: null,
  cardRejectedReason: null,
  isExternal: false,
  user: {
    id: "user-1",
    name: "Rizqi Noor Fauzan",
    email: "rizqi@umc.ac.id",
    role: "member",
    image: "https://example.com/avatar.jpg"
  }
};

describe("MemberCard", () => {
  it("renders front and back card designs with barcode and member identity details", () => {
    render(<MemberCard profile={baseProfile} />);

    // Front card elements
    expect(screen.getByText(/KARTU ANGGOTA RESMI/i)).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: /Barcode anggota UMC-2026-0042/i })
    ).toBeInTheDocument();
    expect(screen.getAllByText("UMC-2026-0042").length).toBeGreaterThanOrEqual(1);

    // Back card elements
    expect(screen.getByText("DATA ANGGOTA")).toBeInTheDocument();
    expect(screen.getByText("Rizqi Noor Fauzan")).toBeInTheDocument();
    expect(screen.getByText("230511110")).toBeInTheDocument();
    expect(screen.getByText("Mahasiswa")).toBeInTheDocument();
    expect(screen.getByText("Fakultas Teknik")).toBeInTheDocument();
    expect(screen.getByText("0891231234718")).toBeInTheDocument();
    expect(
      screen.getByText("Jl. Mawar Desa Matahari Kec. Melati")
    ).toBeInTheDocument();
    expect(screen.getByText("21 Desember 2099")).toBeInTheDocument();
  });

  it("shows Ajukan Kartu button and triggers onRequestCard when cardStatus is not_requested", () => {
    const onRequestCard = vi.fn();
    render(
      <MemberCard
        profile={{
          ...baseProfile,
          cardStatus: "not_requested",
          cardNumber: null,
          cardExpiresAt: null
        }}
        onRequestCard={onRequestCard}
      />
    );

    expect(screen.getByText("Belum Diajukan")).toBeInTheDocument();
    const requestBtn = screen.getByRole("button", { name: /Ajukan Kartu/i });
    fireEvent.click(requestBtn);
    expect(onRequestCard).toHaveBeenCalledTimes(1);
  });

  it("shows renewal action when card is expired and no pending renewal exists", () => {
    const onRequestRenewal = vi.fn();
    render(
      <MemberCard
        profile={{
          ...baseProfile,
          cardStatus: "expired",
          cardRenewalStatus: "none"
        }}
        onRequestRenewal={onRequestRenewal}
      />
    );

    expect(screen.getByText("Masa Berlaku Habis")).toBeInTheDocument();
    const renewBtn = screen.getByRole("button", {
      name: /Ajukan Perpanjangan Kartu/i
    });
    fireEvent.click(renewBtn);
    expect(onRequestRenewal).toHaveBeenCalledTimes(1);
  });

  it("renders rejection reason and pending renewal alerts when present", () => {
    render(
      <MemberCard
        profile={{
          ...baseProfile,
          cardStatus: "rejected",
          cardRenewalStatus: "pending",
          cardRejectedReason: "Foto profil belum sesuai ketentuan."
        }}
      />
    );

    expect(
      screen.getByText(/Alasan penolakan: Foto profil belum sesuai ketentuan\./i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Permintaan perpanjangan kartu sedang menunggu persetujuan admin\./i
      )
    ).toBeInTheDocument();
  });

  it("prints only the front and back card container in an isolated iframe when Cetak is clicked", () => {
    render(
      <div>
        <header>Surrounding Navbar Should Not Print</header>
        <MemberCard profile={baseProfile} />
      </div>
    );

    const printBtn = screen.getByRole("button", { name: /Cetak/i });
    fireEvent.click(printBtn);

    const iframe = document.querySelector(
      'iframe[title="Member Card Print Frame"]'
    ) as HTMLIFrameElement | null;
    expect(iframe).not.toBeNull();
    const iframeHtml = iframe?.contentDocument?.body.innerHTML ?? "";
    expect(iframeHtml).toContain("KARTU ANGGOTA RESMI");
    expect(iframeHtml).toContain("DATA ANGGOTA");
    expect(iframeHtml).not.toContain("Surrounding Navbar Should Not Print");
    iframe?.remove();
  });
});
