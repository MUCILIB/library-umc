import { Router } from "express";
import { isAuthenticated } from "../../../middlewares/auth.middleware";
import { requireRole } from "../../../middlewares/auth.middleware";
import { publicApiLimiter } from "../../../middlewares/rateLimiter";
import { importController } from "../controller/import.controller";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

const router = Router();

// Bibliography import
router.post("/import/bibliographies/upload", publicApiLimiter, isAuthenticated, requireRole(["super_admin"]), upload.single("file"), (req, res, next) => importController.uploadBibliography(req, res, next));

// Item import
router.post("/import/items/upload", publicApiLimiter, isAuthenticated, requireRole(["super_admin"]), upload.single("file"), (req, res, next) => importController.uploadItem(req, res, next));

// Batch management
router.get("/import/batches", publicApiLimiter, isAuthenticated, requireRole(["super_admin"]), (req, res, next) => importController.listBatches(req, res, next));
router.get("/import/batches/:batchId", publicApiLimiter, isAuthenticated, requireRole(["super_admin"]), (req, res, next) => importController.getBatch(req, res, next));

// Batch operations
router.post("/import/batches/:batchId/parse", publicApiLimiter, isAuthenticated, requireRole(["super_admin"]), (req, res, next) => importController.parseBatch(req, res, next));
router.post("/import/batches/:batchId/validate", publicApiLimiter, isAuthenticated, requireRole(["super_admin"]), (req, res, next) => importController.validateBatch(req, res, next));
router.get("/import/batches/:batchId/preview", publicApiLimiter, isAuthenticated, requireRole(["super_admin"]), (req, res, next) => importController.previewBatch(req, res, next));
router.get("/import/batches/:batchId/errors", publicApiLimiter, isAuthenticated, requireRole(["super_admin"]), (req, res, next) => importController.getErrors(req, res, next));
router.get("/import/batches/:batchId/errors.csv", publicApiLimiter, isAuthenticated, requireRole(["super_admin"]), (req, res, next) => importController.downloadErrorsCsv(req, res, next));
router.post("/import/batches/:batchId/approve", publicApiLimiter, isAuthenticated, requireRole(["super_admin"]), (req, res, next) => importController.approveBatch(req, res, next));
router.post("/import/batches/:batchId/cancel", publicApiLimiter, isAuthenticated, requireRole(["super_admin"]), (req, res, next) => importController.cancelBatch(req, res, next));

// Universal Template & Simple Imports (TICK-02)
router.get("/import/template/:module", publicApiLimiter, isAuthenticated, requireRole(["super_admin", "staff"]), (req, res, next) => importController.downloadTemplate(req, res, next));
router.post("/import/guests", publicApiLimiter, isAuthenticated, requireRole(["super_admin", "staff"]), upload.single("file"), (req, res, next) => importController.importGuests(req, res, next));
router.post("/import/users", publicApiLimiter, isAuthenticated, requireRole(["super_admin"]), upload.single("file"), (req, res, next) => importController.importUsers(req, res, next));
router.post("/import/loans", publicApiLimiter, isAuthenticated, requireRole(["super_admin", "staff"]), upload.single("file"), (req, res, next) => importController.importLoans(req, res, next));

export default router;
