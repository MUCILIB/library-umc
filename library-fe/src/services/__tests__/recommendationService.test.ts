import { describe, it, expect, vi, beforeEach } from "vitest";
import recommendationService from "../recommendationService";

describe("recommendationService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("getMyRecommendations fetches and returns recommendations list", async () => {
    const mockData = [
      {
        id: "rec-1",
        dosenId: "dosen-123",
        title: "Clean Code",
        author: "Robert C. Martin",
        reason: "Buku wajib pemrograman",
        status: "pending",
        createdAt: "2026-10-21T00:00:00.000Z",
      },
    ];

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: mockData,
      }),
    } as any);

    const result = await recommendationService.getMyRecommendations();
    expect(result).toEqual(mockData);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/recommendations/history"),
      expect.objectContaining({ method: "GET" })
    );
  });

  it("createRecommendation sends POST payload and returns created item", async () => {
    const payload = {
      title: "Clean Architecture",
      author: "Robert C. Martin",
      reason: "Referensi arsitektur perangkat lunak",
      isbn: "978-0134494166",
    };

    const mockResponse = {
      id: "rec-2",
      ...payload,
      status: "pending",
      createdAt: "2026-10-21T00:00:00.000Z",
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: mockResponse,
      }),
    } as any);

    const result = await recommendationService.createRecommendation(payload);
    expect(result).toEqual(mockResponse);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/recommendations"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(payload),
      })
    );
  });

  it("deleteMyRecommendation sends DELETE and returns true on success", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        message: "Rekomendasi berhasil dihapus",
      }),
    } as any);

    const result = await recommendationService.deleteMyRecommendation("rec-1");
    expect(result).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/recommendations/rec-1"),
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("throws error when API returns failure", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        success: false,
        message: "Buku sudah ada di koleksi perpustakaan",
      }),
    } as any);

    await expect(
      recommendationService.createRecommendation({
        title: "Clean Code",
        author: "Robert C. Martin",
        reason: "Buku wajib",
      })
    ).rejects.toThrow("Buku sudah ada di koleksi perpustakaan");
  });
});
