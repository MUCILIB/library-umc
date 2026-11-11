import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import EbookReaderModal from "@/components/EbookReaderModal";

vi.mock("@/utils/auth-client", () => ({
  authClient: {
    useSession: () => ({
      data: {
        user: { id: "user-1", email: "student@umc.ac.id", role: "student" },
      },
    }),
  },
}));

describe("EbookReaderModal Mobile Adaptive View", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.URL.createObjectURL = vi.fn().mockReturnValue("blob:http://localhost/mock-ebook");
    globalThis.URL.revokeObjectURL = vi.fn();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(new Blob(["mock ebook pdf"], { type: "application/pdf" })),
      })
    );
  });

  it("renders mobile document reader card and provides native open/read action", async () => {
    render(
      <EbookReaderModal
        isOpen={true}
        onClose={vi.fn()}
        ebookId="ebk-123"
        title="Pemrograman Web Modern"
        author="Fauzan"
      />
    );

    // Verifikasi mobile reader card hadir
    const mobileCard = await screen.findByTestId("mobile-ebook-card");
    expect(mobileCard).toBeInTheDocument();
    expect(screen.getByText(/Baca E-Book di Ponsel/i)).toBeInTheDocument();

    // Verifikasi tombol buka & baca dokumen hadir
    const readBtn = screen.getByRole("button", { name: /Buka & Baca E-Book \(PDF\)/i });
    expect(readBtn).toBeInTheDocument();

    // Verifikasi link tautan langsung ke endpoint stream e-book
    const directLink = screen.getByRole("link", { name: /Buka via Tautan Langsung/i });
    expect(directLink).toHaveAttribute("href", expect.stringContaining("/api/ebooks/ebk-123/stream"));

    // Klik tombol buka dokumen untuk menguji trigger download/open
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click");
    fireEvent.click(readBtn);
    expect(clickSpy).toHaveBeenCalled();
  });
});
