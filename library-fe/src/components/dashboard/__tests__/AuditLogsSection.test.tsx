import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AuditLogsSection from "../AuditLogsSection";
import { useAuditLogs } from "@/hooks/dashboard/useAuditLogs";
import type { AuditLog } from "@/services/dashboard/auditLogsService";

vi.mock("@/hooks/dashboard/useAuditLogs", () => ({ useAuditLogs: vi.fn() }));

const structured = {
  id: "event-1", userId: "actor-1", action: "update", entity: "role", entityId: "role-1",
  createdAt: "2026-11-15T01:00:00Z", occurredAt: "2026-11-15T02:00:00Z",
  detail: "Izin role diperbarui", eventType: "role.permissions_updated", outcome: "success",
  actorSnapshot: { id: "actor-1", name: "Nama Historis", role: "super_admin" },
  targetSnapshot: { id: "role-1", type: "role", label: "Pustakawan Lama" },
  changes: { "permissions.loans.canEdit": { before: false, after: true }, name: { before: null, after: "Nama Baru" } },
  metadata: { schemaVersion: 1 }, ipAddress: "127.0.0.1", userAgent: "Browser uji",
  user: { id: "actor-1", name: "Nama Sekarang", email: "current@example.test", role: "staff" },
} satisfies AuditLog;
const legacy: AuditLog = {
  id: "legacy-1", action: "create", entity: "Users", createdAt: null, detail: null,
  user: { name: "Profil Legacy", role: "staff" },
};
const refetch = vi.fn();
function mockLogs(logs: AuditLog[] = [structured, legacy], extra = {}) {
  vi.mocked(useAuditLogs).mockReturnValue({ logs, loading: false, error: null, hasLoaded: true, params: {}, updateParams: vi.fn(), refetch, ...extra });
}

beforeEach(() => { vi.clearAllMocks(); mockLogs(); });

describe("AuditLogsSection", () => {
  it("opens_role_diff_and_keeps_snapshot_identity", async () => {
    const user = userEvent.setup();
    render(<AuditLogsSection />);
    expect(screen.getByText("Nama Historis")).toBeInTheDocument();
    expect(screen.queryByText("Nama Sekarang")).not.toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getAllByRole("columnheader").map(h => h.textContent)).toEqual(["Waktu", "Pelaku", "Aktivitas", "Objek", "Ringkasan", "Detail"]);
    await user.click(screen.getAllByRole("button", { name: /Lihat detail/i })[0]);
    const dialog = within(screen.getByRole("dialog", { name: "Detail audit log" }));
    expect(dialog.getByText("Nama Historis")).toBeInTheDocument();
    expect(dialog.getByText("Pustakawan Lama")).toBeInTheDocument();
    expect(dialog.getByText("permissions.loans.canEdit")).toBeInTheDocument();
    expect(dialog.getByText("false")).toBeInTheDocument();
    expect(dialog.getByText("true")).toBeInTheDocument();
    expect(dialog.getByText("null")).toBeInTheDocument();
    expect(dialog.getByText("Sebelum")).toBeInTheDocument();
    expect(dialog.getByText("Sesudah")).toBeInTheDocument();
    expect(dialog.getByText("success")).toBeInTheDocument();
    expect(dialog.getByText("Browser uji")).toBeInTheDocument();
  });

  it("labels_legacy_current_profile_without_inventing_history", async () => {
    const user = userEvent.setup();
    render(<AuditLogsSection />);
    await user.click(screen.getAllByRole("button", { name: /Lihat detail/i })[1]);
    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByText("Snapshot historis tidak tersedia.")).toBeInTheDocument();
    expect(dialog.getByText("Profil saat ini")).toBeInTheDocument();
    expect(dialog.getByText("Profil Legacy")).toBeInTheDocument();
    expect(dialog.getByText("Waktu tidak tersedia")).toBeInTheDocument();
    expect(dialog.getByText("Data perubahan tidak tersedia.")).toBeInTheDocument();
  });

  it("renders_metadata_as_text_and_restores_focus", async () => {
    const payload = '<img src=x onerror="alert(1)"><script>alert(1)</script>';
    mockLogs([{ ...structured, targetSnapshot: { ...structured.targetSnapshot, label: payload }, changes: { name: { before: payload, after: "Aman" } }, userAgent: payload }]);
    const user = userEvent.setup();
    render(<AuditLogsSection />);
    const trigger = screen.getByRole("button", { name: /Lihat detail/i });
    await user.click(trigger);
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getAllByText(payload)).toHaveLength(3);
    expect(dialog.querySelector("img, script")).toBeNull();
    expect(within(dialog).getByText("Versi skema")).toBeInTheDocument();
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    await user.tab();
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it("renders_current_photo_but_preserves_historical_identity_and_row_labels", async () => {
    const OriginalImage = window.Image;
    const images: HTMLImageElement[] = [];
    vi.stubGlobal("Image", class {
      constructor() { const image = document.createElement("img"); images.push(image); return image; }
    });
    try {
      mockLogs([{ ...structured, user: { ...structured.user, image: "https://example.test/current-photo.jpg" } }]);
      render(<AuditLogsSection />);
      await waitFor(() => expect(images.length).toBeGreaterThan(0));
      const { act } = await import("@testing-library/react");
      await act(async () => { images.forEach(image => image.dispatchEvent(new Event("load"))); });
      const photo = screen.getByRole("img", { name: /Foto profil pelaku saat ini/ });
      expect(photo).toHaveAttribute("src", "https://example.test/current-photo.jpg");
      expect(screen.getByText("Nama Historis")).toBeInTheDocument();
      expect(screen.getByText("super_admin · Saat kejadian")).toBeInTheDocument();
      expect(screen.queryByText("Nama Sekarang")).not.toBeInTheDocument();
      expect(screen.getByText("Mengubah izin role")).toBeInTheDocument();
      expect(screen.getByText("Role", { exact: true, selector: "p" })).toBeInTheDocument();
      expect(screen.getByText("Pustakawan Lama")).toBeInTheDocument();
      expect(document.querySelector("time")).toHaveAttribute("datetime", structured.occurredAt.replace("Z", ".000Z"));
    } finally { vi.stubGlobal("Image", OriginalImage); }
  });

  it("falls_back_to_historical_initials_when_profile_photo_fails", async () => {
    const OriginalImage = window.Image;
    const images: HTMLImageElement[] = [];
    vi.stubGlobal("Image", class {
      constructor() { const image = document.createElement("img"); images.push(image); return image; }
    });
    try {
      mockLogs([{ ...structured, user: { ...structured.user, image: "/missing-photo.jpg" } }]);
      render(<AuditLogsSection />);
      await waitFor(() => expect(images.length).toBeGreaterThan(0));
      const { act } = await import("@testing-library/react");
      await act(async () => { images.forEach(image => image.dispatchEvent(new Event("error"))); });
      expect(screen.queryByRole("img")).not.toBeInTheDocument();
      expect(screen.getByLabelText("Inisial Nama Historis")).toHaveTextContent("NH");
    } finally { vi.stubGlobal("Image", OriginalImage); }
  });

  it("labels_all_role_events_and_legacy_actions", () => {
    const events = ["role.created", "role.updated", "role.deleted", "role.permissions_updated"] as const;
    const actions = ["create", "update", "delete", "approve", "blacklist", "failed_login", "rate_limited"] as const;
    mockLogs([
      ...events.map((eventType, i) => ({ ...structured, id: `event-${i}`, eventType })),
      ...actions.slice(0, 6).map(action => ({ ...legacy, id: action, action })),
    ]);
    render(<AuditLogsSection />);
    for (const label of ["Membuat role", "Memperbarui role", "Menghapus role", "Mengubah izin role", "Membuat data", "Memperbarui data", "Menghapus data", "Menyetujui", "Memblokir pengguna", "Login gagal"]) {
      expect(screen.getByText(label, { selector: "p" })).toBeInTheDocument();
    }
    expect(screen.getAllByLabelText("Inisial Profil Legacy")[0]).toHaveTextContent("PL");
  });

  it("searches_historical_target_and_preserves_error_retry", async () => {
    const user = userEvent.setup();
    const view = render(<AuditLogsSection />);
    await user.type(screen.getByRole("textbox", { name: "Cari audit log" }), "Pustakawan Lama");
    expect(screen.getByText("Nama Historis")).toBeInTheDocument();
    expect(screen.queryByText("Profil Legacy")).not.toBeInTheDocument();
    mockLogs([], { error: "Gagal memuat audit" });
    view.rerender(<AuditLogsSection />);
    expect(screen.getByText("Gagal memuat audit")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Refresh/ }));
    expect(refetch).toHaveBeenCalledOnce();
  });
});
