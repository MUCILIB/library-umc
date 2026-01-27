import { Request, Response } from "express";
import { CategoryService } from "../service/category.service";

export const getAllCategories = async (req: Request, res: Response) => {
  try {
    const result = await CategoryService.getAllCategories();
    if (!result.success) {
      return res.status(500).json(result);
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error("[CategoryController] Error getting categories:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const createCategories = async (req: Request, res: Response) => {
  try {
    // SECURITY: Ambil userId dari session, bukan dari params
    const sessionUser = res.locals.user;

    if (!sessionUser || !sessionUser.id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
        data: null,
      });
    }

    const result = await CategoryService.createCategory(req.body);
    if (!result.success) {
      return res.status(401).json(result);
    }
    return res.status(201).json(result);
  } catch (err) {
    console.error("[CategoryController] Error creating categories:", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
