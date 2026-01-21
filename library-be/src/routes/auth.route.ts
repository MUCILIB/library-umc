import { Router } from "express";
import { LoginController, getAllUsers } from "../controller/AuthController";
import { isAuthenticated, requireRole } from "../middlewares/auth.middleware";

const router = Router();

// POST USER LOGIN
router.post("/auth/google-callback", LoginController);

// GET ALL USER
router.get(
  "/auth/users",
  isAuthenticated,
  requireRole(["super_admin"]),
  getAllUsers,
);

export const authRoutes = router;
