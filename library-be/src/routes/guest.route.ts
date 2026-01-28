import { Router } from "express";
import {
  searchCampusUsers,
  getAllCampusUsers,
  getUserFromCampus,
  createGuestLog,
  getGuestLogs,
  getGuestStats,
  deleteGuestLog,
} from "../controller/GuestController";
import { isAuthenticated, requireRole } from "../middlewares/auth.middleware";

const router = Router();

/**
 * @swagger
 * /guests/search:
 *   get:
 *     summary: Search users from Campus API
 *     description: Search for users by name, faculty, major, or email from external Campus API
 *     tags: [Guests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Search by user name
 *       - in: query
 *         name: faculty
 *         schema:
 *           type: string
 *         description: Search by faculty
 *       - in: query
 *         name: major
 *         schema:
 *           type: string
 *         description: Search by major/prodi
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *           format: email
 *         description: Search by email
 *     responses:
 *       200:
 *         description: Users found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       email:
 *                         type: string
 *                       nim:
 *                         type: string
 *                       faculty:
 *                         type: string
 *                       prodi:
 *                         type: string
 *       400:
 *         description: At least one search parameter is required
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/guests/search",
  isAuthenticated,
  requireRole(["super_admin", "staff"]),
  searchCampusUsers,
);

/**
 * @swagger
 * /guests/campus:
 *   get:
 *     summary: Get all users from Campus API
 *     description: Fetch all users from external Campus API for admin browsing and check-in
 *     tags: [Guests]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All users fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       email:
 *                         type: string
 *                       nim:
 *                         type: string
 *                       faculty:
 *                         type: string
 *                       prodi:
 *                         type: string
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/guests/campus",
  isAuthenticated,
  requireRole(["super_admin", "staff"]),
  getAllCampusUsers,
);

/**
 * @swagger
 * /guests/campus/{email}:
 *   get:
 *     summary: Get user data from Campus API by email
 *     description: Fetch specific user information from external Campus API
 *     tags: [Guests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: User email to search in Campus API
 *     responses:
 *       200:
 *         description: User found in Campus API
 *       404:
 *         description: User not found in Campus API
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/guests/campus/:email",
  isAuthenticated,
  requireRole(["super_admin", "staff"]),
  getUserFromCampus,
);

/**
 * @swagger
 * /guests/stats:
 *   get:
 *     summary: Get guest statistics
 *     description: Get statistics grouped by faculty and major (Admin/Staff only)
 *     tags: [Guests]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/guests/stats",
  isAuthenticated,
  requireRole(["super_admin", "staff"]),
  getGuestStats,
);

/**
 * @swagger
 * /guests:
 *   post:
 *     summary: Create guest log
 *     description: Register a guest visit to the library (Admin/Staff only)
 *     tags: [Guests]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email of the guest (will fetch data from Campus API)
 *     responses:
 *       201:
 *         description: Guest log created successfully
 *       400:
 *         description: Validation error or user already logged today
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found in Campus API
 */
router.post(
  "/guests",
  isAuthenticated,
  requireRole(["super_admin", "staff"]),
  createGuestLog,
);

/**
 * @swagger
 * /guests:
 *   get:
 *     summary: Get all guest logs
 *     description: Retrieve paginated list of guest logs (Admin/Staff only)
 *     tags: [Guests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Guest logs retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/guests",
  isAuthenticated,
  requireRole(["super_admin", "staff"]),
  getGuestLogs,
);

/**
 * @swagger
 * /guests/{id}:
 *   delete:
 *     summary: Delete guest log
 *     description: Remove a guest log entry (Admin/Staff only). Use this if wrong user was selected.
 *     tags: [Guests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Guest log ID
 *     responses:
 *       200:
 *         description: Guest log deleted successfully
 *       404:
 *         description: Guest log not found
 *       401:
 *         description: Unauthorized
 */
router.delete(
  "/guests/:id",
  isAuthenticated,
  requireRole(["super_admin", "staff"]),
  deleteGuestLog,
);

export const guestRoutes = router;
