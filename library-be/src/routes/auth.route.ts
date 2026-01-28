import { Router } from "express";
import { LoginController, getAllUsers } from "../controller/AuthController";
import { isAuthenticated, requireRole } from "../middlewares/auth.middleware";
import { authLimiter } from "../middlewares/rateLimiter";

const router = Router();

// POST USER LOGIN (with strict rate limiting to prevent brute force)
router.post("/auth/google-callback", authLimiter, LoginController);

// GET ALL USER
router.get(
  "/auth/users",
  isAuthenticated,
  requireRole(["super_admin"]),
  getAllUsers,
);

export const authRoutes = router;
