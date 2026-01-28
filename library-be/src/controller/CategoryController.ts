import { Request, Response } from "express";
import { CategoryService } from "../service/category.service";
import {
  createCategorySchema,
  updateCategorySchema,
} from "../validation/category.validation";

const categoryService = new CategoryService();

/**
 * GET /categories - Get All Categories
 */
export const getAllCategories = async (req: Request, res: Response) => {
  try {
    const result = await categoryService.getAllCategories();

    if (!result.success) {
      return res.status(500).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("[CategoryController] Error getting categories:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      data: null,
    });
  }
};

/**
 * GET /categories/:id - Get Single Category
 */
export const getCategoryById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validate ID
    const categoryId = parseInt(id as string);
    if (isNaN(categoryId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID",
        data: null,
      });
    }

    const result = await categoryService.getCategoryById(categoryId);

    if (!result.success) {
      return res.status(404).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("[CategoryController] Error getting category:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      data: null,
    });
  }
};

/**
 * POST /categories - Create Category (Super Admin Only)
 */
export const createCategory = async (req: Request, res: Response) => {
  try {
    // Validation
    const validation = createCategorySchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        data: validation.error.flatten(),
      });
    }

    const result = await categoryService.createCategory(validation.data as any);

    if (!result.success) {
      // Check for duplicate error
      if (result.message.includes("already exists")) {
        return res.status(409).json(result); // 409 Conflict
      }
      return res.status(400).json(result);
    }

    return res.status(201).json(result);
  } catch (err) {
    console.error("[CategoryController] Error creating category:", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      data: null,
    });
  }
};

/**
 * PUT /categories/:id - Update Category (Super Admin Only)
 */
export const updateCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validate ID
    const categoryId = parseInt(id as string);
    if (isNaN(categoryId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID",
        data: null,
      });
    }

    // Validation
    const validation = updateCategorySchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        data: validation.error.flatten(),
      });
    }

    const result = await categoryService.updateCategory(
      categoryId,
      validation.data as any,
    );

    if (!result.success) {
      // Check for not found error
      if (result.message.includes("not found")) {
        return res.status(404).json(result);
      }
      // Check for duplicate error
      if (result.message.includes("already exists")) {
        return res.status(409).json(result);
      }
      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error("[CategoryController] Error updating category:", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      data: null,
    });
  }
};

/**
 * DELETE /categories/:id - Delete Category (Super Admin Only)
 */
export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validate ID
    const categoryId = parseInt(id as string);
    if (isNaN(categoryId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID",
        data: null,
      });
    }

    const result = await categoryService.deleteCategory(categoryId);

    if (!result.success) {
      // Check for not found error
      if (result.message.includes("not found")) {
        return res.status(404).json(result);
      }
      // Check for usage error
      if (result.message.includes("being used")) {
        return res.status(409).json(result); // 409 Conflict
      }
      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error("[CategoryController] Error deleting category:", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      data: null,
    });
  }
};
