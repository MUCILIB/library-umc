import { Router } from "express";
import { isAuthenticated } from "../../../middlewares/auth.middleware";
import { publicApiLimiter } from "../../../middlewares/rateLimiter";
import bookmarkController from "../controller/bookmark.controller";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Bookmarks
 *   description: Endpoints for managing user book bookmarks / favorites
 */

// Get current user bookmarks (list of IDs or full objects via ?full=true)
router.get(
  "/bookmarks",
  publicApiLimiter,
  isAuthenticated,
  bookmarkController.getMyBookmarks.bind(bookmarkController)
);

// Check if book is bookmarked (can be called anonymously or authenticated)
router.get(
  "/bookmarks/check/:bibliographyId",
  publicApiLimiter,
  bookmarkController.checkBookmark.bind(bookmarkController)
);

// Toggle bookmark
router.post(
  "/bookmarks/toggle/:bibliographyId",
  publicApiLimiter,
  isAuthenticated,
  bookmarkController.toggleBookmark.bind(bookmarkController)
);

// Add bookmark
router.post(
  "/bookmarks/:bibliographyId",
  publicApiLimiter,
  isAuthenticated,
  bookmarkController.addBookmark.bind(bookmarkController)
);

// Remove bookmark
router.delete(
  "/bookmarks/:bibliographyId",
  publicApiLimiter,
  isAuthenticated,
  bookmarkController.removeBookmark.bind(bookmarkController)
);

// Sync offline bookmarks on login
router.post(
  "/bookmarks/sync",
  publicApiLimiter,
  isAuthenticated,
  bookmarkController.syncBookmarks.bind(bookmarkController)
);

export default router;
