import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, beforeAll, afterAll } from "vitest";
beforeAll(() => vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} }));
afterAll(() => vi.unstubAllGlobals());
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "../SuperAdminDashboard";
import { IconDashboard } from "@tabler/icons-react";
import { describe, it, expect } from "vitest";
import { CMS_SUB_ITEMS } from "../SuperAdminDashboard";

describe("Dashboard sidebar interactions", () => {
  const menus = [{ key: "dashboard" as const, label: "Dashboard", icon: IconDashboard }, { key: "cms" as const, label: "Manajemen Konten (CMS)", icon: IconDashboard }];
  it("supports keyboard CMS navigation and exposes active state", async () => {
    const user = userEvent.setup();
    const navigate = vi.fn();
    render(<SidebarProvider><DashboardSidebar activeMenu="cms-banner" menus={menus} onMenuChange={navigate} onSignOut={async () => {}} /></SidebarProvider>);
    const child = screen.getByRole("button", { name: "Banner Siaran" });
    expect(child).toHaveAttribute("aria-current", "page");
    child.focus();
    await user.keyboard("{Enter}");
    expect(navigate).toHaveBeenCalledWith("cms-banner");
    const toggle = screen.getByRole("button", { name: "Manajemen Konten (CMS)" });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    toggle.focus();
    await user.keyboard("{Enter}");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: "Banner Siaran" })).not.toBeInTheDocument();
  });
  it("closes the mobile drawer after selecting a menu", async () => {
    const original = window.innerWidth;
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 375 });
    try {
      const user = userEvent.setup();
      const navigate = vi.fn();
      render(<SidebarProvider><SidebarTrigger /><DashboardSidebar activeMenu="dashboard" menus={menus} onMenuChange={navigate} onSignOut={async () => {}} /></SidebarProvider>);
      await user.click(screen.getByRole("button", { name: "Toggle Sidebar" }));
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Dashboard" }));
      expect(navigate).toHaveBeenCalledWith("dashboard");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    } finally { Object.defineProperty(window, "innerWidth", { configurable: true, value: original }); }
  });
});

describe("CMS Sub-Items Navigation & Architecture", () => {
  it("mendefinisikan sub-menu CMS dengan label jelas dan ikon yang valid", () => {
    expect(CMS_SUB_ITEMS).toHaveLength(5);

    const keys = CMS_SUB_ITEMS.map((item) => item.key);
    expect(keys).toEqual([
      "cms-news",
      "cms-banner",
      "cms-branding",
      "cms-hero",
      "cms-location",
    ]);

    const labels = CMS_SUB_ITEMS.map((item) => item.label);
    expect(labels).toContain("Kabar & Berita");
    expect(labels).toContain("Banner Siaran");
    expect(labels).toContain("Identitas & Logo");
    expect(labels).toContain("Hero Landing Page");
    expect(labels).toContain("Peta Lokasi & Footer");
  });

  it("memastikan tidak ada emoji pada label navigasi CMS (hanya teks bersih dan Lucide icons)", () => {
    // Regex deteksi karakter emoji unicode umum
    const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

    CMS_SUB_ITEMS.forEach((item) => {
      expect(item.label).not.toMatch(emojiRegex);
      expect(typeof item.icon).toBe("object"); // React Lucide forwardRef icon component
    });
  });
});
