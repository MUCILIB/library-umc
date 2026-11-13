import { type Request, type Response, type NextFunction } from "express";
import bookmarkService from "../service/bookmark.service";
import { sendSuccess, sendError } from "../../../utils/api-utils";

class BookmarkController {
  /**
   * GET /api/bookmarks
   * Get all bookmarked bibliography IDs or full details
   */
  async getMyBookmarks(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      if (!user?.id) {
        return sendError(res, "Tidak terautentikasi", 401);
      }

      const full = req.query.full === "true";
      if (full) {
        const books = await bookmarkService.getSavedBooks(user.id);
        return sendSuccess(res, "Daftar buku yang disimpan", books);
      }

      const ids = await bookmarkService.getSavedBookIds(user.id);
      return sendSuccess(res, "Daftar ID buku yang disimpan", ids);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/bookmarks/check/:bibliographyId
   * Check if specific bibliography is bookmarked
   */
  async checkBookmark(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      if (!user?.id) {
        return sendSuccess(res, "Status bookmark", { isSaved: false });
      }

      const bibliographyId = String(req.params.bibliographyId);
      const isSaved = await bookmarkService.isBookSaved(user.id, bibliographyId);
      return sendSuccess(res, "Status bookmark", { isSaved });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/bookmarks/toggle/:bibliographyId
   * Toggle bookmark
   */
  async toggleBookmark(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      if (!user?.id) {
        return sendError(res, "Tidak terautentikasi", 401);
      }

      const bibliographyId = String(req.params.bibliographyId);
      const result = await bookmarkService.toggleBook(user.id, bibliographyId);
      return sendSuccess(
        res,
        result.saved ? "Buku berhasil disimpan" : "Buku dihapus dari simpanan",
        result
      );
    } catch (error: any) {
      if (error?.message === "Buku tidak ditemukan") {
        return sendError(res, error.message, 404);
      }
      next(error);
    }
  }

  /**
   * POST /api/bookmarks/:bibliographyId
   * Add bookmark
   */
  async addBookmark(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      if (!user?.id) {
        return sendError(res, "Tidak terautentikasi", 401);
      }

      const bibliographyId = String(req.params.bibliographyId);
      const result = await bookmarkService.saveBook(user.id, bibliographyId);
      return sendSuccess(res, "Buku berhasil disimpan ke daftar simpanan", result);
    } catch (error: any) {
      if (error?.message === "Buku tidak ditemukan") {
        return sendError(res, error.message, 404);
      }
      next(error);
    }
  }

  /**
   * DELETE /api/bookmarks/:bibliographyId
   * Remove bookmark
   */
  async removeBookmark(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      if (!user?.id) {
        return sendError(res, "Tidak terautentikasi", 401);
      }

      const bibliographyId = String(req.params.bibliographyId);
      const result = await bookmarkService.removeBook(user.id, bibliographyId);
      return sendSuccess(res, "Buku berhasil dihapus dari daftar simpanan", result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/bookmarks/sync
   * Batch sync offline bookmarks from client
   */
  async syncBookmarks(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      if (!user?.id) {
        return sendError(res, "Tidak terautentikasi", 401);
      }

      const { bibliographyIds } = req.body;
      const ids = await bookmarkService.syncBookmarks(user.id, bibliographyIds || []);
      return sendSuccess(res, "Bookmark berhasil disinkronisasi", ids);
    } catch (error) {
      next(error);
    }
  }
}

export default new BookmarkController();
