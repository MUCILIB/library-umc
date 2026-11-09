import { describe, it, expect, vi, beforeEach } from "vitest";
import { SiteSettingController } from "../controller/site-setting.controller";
import { SiteSettingService } from "../service/site-setting.service";
import { DEFAULT_SITE_SETTINGS } from "../site-setting.constants";

vi.mock("../service/site-setting.service");

describe("SiteSettingController Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getAllSettings mengembalikan 200 dengan data lengkap", async () => {
    (SiteSettingService.getAllSettings as any).mockResolvedValue(DEFAULT_SITE_SETTINGS);

    const req = {} as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;
    const next = vi.fn();

    await SiteSettingController.getAllSettings(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: DEFAULT_SITE_SETTINGS,
    });
  });

  it("getSettingByKey mengembalikan 200 dengan data key yang diminta", async () => {
    (SiteSettingService.getSettingByKey as any).mockResolvedValue(DEFAULT_SITE_SETTINGS.banner);

    const req = { params: { key: "banner" } } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;
    const next = vi.fn();

    await SiteSettingController.getSettingByKey(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: DEFAULT_SITE_SETTINGS.banner,
    });
  });

  it("updateSetting menolak jika key tidak valid dengan 400", async () => {
    const req = {
      params: { key: "unknown_key" },
      body: { some: "data" },
    } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;
    const next = vi.fn();

    await SiteSettingController.updateSetting(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
      })
    );
  });

  it("updateSetting menolak jika payload bukan objek dengan 400", async () => {
    const req = {
      params: { key: "banner" },
      body: "not an object",
    } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;
    const next = vi.fn();

    await SiteSettingController.updateSetting(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
      })
    );
  });

  it("updateSetting sukses memperbarui pengaturan dan mengembalikan 200", async () => {
    const updatedMock = {
      key: "banner",
      value: { isActive: true, message: "Pengumuman baru" },
      updatedBy: "user-123",
      updatedAt: new Date(),
    };

    (SiteSettingService.updateSetting as any).mockResolvedValue(updatedMock);

    const req = {
      params: { key: "banner" },
      body: { value: { isActive: true, message: "Pengumuman baru" } },
      user: { id: "user-123" },
    } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;
    const next = vi.fn();

    await SiteSettingController.updateSetting(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Pengaturan banner berhasil diperbarui",
      data: updatedMock,
    });
  });
});
