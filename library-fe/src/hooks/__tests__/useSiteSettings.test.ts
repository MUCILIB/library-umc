import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useSiteSettings, _resetSiteSettingsCacheForTesting } from "../useSiteSettings";
import { siteSettingApi, DEFAULT_SITE_SETTINGS } from "@/api/siteSettingApi";

vi.mock("@/api/siteSettingApi", async () => {
  const actual = await vi.importActual<any>("@/api/siteSettingApi");
  return {
    ...actual,
    siteSettingApi: {
      getAll: vi.fn(),
      getByKey: vi.fn(),
      update: vi.fn(),
    },
  };
});

describe("useSiteSettings Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetSiteSettingsCacheForTesting();
    document.title = "";
  });

  it("mengembalikan default settings saat pertama kali render", () => {
    (siteSettingApi.getAll as any).mockReturnValue(new Promise(() => {})); // pending

    const { result } = renderHook(() => useSiteSettings());

    expect(result.current.settings.branding.siteTitle).toBe(
      DEFAULT_SITE_SETTINGS.branding.siteTitle
    );
    expect(result.current.settings.banner.badgeText).toBe(
      DEFAULT_SITE_SETTINGS.banner.badgeText
    );
  });

  it("memperbarui document.title berdasarkan konfigurasi branding", async () => {
    (siteSettingApi.getAll as any).mockResolvedValue({
      success: true,
      data: {
        ...DEFAULT_SITE_SETTINGS,
        branding: {
          ...DEFAULT_SITE_SETTINGS.branding,
          siteTitle: "UMC Digital Library",
          siteTagline: "E-Library Kampus",
        },
      },
    });

    renderHook(() => useSiteSettings());

    await waitFor(() => {
      expect(document.title).toBe("UMC Digital Library | E-Library Kampus");
    });
  });

  it("berhasil melakukan updateSetting dan memperbarui state lokal", async () => {
    (siteSettingApi.getAll as any).mockResolvedValue({
      success: true,
      data: DEFAULT_SITE_SETTINGS,
    });
    (siteSettingApi.update as any).mockResolvedValue({
      success: true,
      data: { key: "banner" },
    });

    const { result } = renderHook(() => useSiteSettings());

    await act(async () => {
      await result.current.updateSetting("banner", {
        isActive: false,
        message: "Perpustakaan tutup libur nasional",
      });
    });

    expect(siteSettingApi.update).toHaveBeenCalledWith("banner", {
      isActive: false,
      message: "Perpustakaan tutup libur nasional",
    });
    expect(result.current.settings.banner.isActive).toBe(false);
    expect(result.current.settings.banner.message).toBe(
      "Perpustakaan tutup libur nasional"
    );
  });
});
