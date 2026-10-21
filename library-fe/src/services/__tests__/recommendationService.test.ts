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
        status: "pending" as const,
        createdAt: "2026-10-21T00:00:00.000Z",
      },
    ];

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: mockData,
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await recommendationService.getMyRecommendations();
    expect(result).toEqual(mockData);
    expect(mockFetch).toHaveBeenCalledWith(
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
      status: "pending" as const,
      createdAt: "2026-10-21T00:00:00.000Z",
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: mockResponse,
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await recommendationService.createRecommendation(payload);
    expect(result).toEqual(mockResponse);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/recommendations"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(payload),
      })
    );
  });

  it("deleteMyRecommendation sends DELETE and returns true on success", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        message: "Rekomendasi berhasil dihapus",
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await recommendationService.deleteMyRecommendation("rec-1");
    expect(result).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/recommendations/rec-1"),
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("throws error when API returns failure", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        success: false,
        message: "Buku sudah ada di koleksi perpustakaan",
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await expect(
      recommendationService.createRecommendation({
        title: "Clean Code",
        author: "Robert C. Martin",
        reason: "Buku wajib",
      })
    ).rejects.toThrow("Buku sudah ada di koleksi perpustakaan");
  });
});
