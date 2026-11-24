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

  it("mendaftarkan menu 'news' (Kabar & Berita) ke dalam SIDEBAR_MENUS", () => {
    const newsMenu = SIDEBAR_MENUS.find((m) => m.key === "news");
    expect(newsMenu).toBeDefined();
    expect(newsMenu?.label).toBe("Kabar & Berita");
    expect(newsMenu?.group).toBe("Pengaturan & Audit");
    expect(newsMenu?.description).toBeDefined();
  });
});
