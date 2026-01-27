import { Router } from "express";
import { isAuthenticated, requireRole } from "../middlewares/auth.middleware";
import { upload } from "../utils/upload";
import {
  createCollection,
  getAllCollections,
} from "../controller/CollectionController";
import { publicApiLimiter } from "../middleware/rateLimiter";

const router = Router();

// GET ALL COLLECTIONS (Public with rate limiting to prevent abuse)
// Sesuai SRS (OPAC), biasanya public bisa cari buku, tapi untuk detail mungkin login.
// Kita buat public dulu untuk list.
router.get("/collections", publicApiLimiter, getAllCollections);

// CREATE COLLECTION (Admin & Staff Only with upload rate limiting)
router.post(
  "/collections",
  isAuthenticated,
  requireRole(["super_admin", "staff"]),
  upload.single("cover"),
  createCollection,
);

export const collectionRoutes = router;
