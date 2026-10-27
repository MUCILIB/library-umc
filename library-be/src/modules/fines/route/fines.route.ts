import { Router } from "express";
import {
  isAuthenticated,
  requireRole
} from "../../../middlewares/auth.middleware";
import { publicApiLimiter } from "../../../middlewares/rateLimiter";
import FinesController from "../controller/fines.controller";

const router = Router();

/**
 * @swagger
 * /fines/audit/paid-active-loans:
 *   get:
 *     summary: Audit paid fines whose loans are not returned
 *     tags: [Fines]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of records to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *         description: Number of records to skip
 *     responses:
 *       200:
 *         description: Audit data retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin/Staff only
 */
router.get(
  "/fines/audit/paid-active-loans",
  isAuthenticated,
  requireRole(["super_admin", "staff"]),
  publicApiLimiter,
  FinesController.getPaidFinesWithNonReturnedLoans
);

/**
 * @swagger
 * tags:
 *   name: Fines
 *   description: API endpoints for managing fines
 */

/**
 * @swagger
 * /fines:
 *   get:
 *     summary: Get all fines
 *     tags: [Fines]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [paid, unpaid]
 *         description: Filter fines by status
 *       - in: query
 *         name: loanId
 *         schema:
 *           type: string
 *         description: Filter fines by loan ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of records to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *         description: Number of records to skip
 *     responses:
 *       200:
 *         description: List of fines retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/fines",
  isAuthenticated,
  requireRole(["super_admin", "staff"]),
  publicApiLimiter,
  FinesController.getAllFines
);

router.get(
  "/fines/my",
  isAuthenticated,
  publicApiLimiter,
  FinesController.getMyFines
);

/**
 * @swagger
 * /fines/{id}:
 *   get:
 *     summary: Get fine by ID
 *     tags: [Fines]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Fine ID
 *     responses:
 *       200:
 *         description: Fine retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Fine not found
 */
router.get(
  "/fines/:id",
  isAuthenticated,
  publicApiLimiter,
  FinesController.getFineById
);

/**
 * @swagger
 * /fines:
 *   post:
 *     summary: Create a manual fine
 *     tags: [Fines]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - loanId
 *               - amount
 *             properties:
 *               loanId:
 *                 type: string
 *               amount:
 *                 type: number
 *     responses:
 *       201:
 *         description: Fine created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/fines",
  isAuthenticated,
  requireRole(["super_admin", "staff"]),
  publicApiLimiter,
  FinesController.createFineManual
);

/**
 * @swagger
 * /fines/{id}/pay:
 *   post:
 *     summary: Pay a fine
 *     tags: [Fines]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Fine ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentMethod
 *             properties:
 *               paymentMethod:
 *                 type: string
 *                 default: cash
 *     responses:
 *       200:
 *         description: Fine paid successfully
 *       400:
 *         description: Bad request or fine already paid
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Fine not found
 */
router.post(
  "/fines/:id/pay",
  isAuthenticated,
  requireRole(["super_admin", "staff"]),
  publicApiLimiter,
  FinesController.payFine
);

/**
 * @swagger
 * /fines/{id}:
 *   delete:
 *     summary: Delete a fine
 *     tags: [Fines]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Fine ID
 *     responses:
 *       200:
 *         description: Fine deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Fine not found
 */
router.delete(
  "/fines/:id",
  isAuthenticated,
  requireRole(["super_admin"]),
  publicApiLimiter,
  FinesController.deleteFine
);

export default router;
