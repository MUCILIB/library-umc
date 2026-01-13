import { Router } from "express";
import { authRoutes } from "./auth.route";

const router = Router();

// Auth & Users
router.use(authRoutes);

export const routes = router;
