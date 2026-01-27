import { Router } from "express";
import {
  getAllCategories,
  createCategories,
} from "../controller/CategoryController";
import { isAuthenticated, requireRole } from "../middlewares/auth.middleware"; // Import this

const router = Router();

router.get("/categories", getAllCategories);

router.post(
  "/categories",
  isAuthenticated,
  requireRole(["super_admin", "staff"]),
  createCategories,
);

export const categoryRoutes = router;
