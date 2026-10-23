import { Router } from "express";
import {
  isAuthenticated,
  requireRole,
} from "../../../middlewares/auth.middleware";
import { publicApiLimiter } from "../../../middlewares/rateLimiter";
import recommendationsController from "../controller/recommendation.controller";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Recommendations
 *   description: API endpoints for managing book recommendations
 */

/**
 * @swagger
 * /recommendations:
 *   post:
 *     summary: Request a book recommendation (Lecturer only logically)
 *     tags: [Recommendations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *               author:
 *                 type: string
 *               publisher:
 *                 type: string
 *               reason:
 *                 type: string
 *     responses:
 *       201:
 *         description: Recommendation created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
// Lecturer: Submits Recommendation
router.post(
  "/recommendations",
  publicApiLimiter,
  isAuthenticated,
  requireRole(["lecturer", "dosen", "super_admin", "staff"]), // Provide leeway if needed or isolate just lecturer
  recommendationsController.createRecommendation.bind(
    recommendationsController,
  ),
);

/**
 * @swagger
 * /recommendations/history:
 *   get:
 *     summary: Get my recommendations
 *     tags: [Recommendations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: My recommendations retrieved successfully
 *       401:
 *         description: Unauthorized
 */
// Lecturer: Get their own recommendations
router.get(
  "/recommendations/history",
  publicApiLimiter,
  isAuthenticated,
  recommendationsController.getMyRecommendations.bind(
    recommendationsController,
  ),
);

/**
 * @swagger
 * /recommendations:
 *   get:
 *     summary: Get all recommendations (Admin only)
 *     tags: [Recommendations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *         description: Filter reservations by status
 *     responses:
 *       200:
 *         description: All recommendations retrieved successfully
 *       401:
 *         description: Unauthorized
 */
// Admin: Get all
router.get(
  "/recommendations",
  publicApiLimiter,
  isAuthenticated,
  requireRole(["super_admin", "staff"]),
  recommendationsController.getAllRecommendations.bind(
    recommendationsController,
  ),
);

/**
 * @swagger
 * /recommendations/{id}/status:
 *   patch:
 *     summary: Update recommendation status
 *     tags: [Recommendations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Recommendation ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [approved, rejected]
 *                 description: Status to update to
 *     responses:
 *       200:
 *         description: Status updated successfully
 *       400:
 *         description: Cannot update to invalid status
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Recommendation not found
 */
// Admin: Update status
router.patch(
  "/recommendations/:id/status",
  publicApiLimiter,
  isAuthenticated,
  requireRole(["super_admin", "staff"]),
  recommendationsController.updateRecommendationStatus.bind(
    recommendationsController,
  ),
);

// Soft Delete (Admin/Staff, or Lecturer if pending)
router.delete(
  "/recommendations/:id",
  publicApiLimiter,
  isAuthenticated,
  requireRole(["super_admin", "staff", "lecturer", "dosen"]),
  recommendationsController.deleteRecommendation.bind(
    recommendationsController,
  ),
);

export const recommendationRoutes = router;
