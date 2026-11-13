import { db } from "../../../db";
import { bookmarks, bibliographies } from "../../../db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { bibliographyService } from "../../bibliography/service/bibliography.service";

class BookmarkService {
  /**
   * Get all bookmarked bibliography IDs for a user
   */
  async getSavedBookIds(userId: string): Promise<string[]> {
    if (!userId) return [];

    const rows = await db
      .select({ bibliographyId: bookmarks.bibliographyId })
      .from(bookmarks)
      .where(eq(bookmarks.userId, userId))
      .orderBy(desc(bookmarks.createdAt));

    return rows.map((r) => r.bibliographyId);
  }

  /**
   * Check if a specific book is bookmarked by user
   */
  async isBookSaved(userId: string, bibliographyId: string): Promise<boolean> {
    if (!userId || !bibliographyId) return false;

    const [existing] = await db
      .select({ id: bookmarks.id })
      .from(bookmarks)
      .where(
        and(
          eq(bookmarks.userId, userId),
          eq(bookmarks.bibliographyId, bibliographyId)
        )
      )
      .limit(1);

    return !!existing;
  }

  /**
   * Add a bookmark (idempotent)
   */
  async saveBook(userId: string, bibliographyId: string): Promise<{ saved: boolean }> {
    if (!userId || !bibliographyId) {
      throw new Error("userId and bibliographyId are required");
    }

    // Verify bibliography exists and not soft-deleted
    const [bib] = await db
      .select({ id: bibliographies.id })
      .from(bibliographies)
      .where(eq(bibliographies.id, bibliographyId))
      .limit(1);

    if (!bib) {
      throw new Error("Buku tidak ditemukan");
    }

    await db
      .insert(bookmarks)
      .values({
        userId,
        bibliographyId,
      })
      .onConflictDoNothing();

    return { saved: true };
  }

  /**
   * Remove a bookmark
   */
  async removeBook(userId: string, bibliographyId: string): Promise<{ removed: boolean }> {
    if (!userId || !bibliographyId) {
      throw new Error("userId and bibliographyId are required");
    }

    await db
      .delete(bookmarks)
      .where(
        and(
          eq(bookmarks.userId, userId),
          eq(bookmarks.bibliographyId, bibliographyId)
        )
      );

    return { removed: true };
  }

  /**
   * Toggle bookmark status
   */
  async toggleBook(userId: string, bibliographyId: string): Promise<{ saved: boolean }> {
    const isSaved = await this.isBookSaved(userId, bibliographyId);
    if (isSaved) {
      await this.removeBook(userId, bibliographyId);
      return { saved: false };
    } else {
      await this.saveBook(userId, bibliographyId);
      return { saved: true };
    }
  }

  /**
   * Get full list of bookmarked bibliographies for user
   */
  async getSavedBooks(userId: string) {
    const savedIds = await this.getSavedBookIds(userId);
    if (savedIds.length === 0) return [];

    // Fetch details in order
    const bookPromises = savedIds.map(async (id) => {
      try {
        return await bibliographyService.getById(id);
      } catch {
        return null;
      }
    });

    const results = await Promise.all(bookPromises);
    return results.filter((b): b is NonNullable<typeof b> => b !== null);
  }

  /**
   * Batch sync offline/localStorage bookmarks to DB on login
   */
  async syncBookmarks(userId: string, bibliographyIds: string[]): Promise<string[]> {
    if (!userId || !Array.isArray(bibliographyIds) || bibliographyIds.length === 0) {
      return this.getSavedBookIds(userId);
    }

    // Filter valid bibliography IDs
    const validBibs = await db
      .select({ id: bibliographies.id })
      .from(bibliographies)
      .where(inArray(bibliographies.id, bibliographyIds));

    for (const bib of validBibs) {
      await db
        .insert(bookmarks)
        .values({
          userId,
          bibliographyId: bib.id,
        })
        .onConflictDoNothing();
    }

    return this.getSavedBookIds(userId);
  }
}

export default new BookmarkService();
