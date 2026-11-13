import { bookmarkApi } from "@/api/client";

/**
 * Utility untuk mengelola buku yang disimpan (bookmarks/favorit).
 * Mendukung dual-storage: sync ke Backend Database saat login,
 * serta caching di localStorage agar UI instan dan tetap responsif.
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

/**
 * Simpan buku ke LocalStorage dan Backend Database jika user login
 */
export function saveBook(bookId: string, userId?: string | null): boolean {
  if (!bookId) return false;
  const key = getBookmarkStorageKey(userId);
  const savedIds = getSavedBookIds(userId);
  if (!savedIds.includes(bookId)) {
    savedIds.push(bookId);
    localStorage.setItem(key, JSON.stringify(savedIds));
    window.dispatchEvent(new Event("storage"));

    // Async sync ke DB jika user terautentikasi
    if (userId) {
      bookmarkApi.add(bookId).catch((err) => {
        console.warn("Gagal sinkronisasi bookmark ke database:", err);
      });
    }

    return true;
  }
  return false;
}

/**
 * Hapus buku dari LocalStorage dan Backend Database jika user login
 */
export function removeBook(bookId: string, userId?: string | null): boolean {
  if (!bookId) return false;
  const key = getBookmarkStorageKey(userId);
  const savedIds = getSavedBookIds(userId);
  const updated = savedIds.filter((id) => id !== bookId);
  localStorage.setItem(key, JSON.stringify(updated));
  window.dispatchEvent(new Event("storage"));

  // Async hapus dari DB jika user terautentikasi
  if (userId) {
    bookmarkApi.remove(bookId).catch((err) => {
      console.warn("Gagal menghapus bookmark dari database:", err);
    });
  }

  return true;
}

/**
 * Mengambil daftar ID terbaru dari Database dan memperbarui cache LocalStorage
 */
export async function syncBookmarksFromDb(userId: string): Promise<string[]> {
  if (!userId) return [];
  try {
    const localIds = getSavedBookIds(userId);
    // Sinkronisasi dua arah: kirim localIds ke DB terlebih dahulu
    let ids: string[] = [];
    if (localIds.length > 0) {
      const res = await bookmarkApi.sync(localIds);
      ids = res.data || [];
    } else {
      const res = await bookmarkApi.getMyIds();
      ids = res.data || [];
    }

    const key = getBookmarkStorageKey(userId);
    localStorage.setItem(key, JSON.stringify(ids));
    window.dispatchEvent(new Event("storage"));
    return ids;
  } catch (err) {
    console.warn("Gagal sync bookmarks dari DB, fallback ke local:", err);
    return getSavedBookIds(userId);
  }
}
