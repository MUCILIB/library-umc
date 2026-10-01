import { Router } from "express";
import { isAuthenticated } from "../../../middlewares/auth.middleware";
import { requireRole } from "../../../middlewares/auth.middleware";
import { publicApiLimiter } from "../../../middlewares/rateLimiter";
import { exportController } from "../controller/export.controller";

const router = Router();

router.get("/export/bibliographies", publicApiLimiter, isAuthenticated, requireRole(["super_admin", "staff"]), (req, res, next) => exportController.exportBibliographies(req, res, next));
router.get("/export/items", publicApiLimiter, isAuthenticated, requireRole(["super_admin", "staff"]), (req, res, next) => exportController.exportItems(req, res, next));
router.get("/export/guests", publicApiLimiter, isAuthenticated, requireRole(["super_admin", "staff"]), (req, res, next) => exportController.exportGuests(req, res, next));
router.get("/export/loans", publicApiLimiter, isAuthenticated, requireRole(["super_admin", "staff"]), (req, res, next) => exportController.exportLoans(req, res, next));
router.get("/export/users", publicApiLimiter, isAuthenticated, requireRole(["super_admin", "staff"]), (req, res, next) => exportController.exportUsers(req, res, next));

export default router;
