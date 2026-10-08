import { Router } from "express";
import {
  isAuthenticated,
  requireRole,
} from "../../../middlewares/auth.middleware";
import {
  publicApiLimiter,
  strictLimiter,
} from "../../../middlewares/rateLimiter";
import locationController from "../controller/location.controller";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Locations
 *   description: Manajemen lokasi penyimpanan item (ruangan, rak, rak buku)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Location:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         room:
 *           type: string
 *           example: "Ruang A"
 *         rack:
 *           type: string
 *           example: "Rak 1"
 *         shelf:
 *           type: string
 *           example: "Lantai 2"
 *         deletedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *     LocationInput:
 *       type: object
 *       required:
 *         - room
 *         - rack
 *         - shelf
 *       properties:
 *         room:
 *           type: string
 *           minLength: 1
 *           maxLength: 200
 *           example: "Ruang A"
 *         rack:
 *           type: string
 *           minLength: 1
 *           maxLength: 200
 *           example: "Rak 1"
 *         shelf:
 *           type: string
 *           minLength: 1
 *           maxLength: 200
 *           example: "Lantai 2"
 */

/**
 * @swagger
 * /locations:
 *   get:
 *     summary: Ambil semua lokasi
 *     description: >
 *       Mengembalikan daftar semua lokasi penyimpanan item yang aktif (belum dihapus).
 *       Dapat diakses oleh semua user yang sudah login.
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Daftar lokasi berhasil diambil
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Locations retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Location'
 *       401:
 *         description: Unauthorized - Token tidak valid atau tidak ada
 *       429:
 *         description: Too Many Requests
 */
router.get(
  "/locations",
  publicApiLimiter,
  isAuthenticated,
  locationController.getAllLocations,
);

/**
 * @swagger
 * /locations/{id}:
 *   get:
 *     summary: Ambil lokasi berdasarkan ID
 *     description: Mengembalikan detail satu lokasi berdasarkan ID numerik.
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID numerik lokasi
 *         example: 1
 *     responses:
 *       200:
 *         description: Lokasi ditemukan
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Location retrieved successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Location'
 *       400:
 *         description: ID tidak valid (bukan angka)
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Lokasi tidak ditemukan
 */
router.get(
  "/locations/:id",
  publicApiLimiter,
  isAuthenticated,
  locationController.getLocationById,
);

/**
 * @swagger
 * /locations:
 *   post:
 *     summary: Tambah lokasi baru
 *     description: >
 *       Membuat lokasi penyimpanan baru. Kombinasi room + rack + shelf harus unik.
 *       Hanya dapat diakses oleh super_admin atau staff.
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LocationInput'
 *     responses:
 *       201:
 *         description: Lokasi berhasil dibuat
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Location created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Location'
 *       400:
 *         description: Validasi gagal atau lokasi sudah ada
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Hanya Admin/Staff
 */
router.post(
  "/locations",
  publicApiLimiter,
  isAuthenticated,
  requireRole(["super_admin", "staff"]),
  locationController.createLocation,
);

/**
 * @swagger
 * /locations/{id}:
 *   put:
 *     summary: Update lokasi
 *     description: >
 *       Memperbarui data lokasi yang sudah ada berdasarkan ID.
 *       Hanya dapat diakses oleh super_admin atau staff.
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID numerik lokasi yang akan diupdate
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LocationInput'
 *     responses:
 *       200:
 *         description: Lokasi berhasil diupdate
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Location updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Location'
 *       400:
 *         description: ID tidak valid atau validasi body gagal
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Hanya Admin/Staff
 *       404:
 *         description: Lokasi tidak ditemukan
 */
router.patch(
  "/locations/:id",
  publicApiLimiter,
  isAuthenticated,
  requireRole(["super_admin", "staff"]),
  locationController.updateLocation,
);

/**
 * @swagger
 * /locations/{id}:
 *   delete:
 *     summary: Hapus lokasi (soft delete)
 *     description: >
 *       Menghapus lokasi secara soft delete (mengisi deletedAt).
 *       Hanya dapat diakses oleh super_admin.
 *       Perhatian: jika masih ada item yang menggunakan lokasi ini, penghapusan bisa berdampak.
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID numerik lokasi yang akan dihapus
 *         example: 1
 *     responses:
 *       200:
 *         description: Lokasi berhasil dihapus
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Location deleted successfully"
 *                 data:
 *                   nullable: true
 *                   example: null
 *       400:
 *         description: ID tidak valid (bukan angka)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Hanya Super Admin
 *       404:
 *         description: Lokasi tidak ditemukan
 *       429:
 *         description: Too Many Requests (rate limited)
 */
router.delete(
  "/locations/:id",
  strictLimiter,
  isAuthenticated,
  requireRole(["super_admin"]),
  locationController.deleteLocation,
);

export const locationRoutes = router;
