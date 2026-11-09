import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NotificationBellDropdown } from "../NotificationBellDropdown";
import type { DashboardBadgeCounts } from "@/services/dashboard/dashboardDataService";

const MOCK_BADGES_ACTIVE: DashboardBadgeCounts = {
  loans: 2,
  returnApprovals: 1,
  cardApprovals: 0,
  recommendations: 0,
  repository: 0,
  fines: 0,
  total: 3,
};

const MOCK_BADGES_EMPTY: DashboardBadgeCounts = {
  loans: 0,
  returnApprovals: 0,
  cardApprovals: 0,
  recommendations: 0,
  repository: 0,
  fines: 0,
  total: 0,
};

describe("NotificationBellDropdown Component", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("merender tombol lonceng dan badge angka saat terdapat notifikasi belum dibaca", () => {
    render(
      <NotificationBellDropdown
        badges={MOCK_BADGES_ACTIVE}
        onSelectMenu={vi.fn()}
      />
    );

    const triggerButton = screen.getByRole("button", {
      name: /notifikasi/i,
    });
    expect(triggerButton).toBeInTheDocument();

    // 2 + 1 = 3 unread
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("menghilangkan badge angka merah saat tombol 'Tandai sudah dibaca' diklik", async () => {
    const onSelectMenu = vi.fn();
    render(
      <NotificationBellDropdown
        badges={MOCK_BADGES_ACTIVE}
        onSelectMenu={onSelectMenu}
      />
    );

    // Buka dropdown (Radix UI triggers on pointerDown)
    const triggerButton = screen.getByRole("button", {
      name: /notifikasi/i,
    });
    fireEvent.pointerDown(triggerButton);

    // Temukan tombol 'Tandai sudah dibaca'
    const markAllReadBtn = screen.getByRole("button", {
      name: /tandai dibaca/i,
    });
    expect(markAllReadBtn).toBeInTheDocument();

    // Klik tandai dibaca
    fireEvent.click(markAllReadBtn);

    // Badge angka merah di trigger harus hilang
    expect(screen.queryByText("3")).not.toBeInTheDocument();
  });

  it("mengarahkan ke menu yang sesuai saat item notifikasi diklik", () => {
    const onSelectMenu = vi.fn();
    render(
      <NotificationBellDropdown
        badges={MOCK_BADGES_ACTIVE}
        onSelectMenu={onSelectMenu}
      />
    );

    // Buka dropdown (Radix UI triggers on pointerDown)
    const triggerButton = screen.getByRole("button", {
      name: /notifikasi/i,
    });
    fireEvent.pointerDown(triggerButton);

    // Klik item Permohonan Peminjaman
    const loanItem = screen.getByText("Permohonan Peminjaman");
    fireEvent.click(loanItem);

    expect(onSelectMenu).toHaveBeenCalledWith("loans");
  });

  it("menampilkan empty state bersih saat tidak ada notifikasi aktif", () => {
    render(
      <NotificationBellDropdown
        badges={MOCK_BADGES_EMPTY}
        onSelectMenu={vi.fn()}
      />
    );

    // Badge tidak boleh muncul
    expect(screen.queryByText("0")).not.toBeInTheDocument();

    // Buka dropdown (Radix UI triggers on pointerDown)
    const triggerButton = screen.getByRole("button", {
      name: /notifikasi/i,
    });
    fireEvent.pointerDown(triggerButton);

    expect(screen.getByText(/tidak ada notifikasi baru/i)).toBeInTheDocument();
  });

  it("memastikan tidak ada emoji pada seluruh teks dropdown (antislop & clean UI)", () => {
    render(
      <NotificationBellDropdown
        badges={MOCK_BADGES_ACTIVE}
        onSelectMenu={vi.fn()}
      />
    );

    const triggerButton = screen.getByRole("button", {
      name: /notifikasi/i,
    });
    fireEvent.pointerDown(triggerButton);

    const emojiRegex =
      /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

    const allText = document.body.textContent || "";
    expect(allText).not.toMatch(emojiRegex);
  });
});
