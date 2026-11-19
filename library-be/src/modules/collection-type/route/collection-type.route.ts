import { Router } from "express";
import { collectionTypeController } from "../controller/collection-type.controller";
import { isAuthenticated, requireRole } from "../../../middlewares/auth.middleware";
import { publicApiLimiter } from "../../../middlewares/rateLimiter";

const router = Router();

// ==========================================
// Collection Types / Klasifikasi Buku
// ==========================================
router.get("/collection-types", publicApiLimiter, (req, res, next) =>
  collectionTypeController.getAll(req, res, next)
);

router.get("/collection-types/:id", publicApiLimiter, (req, res, next) =>
  collectionTypeController.getById(req, res, next)
);

router.post(
  "/collection-types",
  publicApiLimiter,
  isAuthenticated,
  requireRole(["super_admin", "staff"]),
  (req, res, next) => collectionTypeController.create(req, res, next)
);

router.patch(
  "/collection-types/:id",
  publicApiLimiter,
  isAuthenticated,
  requireRole(["super_admin", "staff"]),
  (req, res, next) => collectionTypeController.update(req, res, next)
);

router.delete(
  "/collection-types/:id",
  publicApiLimiter,
  isAuthenticated,
  requireRole(["super_admin", "staff"]),
  (req, res, next) => collectionTypeController.delete(req, res, next)
);

// ==========================================
// GMDs (General Material Designation / Spesifikasi Isi)
// ==========================================
router.get("/gmds", publicApiLimiter, (req, res, next) =>
  collectionTypeController.getGmds(req, res, next)
);

router.post(
  "/gmds",
  publicApiLimiter,
  isAuthenticated,
  requireRole(["super_admin", "staff"]),
  (req, res, next) => collectionTypeController.createGmd(req, res, next)
);

export const collectionTypeRoutes = router;
