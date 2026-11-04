import { describe, it, expect } from "vitest";
import { isValidImageUrl, resolveCoverUrl } from "./imageUrl";
import { API_BASE_URL } from "./api-config";

describe("imageUrl utilities", () => {
  describe("isValidImageUrl", () => {
    it("should return false for null, undefined, and empty string", () => {
      expect(isValidImageUrl(null)).toBe(false);
      expect(isValidImageUrl(undefined)).toBe(false);
      expect(isValidImageUrl("")).toBe(false);
      expect(isValidImageUrl("   ")).toBe(false);
    });

    it("should return false for raw legacy SLiMS filenames without host", () => {
      expect(
        isValidImageUrl(
          "cover_pengantar-akuntansi-syariah-lengkap-dengan-kasus-kasus-penerapan-psak-20261022085946.png"
        )
      ).toBe(false);
      expect(isValidImageUrl("sample_book_cover.jpg")).toBe(false);
    });

    it("should return true for data URI base64 images", () => {
      expect(isValidImageUrl("data:image/jpeg;base64,/9j/4AAQSkZJRg==")).toBe(true);
      expect(isValidImageUrl("data:image/png;base64,iVBORw0KGgoAAA==")).toBe(true);
    });

    it("should return true for HTTP and HTTPS URLs", () => {
      expect(isValidImageUrl("https://images.unsplash.com/photo-12345")).toBe(true);
      expect(isValidImageUrl("http://example.com/cover.jpg")).toBe(true);
    });

    it("should return true for S3 proxy endpoints and keys", () => {
      expect(isValidImageUrl("/api/covers/cover-1234.png")).toBe(true);
      expect(isValidImageUrl("library/covers/cover-1234.png")).toBe(true);
    });
  });

  describe("resolveCoverUrl", () => {
    it("should return null for invalid or legacy raw filenames", () => {
      expect(resolveCoverUrl(null)).toBeNull();
      expect(resolveCoverUrl("")).toBeNull();
      expect(
        resolveCoverUrl(
          "cover_pengantar-akuntansi-syariah-lengkap-dengan-kasus-kasus-penerapan-psak-20261022085946.png"
        )
      ).toBeNull();
    });

    it("should return data URI and web URLs as-is", () => {
      const dataUri = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
      const webUrl = "https://images.unsplash.com/photo-12345";
      expect(resolveCoverUrl(dataUri)).toBe(dataUri);
      expect(resolveCoverUrl(webUrl)).toBe(webUrl);
    });

    it("should prefix relative /api/covers/ paths with API_BASE_URL", () => {
      const relativePath = "/api/covers/cover-1234.png";
      expect(resolveCoverUrl(relativePath)).toBe(`${API_BASE_URL}/api/covers/cover-1234.png`);
    });

    it("should resolve library/covers/ S3 keys to API covers endpoint", () => {
      const s3Key = "library/covers/cover-1234.png";
      expect(resolveCoverUrl(s3Key)).toBe(`${API_BASE_URL}/api/covers/cover-1234.png`);
    });
  });
});
