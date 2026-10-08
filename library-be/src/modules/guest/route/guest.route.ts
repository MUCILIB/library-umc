import { Router } from "express";
import { GuestController } from "../controller/guest.controller";
import {
  isAuthenticated,
  requireRole
} from "../../../middlewares/auth.middleware";

const router = Router();
const guestController = new GuestController();

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
 * */
router.get(
  "/guests/search",
  isAuthenticated,
  requireRole(["super_admin", "staff"]),
  guestController.searchCampusUsers
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
  guestController.getAllCampusUsers
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
  guestController.getUserFromCampus
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
  guestController.getGuestStats
);

/**
 * @swagger
 * /guests/direct:
 *   post:
 *     summary: Create guest log directly (no Campus API lookup)
 *     description: Register a guest visit using provided member data directly. Used by admin dropdown where member data is already available.
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
 *               - name
 *               - email
 *             properties:
 *               name:
 *                 type: string
 *                 description: Guest name
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Guest email
 *               identifier:
 *                 type: string
 *                 description: NIM/NIDN
 *               faculty:
 *                 type: string
 *                 description: Faculty name
 *               major:
 *                 type: string
 *                 description: Major/Prodi name
 *     responses:
 *       201:
 *         description: Guest log created successfully
 *       400:
 *         description: Validation error or user already logged today
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/guests/direct",
  isAuthenticated,
  requireRole(["super_admin", "staff"]),
  guestController.createGuestLogDirect
);

/**
 * @swagger
 * /guests/scan:
 *   post:
 *     summary: Kiosk scan presensi member
 *     description: Scan QR/Barcode KTM atau masukkan NIM/Email member untuk absensi cepat
 *     tags: [Guests]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - memberIdentifier
 *             properties:
 *               memberIdentifier:
 *                 type: string
 *                 description: NIM, Card Number / Barcode, atau Email member
 *     responses:
 *       200:
 *         description: Member found and attendance recorded
 *       404:
 *         description: Member not found (redirect to non-member form)
 *       400:
 *         description: Validation error
 */
router.post("/guests/scan", guestController.scanMember);

/**
 * @swagger
 * /guests/non-member:
 *   post:
 *     summary: Presensi pengunjung non-member (tamu umum)
 *     description: Catat kehadiran tamu umum non-member
 *     tags: [Guests]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - institution
 *               - purpose
 *               - phone
 *             properties:
 *               fullName:
 *                 type: string
 *               institution:
 *                 type: string
 *               purpose:
 *                 type: string
 *               phone:
 *                 type: string
 *               studyProgramId:
 *                 type: integer
 *               facultyId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Guest attendance registered successfully
 *       400:
 *         description: Validation error
 */
router.post("/guests/non-member", guestController.createNonMember);

/**
 * @swagger
 * /guests/absensi:
 *   post:
 *     summary: Create absensi log
 *     tags: [Guests]
 */

router.post(
  "/guests/absensi",
  guestController.createAbsensi
);
router.post(
  "/guest/absensi",
  guestController.createAbsensi
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
  guestController.createGuestLog
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
 *       - in: query
 *         name: studyProgramId
 *         schema:
 *           type: integer
 *         description: Filter by Program Studi ID
 *       - in: query
 *         name: facultyId
 *         schema:
 *           type: integer
 *         description: Filter by Fakultas ID
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [member, non-member]
 *         description: Filter by tipe pengunjung (member/non-member)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by nama, NIM, email, atau institusi
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
  guestController.getGuestLogs
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
  guestController.deleteGuestLog
);

export const guestRoutes = router;
