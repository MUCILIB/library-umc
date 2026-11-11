import { Router } from "express";
import multer from "multer";
import {
  isAuthenticated,
  requireRole
} from "../../../middlewares/auth.middleware";
import { MemberController } from "../controller/member.controller";

const router = Router();
const memberController = new MemberController();

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (_req, file, cb) => {
    const isImage =
      file.mimetype.startsWith("image/") ||
      ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype);
    if (isImage) {
      cb(null, true);
    } else {
      cb(new Error("Hanya file gambar (JPG, PNG, WebP) yang diperbolehkan"));
    }
  },
});

/**
 * @swagger
 * /members/me:
 *   get:
 *     summary: Get Current Member Profile
 *     tags: [Members]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Member profile data
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - properties:
 *                     data:
 *                       $ref: '#/components/schemas/Member'
 *       404:
 *         description: Member profile not found
 */
router.get("/members/me", isAuthenticated, memberController.getMyProfile);

/**
 * @swagger
 * /members/me:
 *   patch:
 *     summary: Update Current Member Profile
 *     tags: [Members]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nimNidn:
 *                 type: string
 *               faculty:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Member'
 */
// Public: Stream avatar
router.get("/members/avatar/:filename", (req, res, next) =>
  memberController.getAvatar(req, res, next)
);

// Terproteksi: Upload avatar profil user
router.post(
  "/members/me/avatar",
  isAuthenticated,
  avatarUpload.single("avatar"),
  (req, res, next) => memberController.uploadMyAvatar(req, res, next)
);

router.patch("/members/me", isAuthenticated, memberController.updateMyProfile);

router.get(
  "/members/me/card",
  isAuthenticated,
  memberController.getMyMemberCard
);

router.get(
  "/members",
  isAuthenticated,
  requireRole(["super_admin", "staff"]),
  memberController.getAllMembers
);

router.post(
  "/members/me/card/request",
  isAuthenticated,
  memberController.requestMyMemberCard
);

router.post(
  "/members/me/card/renew",
  isAuthenticated,
  memberController.requestCardRenewal
);

router.get(
  "/members/cards/pending",
  isAuthenticated,
  requireRole(["super_admin", "staff"]),
  memberController.getPendingCardRequests
);

router.get(
  "/members/cards/renewals/pending",
  isAuthenticated,
  requireRole(["super_admin", "staff"]),
  memberController.getPendingCardRenewals
);

router.patch(
  "/members/:id/card/approve",
  isAuthenticated,
  requireRole(["super_admin", "staff"]),
  memberController.approveMemberCard
);

router.patch(
  "/members/:id/card/renew/approve",
  isAuthenticated,
  requireRole(["super_admin", "staff"]),
  memberController.approveCardRenewal
);

router.post(
  "/members/:id/card/issue",
  isAuthenticated,
  requireRole(["super_admin", "staff"]),
  memberController.issueMemberCard
);

router.patch(
  "/members/:id/card/reject",
  isAuthenticated,
  requireRole(["super_admin", "staff"]),
  memberController.rejectMemberCard
);

router.patch(
  "/members/:id/card/renew/reject",
  isAuthenticated,
  requireRole(["super_admin", "staff"]),
  memberController.rejectCardRenewal
);

export const memberRoutes = router;
