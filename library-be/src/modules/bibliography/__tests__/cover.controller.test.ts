import { describe, it, expect, vi, beforeEach } from "vitest";
import { coverController } from "../controller/cover.controller";
import { coverStorageService } from "../../repository/service/storage.service";

describe("CoverController (S3 Cover Storage)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should return 400 when no file is uploaded", async () => {
    const req: any = {};
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const next = vi.fn();

    await coverController.upload(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Berkas gambar sampul wajib diunggah",
      })
    );
  });

  it("should upload cover buffer to S3 storage and return 201 with URL", async () => {
    const dummyBuffer = Buffer.from("dummy-image-bytes");
    const req: any = {
      file: {
        originalname: "sampul-buku.png",
        mimetype: "image/png",
        buffer: dummyBuffer,
      },
    };
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const next = vi.fn();

    vi.spyOn(coverStorageService, "save").mockResolvedValue("library/covers/cover-1234.png");

    await coverController.upload(req, res, next);

    expect(coverStorageService.save).toHaveBeenCalledWith(
      expect.stringMatching(/^cover-\d+-[a-f0-9]+\.png$/),
      dummyBuffer,
      "image/png"
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          key: "library/covers/cover-1234.png",
          url: expect.stringMatching(/^\/api\/covers\/cover-\d+-[a-f0-9]+\.png$/),
        }),
      })
    );
  });

  it("should stream cover image buffer with proper headers", async () => {
    const dummyBuffer = Buffer.from("image-png-content");
    const req: any = {
      params: { filename: "sample-book.png" },
    };
    const res: any = {
      setHeader: vi.fn(),
      end: vi.fn(),
    };
    const next = vi.fn();

    vi.spyOn(coverStorageService, "read").mockResolvedValue(dummyBuffer);

    await coverController.getCover(req, res, next);

    expect(coverStorageService.read).toHaveBeenCalledWith("library/covers/sample-book.png");
    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "image/png");
    expect(res.setHeader).toHaveBeenCalledWith(
      "Cache-Control",
      "public, max-age=86400, stale-while-revalidate=604800"
    );
    expect(res.end).toHaveBeenCalledWith(dummyBuffer);
  });

  it("should return 404 when cover image does not exist", async () => {
    const req: any = {
      params: { filename: "non-existent.jpg" },
    };
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const next = vi.fn();

    vi.spyOn(coverStorageService, "read").mockRejectedValue(new Error("File not found"));

    await coverController.getCover(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Gambar sampul tidak ditemukan di penyimpanan server",
      })
    );
  });
});
