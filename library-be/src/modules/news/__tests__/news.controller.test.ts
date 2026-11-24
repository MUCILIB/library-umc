import { describe, it, expect, vi, beforeEach } from "vitest";
import { NewsController } from "../controller/news.controller";
import { NewsService } from "../service/news.service";
import { newsStorageService } from "../../repository/service/storage.service";

vi.mock("../service/news.service");
vi.mock("../../repository/service/storage.service", () => ({
  newsStorageService: {
    save: vi.fn(),
    read: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("NewsController Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getAll mengembalikan 200 dengan daftar berita", async () => {
    const mockList = {
      items: [{ id: "1", title: "Berita 1", status: "published" }],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    };
    (NewsService.listNews as any).mockResolvedValue(mockList);

    const req = { query: {} } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;
    const next = vi.fn();

    await NewsController.getAll(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: mockList,
      })
    );
  });

  it("getRecent mengembalikan 200 dengan daftar berita terbaru", async () => {
    const mockRecent = [{ id: "1", title: "Berita Terbaru" }];
    (NewsService.getRecentNews as any).mockResolvedValue(mockRecent);

    const req = { query: { limit: "3" } } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;
    const next = vi.fn();

    await NewsController.getRecent(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: mockRecent,
      })
    );
  });

  it("getBySlug mengembalikan 200 jika artikel ditemukan", async () => {
    const mockItem = {
      id: "1",
      slug: "berita-perpustakaan",
      status: "published",
    };
    (NewsService.getNewsBySlug as any).mockResolvedValue(mockItem);

    const req = { params: { slug: "berita-perpustakaan" } } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;
    const next = vi.fn();

    await NewsController.getBySlug(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: mockItem,
      })
    );
  });

  it("getBySlug mengembalikan 404 jika artikel tidak ditemukan", async () => {
    (NewsService.getNewsBySlug as any).mockResolvedValue(null);

    const req = { params: { slug: "tidak-ada" } } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;
    const next = vi.fn();

    await NewsController.getBySlug(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("create mengembalikan 201 saat input valid", async () => {
    const createdItem = {
      id: "news-123",
      title: "Judul Berita Baru",
      slug: "judul-berita-baru",
    };
    (NewsService.createNews as any).mockResolvedValue(createdItem);

    const req = {
      body: {
        title: "Judul Berita Baru",
        category: "pengumuman",
        content: "Konten berita yang sangat lengkap dan bermanfaat.",
      },
      user: { id: "user-admin" },
    } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;
    const next = vi.fn();

    await NewsController.create(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: createdItem,
      })
    );
  });

  it("uploadImage mengunggah berkas ke S3 dan mengembalikan 201", async () => {
    (newsStorageService.save as any).mockResolvedValue("library/news/news-123.png");

    const req = {
      file: {
        originalname: "foto.png",
        mimetype: "image/png",
        buffer: Buffer.from("fake-image"),
      },
    } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;
    const next = vi.fn();

    await NewsController.uploadImage(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(newsStorageService.save).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          key: "library/news/news-123.png",
        }),
      })
    );
  });

  it("getAsset mengirimkan stream buffer dari S3 dengan header content-type yang sesuai", async () => {
    const fakeBuffer = Buffer.from("fake-png-data");
    (newsStorageService.read as any).mockResolvedValue(fakeBuffer);

    const req = { params: { filename: "news-test.png" } } as any;
    const res = {
      setHeader: vi.fn(),
      status: vi.fn().mockReturnThis(),
      send: vi.fn(),
    } as any;
    const next = vi.fn();

    await NewsController.getAsset(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "image/png");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(fakeBuffer);
  });
});
