import { Router } from "express";
import { isAuthenticated, requireRole } from "../middlewares/auth.middleware";
import { upload } from "../utils/upload";
import {
  createCollection,
  getAllCollections,
} from "../controller/CollectionController";

const router = Router();

// GET ALL COLLECTIONS (Public or Authenticated?)
// Sesuai SRS (OPAC), biasanya public bisa cari buku, tapi untuk detail mungkin login.
// Kita buat public dulu untuk list.
router.get("/collections", getAllCollections);

// CREATE COLLECTION (Admin & Staff Only)
router.post(
  "/collections",
  isAuthenticated,
  requireRole(["super_admin", "staff"]),
  upload.single("cover"),
  createCollection,
);

export const collectionRoutes = router;
