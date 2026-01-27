import { Router } from "express";
import {
  createGuestLog,
  getGuestLogs,
  getGuestStats,
} from "../controller/GuestController";
import { isAuthenticated, requireRole } from "../middlewares/auth.middleware";

const router = Router();

// Create Guest Log (Admin, Staff)
router.post(
  "/guests",
  isAuthenticated,
  requireRole(["super_admin", "staff"]), // Adjust roles as needed
  createGuestLog,
);

// Get Logs (Admin, Staff)
router.get(
  "/guests",
  isAuthenticated,
  requireRole(["super_admin", "staff"]),
  getGuestLogs,
);

// Get Stats (Public or Admin? User said "Admin" mostly, but stats might be public dashboard)
// Let's keep it protected for now based on request "hanya dilakukan oleh admin"
router.get(
  "/guests/stats",
  isAuthenticated,
  requireRole(["super_admin", "staff"]),
  getGuestStats,
);

export const guestRoutes = router;
