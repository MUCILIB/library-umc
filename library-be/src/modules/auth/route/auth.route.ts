import { Router } from "express";
import { AuthController } from "../controller/auth.controller";
import {
  isAuthenticated,
  requireRole
} from "../../../middlewares/auth.middleware";
import { authLimiter } from "../../../middlewares/rateLimiter";

const router = Router();
const authController = new AuthController();

// Frontend kini memanggil via authClient:
//   - authClient.signUp.email()  → POST /api/auth/sign-up/email
//   - authClient.signIn.email()  → POST /api/auth/sign-in/email
//   - authClient.signIn.social() → POST /api/auth/sign-in/social
//
// Semua route /api/auth/* HARUS ditangani better-auth, bukan
// custom controller — agar cookie session di-set otomatis.
// ============================================================
// router.post("/auth/register", authController.register);
// router.post("/auth/login", authController.loginCredential);
// router.post("/auth/google-callback", authController.login);   ← konflik wildcard

/**
 * @swagger
 * /auth/forget-password:
 *   post:
 *     summary: Request link reset password (di-handle oleh better-auth)
 *     description: Mengirimkan link reset password ke email pengguna jika email terdaftar. Response selalu sukses terlepas dari apakah email ada atau tidak, untuk mencegah enumerasi pengguna.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - redirectTo
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "user@umc.ac.id"
 *               redirectTo:
 *                 type: string
 *                 example: "http://localhost:5173/reset-password"
 *     responses:
 *       200:
 *         description: Berhasil mengirim permintaan
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Validation Error
 */

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Reset password dengan token (di-handle oleh better-auth)
 *     description: Mengganti password lama dengan password baru menggunakan token yang dikirim via email.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               newPassword:
 *                 type: string
 *                 example: "PasswordBaru123!"
 *                 description: "Password baru (minimal 8 karakter)"
 *               token:
 *                 type: string
 *                 example: "a3f9b2c1d..."
 *                 description: "Token unik yang diterima dari URL email"
 *     responses:
 *       200:
 *         description: Password berhasil di-reset
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                 session:
 *                   type: object
 *       400:
 *         description: Token tidak valid atau sudah kadaluarsa
 */

/**
 * @swagger
 * /campus/verify:
 *   post:
 *     summary: Verifikasi email via API Kampus UMC
 *     description: |
 *       Mengecek apakah email terdaftar di sistem kampus UMC.
 *       Dipisahkan dari prefix `/auth/*` agar tidak di-intercept
 *       oleh better-auth wildcard handler `app.all("/api/auth/*path")`.
 *     tags: [Auth]
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
 *                 example: "user@umc.ac.id"
 *     responses:
 *       200:
 *         description: Verifikasi berhasil
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
 *                   example: "Verifikasi kampus berhasil"
 *                 data:
 *                   type: object
 *       400:
 *         description: Validation Error
 *       404:
 *         description: Email tidak ditemukan di sistem kampus
 *       500:
 *         description: Server Error
 */
router.post("/campus/verify", authLimiter, authController.login);

/**
 * @swagger
 * /users/all:
 *   get:
 *     summary: Get All Users (Super Admin Only)
 *     description: |
 *       Dipindahkan dari `/auth/users` agar tidak di-intercept
 *       oleh better-auth wildcard handler `app.all("/api/auth/*path")`.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all users
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
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Super Admin only
 */
router.get(
  "/users/all",
  isAuthenticated,
  requireRole(["super_admin"]),
  authController.getAllUsers
);

router.patch(
  "/users/:id/role",
  isAuthenticated,
  requireRole(["super_admin"]),
  authController.updateUserRole
);

router.patch(
  "/users/:id/ban",
  isAuthenticated,
  requireRole(["super_admin"]),
  authController.updateUserBanStatus
);

router.post(
  "/users/:id/sync-member",
  isAuthenticated,
  requireRole(["super_admin"]),
  authController.syncUserMember
);

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Delete User (Super Admin Only)
 *     description: Menghapus (soft delete) user, mencabut semua sesi aktif, dan menghapus profil member terkait.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User berhasil dihapus
 *       400:
 *         description: Bad Request (misal menghapus diri sendiri, super admin terakhir, atau memiliki pinjaman aktif)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Super Admin only
 */
router.delete(
  "/users/:id",
  isAuthenticated,
  requireRole(["super_admin"]),
  authController.deleteUser
);

export const authRoutes = router;
