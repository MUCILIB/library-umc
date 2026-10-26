import { describe, it, expect, vi, beforeEach } from "vitest";
import memberService from "../memberService";

describe("memberService with Authorization Bearer header", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("updateMyProfile includes Authorization: Bearer token when token is stored", async () => {
    localStorage.setItem("better_auth_token", "test-token-12345");

    const mockProfile = {
      id: "mem-1",
      userId: "user-1",
      memberType: "student" as const,
      nimNidn: "22010199",
      faculty: "Teknik",
      originRegion: null,
      institution: null,
      phone: "08123456789",
      cardStatus: "not_requested" as const,
      cardNumber: null,
      cardRequestedAt: null,
      cardApprovedAt: null,
      cardRejectedAt: null,
      cardRejectedReason: null,
      createdAt: "2026-10-26T00:00:00.000Z",
      updatedAt: "2026-10-26T00:00:00.000Z",
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: mockProfile,
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await memberService.updateMyProfile({
      nimNidn: "22010199",
      faculty: "Teknik",
      phone: "08123456789",
    });

    expect(result).toEqual(mockProfile);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/members/me"),
      expect.objectContaining({
        method: "PATCH",
        headers: expect.objectContaining({
          Authorization: "Bearer test-token-12345",
        }),
      })
    );
  });
});
