import { describe, it, expect, vi, beforeEach } from "vitest";
import { SiteSettingService } from "../service/site-setting.service";
import { DEFAULT_SITE_SETTINGS } from "../site-setting.constants";
import { db } from "../../../db";

vi.mock("../../../db", () => {
  return {
    db: {
      select: vi.fn(),
      insert: vi.fn(),
    },
  };
});

describe("SiteSettingService Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAllSettings", () => {
    it("mengembalikan default settings lengkap jika database kosong", async () => {
      (db.select as any).mockReturnValue({
        from: vi.fn().mockResolvedValue([]),
      });

      const settings = await SiteSettingService.getAllSettings();

      expect(settings).toBeDefined();
      expect(settings.branding.siteTitle).toBe(DEFAULT_SITE_SETTINGS.branding.siteTitle);
      expect(settings.banner.badgeText).toBe(DEFAULT_SITE_SETTINGS.banner.badgeText);
      expect(settings.hero.title).toBe(DEFAULT_SITE_SETTINGS.hero.title);
      expect(settings.location.building).toBe(DEFAULT_SITE_SETTINGS.location.building);
      expect(settings.footer.motto).toBe(DEFAULT_SITE_SETTINGS.footer.motto);
    });

    it("menggabungkan data dari database dengan default settings", async () => {
      const mockDbRows = [
        {
          key: "branding",
          value: {
            siteTitle: "Custom Title MUCILIB",
            faviconUrl: "/custom-favicon.png",
          },
        },
        {
          key: "banner",
          value: {
            isActive: false,
            message: "Pengumuman custom dari admin",
          },
        },
      ];

      (db.select as any).mockReturnValue({
        from: vi.fn().mockResolvedValue(mockDbRows),
      });

      const settings = await SiteSettingService.getAllSettings();

      expect(settings.branding.siteTitle).toBe("Custom Title MUCILIB");
      expect(settings.branding.faviconUrl).toBe("/custom-favicon.png");
      // Fallback tetap terisi untuk field yang tidak ada di custom value
      expect(settings.branding.siteTagline).toBe(DEFAULT_SITE_SETTINGS.branding.siteTagline);
      expect(settings.banner.isActive).toBe(false);
      expect(settings.banner.message).toBe("Pengumuman custom dari admin");
      expect(settings.banner.badgeText).toBe(DEFAULT_SITE_SETTINGS.banner.badgeText);
    });
  });

  describe("getSettingByKey", () => {
    it("mengembalikan setting spesifik dengan fallback default", async () => {
      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const bannerSetting = await SiteSettingService.getSettingByKey("banner");
      expect(bannerSetting).toBeDefined();
      expect(bannerSetting.badgeText).toBe(DEFAULT_SITE_SETTINGS.banner.badgeText);
    });
  });

  describe("updateSetting", () => {
    it("melakukan upsert ke database dan mengembalikan hasil update", async () => {
      const mockUpdated = {
        key: "banner",
        value: {
          isActive: true,
          message: "Pesan terupdate",
        },
        updatedBy: "admin-123",
        updatedAt: new Date(),
      };

      (db.insert as any).mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockUpdated]),
          }),
        }),
      });

      const result = await SiteSettingService.updateSetting(
        "banner",
        { isActive: true, message: "Pesan terupdate" },
        "admin-123"
      );

      expect(result.key).toBe("banner");
      expect(result.value.message).toBe("Pesan terupdate");
    });
  });
});
