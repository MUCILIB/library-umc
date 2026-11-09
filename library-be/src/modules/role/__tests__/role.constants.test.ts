import { describe, it, expect } from "vitest";
import { SIDEBAR_MENUS } from "../role.constants";

describe("Role Constants & Sidebar Menus", () => {
  it("mendaftarkan menu 'cms' ke dalam SIDEBAR_MENUS", () => {
    const cmsMenu = SIDEBAR_MENUS.find((m) => m.key === "cms");
    expect(cmsMenu).toBeDefined();
    expect(cmsMenu?.label).toBe("Manajemen Konten (CMS)");
    expect(cmsMenu?.group).toBe("Pengaturan & Audit");
    expect(cmsMenu?.description).toBeDefined();
  });
});
