import { Router } from "express";
import { authRoutes } from "./auth.route";
import { memberRoutes } from "./member.route";
import { collectionRoutes } from "./collection.route";
import { categoryRoutes } from "./category.route";

const router = Router();

// Auth & Users
router.use(authRoutes);

// Member
router.use(memberRoutes);

// Collections
router.use(collectionRoutes);

// Categories
router.use(categoryRoutes);

export const routes = router;
