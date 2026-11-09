import { describe, it, expect } from "vitest";
import { CMS_SUB_ITEMS } from "../SuperAdminDashboard";

describe("CMS Sub-Items Navigation & Architecture", () => {
  it("mendefinisikan 4 sub-menu CMS dengan label jelas dan ikon yang valid", () => {
    expect(CMS_SUB_ITEMS).toHaveLength(4);

    const keys = CMS_SUB_ITEMS.map((item) => item.key);
    expect(keys).toEqual([
      "cms-banner",
      "cms-branding",
      "cms-hero",
      "cms-location",
    ]);

    const labels = CMS_SUB_ITEMS.map((item) => item.label);
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
