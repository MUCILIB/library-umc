import { describe, it, expect } from "vitest";
import { news, newsCategoryEnum, newsStatusEnum } from "../../../db/schema";
import { newsStorageService } from "../../repository/service/storage.service";

describe("News Schema & Storage", () => {
  it("mendefinisikan enum kategori dan status berita dengan tepat", () => {
    expect(newsCategoryEnum).toBeDefined();
    expect(newsCategoryEnum.enumValues).toEqual([
      "pengumuman",
      "agenda",
      "kegiatan",
      "layanan",
      "literasi"
    ]);

    expect(newsStatusEnum).toBeDefined();
    expect(newsStatusEnum.enumValues).toEqual([
      "draft",
      "published",
      "archived"
    ]);
  });

  it("mendefinisikan tabel news dengan kolom yang sesuai", () => {
    expect(news).toBeDefined();
    expect(news.id).toBeDefined();
    expect(news.title).toBeDefined();
    expect(news.slug).toBeDefined();
    expect(news.category).toBeDefined();
    expect(news.excerpt).toBeDefined();
    expect(news.content).toBeDefined();
    expect(news.coverImage).toBeDefined();
    expect(news.status).toBeDefined();
    expect(news.views).toBeDefined();
    expect(news.authorId).toBeDefined();
    expect(news.publishedAt).toBeDefined();
    expect(news.createdAt).toBeDefined();
    expect(news.updatedAt).toBeDefined();
  });

  it("menyediakan newsStorageService dengan prefix dan subfolder news", () => {
    expect(newsStorageService).toBeDefined();
    expect(newsStorageService.resolveKey("test-cover.jpg")).toBe("library/news/test-cover.jpg");
  });
});
