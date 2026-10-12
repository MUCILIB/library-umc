import { Router } from "express";
import { itemController } from "../controller/item.controller";
import { isAuthenticated } from "../../../middlewares/auth.middleware";
import { requireRole } from "../../../middlewares/auth.middleware";
import { publicApiLimiter } from "../../../middlewares/rateLimiter";

const router = Router();

// Item CRUD
router.get("/items", publicApiLimiter, (req, res, next) => itemController.getAll(req, res, next));
router.get("/items/:id", publicApiLimiter, (req, res, next) => itemController.getById(req, res, next));
router.post("/items", publicApiLimiter, isAuthenticated, requireRole(["super_admin", "staff"]), (req, res, next) => itemController.create(req, res, next));
router.patch("/items/:id", publicApiLimiter, isAuthenticated, requireRole(["super_admin", "staff"]), (req, res, next) => itemController.update(req, res, next));
router.patch("/items/:id/status", publicApiLimiter, isAuthenticated, requireRole(["super_admin", "staff"]), (req, res, next) => itemController.updateStatus(req, res, next));
router.patch("/items/:id/location", publicApiLimiter, isAuthenticated, requireRole(["super_admin", "staff"]), (req, res, next) => itemController.updateLocation(req, res, next));
router.delete("/items/:id", publicApiLimiter, isAuthenticated, requireRole(["super_admin", "staff"]), (req, res, next) => itemController.softDelete(req, res, next));

// Bulk create under bibliography
router.post("/bibliographies/:bibliographyId/items", publicApiLimiter, isAuthenticated, requireRole(["super_admin", "staff"]), (req, res, next) => itemController.create(req, res, next));
router.post("/bibliographies/:bibliographyId/items/bulk", publicApiLimiter, isAuthenticated, requireRole(["super_admin", "staff"]), (req, res, next) => itemController.bulkCreate(req, res, next));

// QR endpoints & Circulation Lookup
router.get("/items/:id/qr", publicApiLimiter, isAuthenticated, requireRole(["super_admin", "staff"]), (req, res, next) => itemController.getQr(req, res, next));
router.post("/items/:id/qr/regenerate", publicApiLimiter, isAuthenticated, requireRole(["super_admin"]), (req, res, next) => itemController.regenerateQr(req, res, next));
router.post("/items/:id/qr/revoke", publicApiLimiter, isAuthenticated, requireRole(["super_admin"]), (req, res, next) => itemController.revokeQr(req, res, next));
router.get("/qr/resolve/:token", publicApiLimiter, isAuthenticated, requireRole(["super_admin", "staff"]), (req, res, next) => itemController.resolveQr(req, res, next));
router.post("/qr/lookup", publicApiLimiter, isAuthenticated, (req, res, next) => itemController.lookup(req, res, next));
router.get("/qr/lookup", publicApiLimiter, isAuthenticated, (req, res, next) => itemController.lookup(req, res, next));
router.post("/qr/scan", publicApiLimiter, isAuthenticated, (req, res, next) => itemController.scan(req, res, next));
router.get("/qr/scan", publicApiLimiter, isAuthenticated, (req, res, next) => itemController.scan(req, res, next));
router.get("/items/generate-code/:bibliographyId", publicApiLimiter, isAuthenticated, requireRole(["super_admin", "staff"]), (req, res, next) => itemController.generateCode(req, res, next));
router.get("/items/bulk-labels", publicApiLimiter, isAuthenticated, requireRole(["super_admin", "staff"]), (req, res, next) => itemController.bulkLabels(req, res, next));

export { router as itemRoutes };
