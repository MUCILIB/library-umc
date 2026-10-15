/**
 * Utility untuk mengelola buku yang disimpan (bookmarks/favorit) di localStorage
 * dengan isolasi per-pengguna (user-scoped storage).
 */

export function getBookmarkStorageKey(userId?: string | null): string {
  if (userId) {
    return `umc_library_bookmarks_${userId}`;
  }
  return "umc_library_bookmarks_guest";
}

export function getSavedBookIds(userId?: string | null): string[] {
  if (!userId) {
    try {
      return JSON.parse(localStorage.getItem("umc_library_bookmarks_guest") || "[]");
    } catch {
      return [];
    }
  }

  const userKey = getBookmarkStorageKey(userId);
  const data = localStorage.getItem(userKey);
  if (data !== null) {
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  // Jika belum ada data di key user, cek apakah ada legacy data di 'umc_library_bookmarks'
  // Pindahkan ke key user saat ini dan bersihkan legacy key agar tidak bocor ke akun lain
  const legacyData = localStorage.getItem("umc_library_bookmarks");
  if (legacyData) {
    try {
      const parsed = JSON.parse(legacyData);
      localStorage.setItem(userKey, JSON.stringify(parsed));
      localStorage.removeItem("umc_library_bookmarks");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      localStorage.removeItem("umc_library_bookmarks");
    }
  }

  return [];
}

export function isBookSaved(bookId: string, userId?: string | null): boolean {
  if (!bookId) return false;
  const savedIds = getSavedBookIds(userId);
  return savedIds.includes(bookId);
}

export function saveBook(bookId: string, userId?: string | null): boolean {
  if (!bookId) return false;
  const key = getBookmarkStorageKey(userId);
  const savedIds = getSavedBookIds(userId);
  if (!savedIds.includes(bookId)) {
    savedIds.push(bookId);
    localStorage.setItem(key, JSON.stringify(savedIds));
    window.dispatchEvent(new Event("storage"));
    return true;
  }
  return false;
}

export function removeBook(bookId: string, userId?: string | null): boolean {
  if (!bookId) return false;
  const key = getBookmarkStorageKey(userId);
  const savedIds = getSavedBookIds(userId);
  const updated = savedIds.filter((id) => id !== bookId);
  localStorage.setItem(key, JSON.stringify(updated));
  window.dispatchEvent(new Event("storage"));
  return true;
}
