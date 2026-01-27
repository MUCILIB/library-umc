import { Router } from "express";
import {
  getAllCategories,
  createCategories,
} from "../controller/CategoryController";
import { isAuthenticated, requireRole } from "../middlewares/auth.middleware"; // Import this
import { publicApiLimiter } from "../middleware/rateLimiter";

const router = Router();

router.get("/categories", publicApiLimiter, getAllCategories);

router.post(
  "/categories",
  isAuthenticated,
  requireRole(["super_admin", "staff"]),
  createCategories,
);

export const categoryRoutes = router;
