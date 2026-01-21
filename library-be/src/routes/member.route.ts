import { Router } from "express";
import { isAuthenticated } from "../middlewares/auth.middleware";
import { getMyProfile, updateMyProfile } from "../controller/MemberController";

const router = Router();

// GET PROFILE (ME)
router.get("/members/me", isAuthenticated, getMyProfile);

// UPDATE PROFILE (ME)
router.patch("/members/me", isAuthenticated, updateMyProfile);
export const memberRoutes = router;
