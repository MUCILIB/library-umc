import { describe, it, expect, beforeEach } from "vitest";
import {
  getBookmarkStorageKey,
  getSavedBookIds,
  isBookSaved,
  saveBook,
  removeBook,
} from "./bookmarks";

describe("bookmarks utility", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("getBookmarkStorageKey", () => {
    it("should return user-scoped key if userId provided", () => {
      expect(getBookmarkStorageKey("user-123")).toBe("umc_library_bookmarks_user-123");
    });

    it("should return guest key if userId is undefined or null", () => {
      expect(getBookmarkStorageKey(undefined)).toBe("umc_library_bookmarks_guest");
      expect(getBookmarkStorageKey(null)).toBe("umc_library_bookmarks_guest");
    });
  });

  describe("saveBook and isBookSaved", () => {
    it("should save book and check status correctly for a user", () => {
      const userId = "user-1";
      expect(isBookSaved("book-a", userId)).toBe(false);

      const saved = saveBook("book-a", userId);
      expect(saved).toBe(true);
      expect(isBookSaved("book-a", userId)).toBe(true);

      // Duplicates should not re-add
      expect(saveBook("book-a", userId)).toBe(false);
      expect(getSavedBookIds(userId)).toEqual(["book-a"]);
    });

    it("should isolate bookmarks across different users", () => {
      saveBook("book-1", "user-A");
      saveBook("book-2", "user-B");

      expect(isBookSaved("book-1", "user-A")).toBe(true);
      expect(isBookSaved("book-2", "user-A")).toBe(false);

      expect(isBookSaved("book-2", "user-B")).toBe(true);
      expect(isBookSaved("book-1", "user-B")).toBe(false);
    });
  });

  describe("removeBook", () => {
    it("should remove book from saved list", () => {
      const userId = "user-1";
      saveBook("book-a", userId);
      saveBook("book-b", userId);

      expect(getSavedBookIds(userId)).toEqual(["book-a", "book-b"]);

      removeBook("book-a", userId);
      expect(isBookSaved("book-a", userId)).toBe(false);
      expect(getSavedBookIds(userId)).toEqual(["book-b"]);
    });
  });
});
