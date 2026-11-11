import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import SecurePdfViewer from "@/components/SecurePdfViewer";

vi.mock("@/utils/auth-client", () => ({
  authClient: {
    useSession: () => ({
      data: {
        user: { id: "user-1", email: "student@umc.ac.id", role: "student" },
      },
    }),
  },
}));

describe("SecurePdfViewer Mobile Adaptive View", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.URL.createObjectURL = vi.fn().mockReturnValue("blob:http://localhost/mock-pdf");
    globalThis.URL.revokeObjectURL = vi.fn();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(new Blob(["mock pdf content"], { type: "application/pdf" })),
      })
    );
  });

  it("renders mobile document reader card and provides native open/read action", async () => {
    render(
      <SecurePdfViewer
        proposalId="prop-123"
        title="Rancang Bangun Sistem Informasi Perpustakaan"
        authorName="Fauzan"
        authorNim="202201"
        totalPhysicalPages={100}
        allowedPublicPages={10}
      />
    );

    // Verifikasi mobile reader card hadir
    const mobileCard = await screen.findByTestId("mobile-pdf-card");
    expect(mobileCard).toBeInTheDocument();
    expect(screen.getByText(/Naskah Siap Dibaca di Ponsel/i)).toBeInTheDocument();

    // Verifikasi tombol buka & baca dokumen hadir
    const readBtn = screen.getByRole("button", { name: /Buka & Baca Dokumen PDF/i });
    expect(readBtn).toBeInTheDocument();

    // Verifikasi link tautan langsung ke endpoint stream backend
    const directLink = screen.getByRole("link", { name: /Buka via Tautan Langsung/i });
    expect(directLink).toHaveAttribute("href", expect.stringContaining("/api/repository/proposals/prop-123/view-pdf"));

    // Klik tombol buka dokumen untuk menguji trigger download/open
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click");
    fireEvent.click(readBtn);
    expect(clickSpy).toHaveBeenCalled();
  });
});
