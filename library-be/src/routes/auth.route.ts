import { Router } from "express";
import { LoginController } from "../controller/LoginController";

const router = Router();

// POST USER LOGIN
router.post("/auth/google-callback", LoginController);

export const authRoutes = router;
