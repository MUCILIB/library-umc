import { describe, it, expect, vi, beforeEach } from "vitest";
import { NewsService } from "../service/news.service";

describe("NewsService - Slug Generator & Service Logic", () => {
  it("menghasilkan slug kebab-case dari judul berita", () => {
    const slug = NewsService.slugify("Sosialisasi E-Resource Perpustakaan UMC 2026!");
    expect(slug).toBe("sosialisasi-e-resource-perpustakaan-umc-2026");
  });

  it("menghapus karakter spesial berlebih dan spasi berulang", () => {
    const slug = NewsService.slugify("   Kunjungan    Studi Banding & Workshop: Literasi Digital   ");
    expect(slug).toBe("kunjungan-studi-banding-dan-workshop-literasi-digital");
  });

  it("menghasilkan slug default jika judul hanya karakter simbol", () => {
    const slug = NewsService.slugify("### !!! @@@");
    expect(slug).toMatch(/^berita-/);
  });
});
