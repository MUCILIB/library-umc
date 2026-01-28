import { Router } from "express";
import {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controller/CategoryController";
import { isAuthenticated, requireRole } from "../middlewares/auth.middleware";
import { publicApiLimiter } from "../middlewares/rateLimiter";

const router = Router();

/**
 * @swagger
 * /categories:
 *   get:
 *     summary: Get all categories
 *     description: Retrieve list of all book categories (Public endpoint)
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Categories retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *       500:
 *         description: Internal server error
 */
router.get("/categories", publicApiLimiter, getAllCategories);

/**
 * @swagger
 * /categories/{id}:
 *   get:
 *     summary: Get category by ID
 *     description: Retrieve a single category by its ID
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Category ID
 *     responses:
 *       200:
 *         description: Category retrieved successfully
 *       400:
 *         description: Invalid ID
 *       404:
 *         description: Category not found
 */
router.get("/categories/:id", publicApiLimiter, getCategoryById);

/**
 * @swagger
 * /categories:
 *   post:
 *     summary: Create new category
 *     description: Add a new book category (Super Admin only)
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *             properties:
 *               name:
 *                 type: string
 *                 example: Fiction
 *                 description: Category name (must be unique)
 *               description:
 *                 type: string
 *                 example: Fictional books and novels
 *                 description: Category description
 *     responses:
 *       201:
 *         description: Category created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *       400:
 *         description: Validation error
 *       409:
 *         description: Category with this name already exists
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Super Admin only
 */
router.post(
  "/categories",
  isAuthenticated,
  requireRole(["super_admin"]),
  createCategory,
);

/**
 * @swagger
 * /categories/{id}:
 *   patch:
 *     summary: Update category (partial)
 *     description: Partially update an existing category (Super Admin only). Only send fields you want to update.
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Category ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Science Fiction
 *               description:
 *                 type: string
 *                 example: Science fiction and fantasy books
 *           examples:
 *             updateName:
 *               summary: Update only name
 *               value:
 *                 name: "New Category Name"
 *             updateDescription:
 *               summary: Update only description
 *               value:
 *                 description: "New description"
 *             updateBoth:
 *               summary: Update both fields
 *               value:
 *                 name: "Science Fiction"
 *                 description: "Science fiction and fantasy books"
 *     responses:
 *       200:
 *         description: Category updated successfully
 *       400:
 *         description: Validation error or invalid ID
 *       404:
 *         description: Category not found
 *       409:
 *         description: Category with this name already exists
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Super Admin only
 */
router.patch(
  "/categories/:id",
  isAuthenticated,
  requireRole(["super_admin"]),
  updateCategory,
);

/**
 * @swagger
 * /categories/{id}:
 *   delete:
 *     summary: Delete category
 *     description: Remove a category (Super Admin only). Cannot delete if category is used by collections.
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Category ID
 *     responses:
 *       200:
 *         description: Category deleted successfully
 *       400:
 *         description: Invalid ID
 *       404:
 *         description: Category not found
 *       409:
 *         description: Cannot delete - category is being used by collections
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Super Admin only
 */
router.delete(
  "/categories/:id",
  isAuthenticated,
  requireRole(["super_admin"]),
  deleteCategory,
);

export const categoryRoutes = router;
