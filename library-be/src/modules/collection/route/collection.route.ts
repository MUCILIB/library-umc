import { Router } from "express";
import { bibliographyController } from "../../bibliography/controller/bibliography.controller";
import { itemController } from "../../item/controller/item.controller";
import { isAuthenticated } from "../../../middlewares/auth.middleware";
import { requireRole } from "../../../middlewares/auth.middleware";
import { publicApiLimiter } from "../../../middlewares/rateLimiter";

// Compatibility alias: /api/collections → same bibliography logic
// This ensures the old frontend using /api/collections still works.
const router = Router();

router.get("/collections", publicApiLimiter, (req, res, next) => bibliographyController.list(req, res, next));
router.get("/collections/:id", publicApiLimiter, (req, res, next) => bibliographyController.getById(req, res, next));
router.get("/collections/:id/items", publicApiLimiter, (req, res, next) => bibliographyController.getItems(req, res, next));
router.post("/collections/:bibliographyId/items/standardize", publicApiLimiter, isAuthenticated, requireRole(["super_admin", "staff"]), (req, res, next) => itemController.standardize(req, res, next));
router.post("/collections", publicApiLimiter, isAuthenticated, requireRole(["super_admin", "staff"]), (req, res, next) => bibliographyController.create(req, res, next));
router.patch("/collections/:id", publicApiLimiter, isAuthenticated, requireRole(["super_admin", "staff"]), (req, res, next) => bibliographyController.update(req, res, next));
router.delete("/collections/:id", publicApiLimiter, isAuthenticated, requireRole(["super_admin"]), (req, res, next) => bibliographyController.softDelete(req, res, next));

export { router as collectionRoutes };
