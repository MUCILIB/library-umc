import { describe, it, expect, vi, beforeEach } from "vitest";
import { SiteSettingController } from "../controller/site-setting.controller";
import { SiteSettingService } from "../service/site-setting.service";
import { DEFAULT_SITE_SETTINGS } from "../site-setting.constants";
import { cmsStorageService } from "../../repository/service/storage.service";

vi.mock("../service/site-setting.service");
vi.mock("../../repository/service/storage.service", () => ({
  cmsStorageService: {
    save: vi.fn(),
    read: vi.fn(),
    delete: vi.fn(),
  },
}));

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

  it("uploadAsset menolak jika berkas tidak disertakan dengan 400", async () => {
    const req = { file: undefined } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;
    const next = vi.fn();

    await SiteSettingController.uploadAsset(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Berkas gambar wajib diunggah",
      })
    );
  });

  it("uploadAsset mengunggah buffer ke S3 dan mengembalikan 201 dengan URL", async () => {
    (cmsStorageService.save as any).mockResolvedValue("library/cms/cms-1234.png");

    const req = {
      file: {
        originalname: "custom-logo.png",
        mimetype: "image/png",
        buffer: Buffer.from("fake-image-bytes"),
      },
    } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;
    const next = vi.fn();

    await SiteSettingController.uploadAsset(req, res, next);

    expect(cmsStorageService.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          key: "library/cms/cms-1234.png",
          url: expect.stringMatching(/^\/api\/site-settings\/assets\/cms-\d+-[a-f0-9]+\.png$/),
        }),
      })
    );
  });

  it("getAsset menolak nama berkas tidak valid dengan 400", async () => {
    const req = { params: { filename: "../hack.png" } } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;
    const next = vi.fn();

    await SiteSettingController.getAsset(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("getAsset mengembalikan 404 jika gambar tidak ditemukan", async () => {
    (cmsStorageService.read as any).mockRejectedValue(new Error("Not found"));

    const req = { params: { filename: "notfound.png" } } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;
    const next = vi.fn();

    await SiteSettingController.getAsset(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("getAsset mengembalikan 200 dan mengirim buffer jika gambar ada", async () => {
    const fakeBuffer = Buffer.from("image-content");
    (cmsStorageService.read as any).mockResolvedValue(fakeBuffer);

    const req = { params: { filename: "sample.png" } } as any;
    const res = {
      setHeader: vi.fn(),
      status: vi.fn().mockReturnThis(),
      send: vi.fn(),
    } as any;
    const next = vi.fn();

    await SiteSettingController.getAsset(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "image/png");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(fakeBuffer);
  });
});
