import { Router } from "express";
import {
  isAuthenticated,
  requireRole
} from "../../../middlewares/auth.middleware";
import { publicApiLimiter } from "../../../middlewares/rateLimiter";
import reportController from "../controller/report.controller";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: Dashboard statistics and export endpoints (Admin/Staff only)
 */

/**
 * @swagger
 * /reports/dashboard:
 *   get:
 *     summary: Get dashboard statistics
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard stats including totalCollections, totalItems, activeLoans, overdueLoans, totalMembers, unpaidFinesTotal, waitingReservations
 */
router.get(
  "/reports/dashboard",
  publicApiLimiter,
  isAuthenticated,
  requireRole(["super_admin", "staff"]),
  reportController.getDashboardStats.bind(reportController)
);

/**
 * @swagger
 * /reports/popular-books:
 *   get:
 *     summary: Get top most borrowed books
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of books to return
 *     responses:
 *       200:
 *         description: List of popular books with loan count
 */
router.get(
  "/reports/popular-books",
  publicApiLimiter,
  isAuthenticated,
  requireRole(["super_admin", "staff"]),
  reportController.getPopularBooks.bind(reportController)
);

/**
 * @swagger
 * /reports/guest-stats:
 *   get:
 *     summary: Get guest visit statistics for last 7 days
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Daily visitor counts for the last 7 days
 */
router.get(
  "/reports/guest-stats",
  publicApiLimiter,
  isAuthenticated,
  requireRole(["super_admin", "staff"]),
  reportController.getGuestStats.bind(reportController)
);

/**
 * @swagger
 * /reports/loans/export:
 *   get:
 *     summary: Export loan report as CSV or PDF
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [csv, pdf]
 *           default: csv
 *         description: Export format
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [approved, pending, returned, rejected]
 *         description: Filter by loan status
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date filter (YYYY-MM-DD)
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *         description: End date filter (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: File download (CSV or PDF)
 */
router.get(
  "/reports/loans/export",
  publicApiLimiter,
  isAuthenticated,
  requireRole(["super_admin", "staff"]),
  reportController.exportLoans.bind(reportController)
);

/**
 * @swagger
 * /reports/fines/export:
 *   get:
 *     summary: Export fines report as CSV or PDF
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [csv, pdf]
 *           default: csv
 *         description: Export format
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [paid, unpaid]
 *         description: Filter by fine status
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 12
 *         description: Filter month of payment (recommended with status=paid)
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Filter year of payment (recommended with status=paid)
 *     responses:
 *       200:
 *         description: File download (CSV or PDF)
 */
router.get(
  "/reports/fines/export",
  publicApiLimiter,
  isAuthenticated,
  requireRole(["super_admin", "staff"]),
  reportController.exportFines.bind(reportController)
);

/**
 * @swagger
 * /reports/fines/revenue:
 *   get:
 *     summary: Get fine revenue summary for monthly audit
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 12
 *         description: Target month (default current month)
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Target year (default current year)
 *     responses:
 *       200:
 *         description: Revenue totals and monthly breakdown
 */
router.get(
  "/reports/fines/revenue",
  publicApiLimiter,
  isAuthenticated,
  requireRole(["super_admin", "staff"]),
  reportController.getFinesRevenueSummary.bind(reportController)
);

/**
 * @swagger
 * /reports/visitor-analytics:
 *   get:
 *     summary: Get comparative visitor analytics (physical vs web)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: range
 *         schema:
 *           type: string
 *           enum: [day, week, month, custom]
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Visitor analytics data
 */
router.get(
  "/reports/visitor-analytics",
  publicApiLimiter,
  isAuthenticated,
  requireRole(["super_admin", "staff"]),
  reportController.getVisitorAnalytics.bind(reportController)
);

/**
 * @swagger
 * /reports/web-traffic:
 *   get:
 *     summary: Get web traffic summary aggregated by day
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 90
 *           default: 30
 *         description: Number of days to include in daily aggregation
 *     responses:
 *       200:
 *         description: Aggregated web traffic metrics
 */
router.get(
  "/reports/web-traffic",
  publicApiLimiter,
  isAuthenticated,
  requireRole(["super_admin", "staff"]),
  reportController.getWebTraffic.bind(reportController)
);

/**
 * @swagger
 * /reports/web-traffic/track:
 *   post:
 *     summary: Track web visit event
 *     tags: [Reports]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [path]
 *             properties:
 *               path:
 *                 type: string
 *                 example: /katalog/123
 *     responses:
 *       201:
 *         description: Traffic successfully tracked
 */
router.post(
  "/reports/web-traffic/ping",
  publicApiLimiter,
  reportController.trackWebTraffic.bind(reportController)
);
router.post(
  "/reports/web-traffic/track",
  publicApiLimiter,
  reportController.trackWebTraffic.bind(reportController)
);

export const reportRoutes = router;
