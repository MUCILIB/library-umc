import { Router } from "express";
import { getAllCategories } from "../controller/CategoryController";

const router = Router();

router.get("/categories", getAllCategories);

export const categoryRoutes = router;
