import { Router } from "express";
import { isAuthenticated, requireRole } from "../middlewares/auth.middleware";
import { upload } from "../utils/upload";
import {
  createCollection,
  getAllCollections,
  getCollectionById,
  updateCollection,
  deleteCollection,
} from "../controller/CollectionController";
import { publicApiLimiter } from "../middlewares/rateLimiter";

const router = Router();

/**
 * @swagger
 * /collections:
 *   get:
 *     summary: Get all collections
 *     description: Retrieve list of all book collections (Public endpoint with rate limiting)
 *     tags: [Collections]
 *     responses:
 *       200:
 *         description: Collections retrieved successfully
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
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       title:
 *                         type: string
 *                       author:
 *                         type: string
 *                       publisher:
 *                         type: string
 *                       publicationYear:
 *                         type: string
 *                       isbn:
 *                         type: string
 *                       type:
 *                         type: string
 *                         enum: [physical_book, ebook, journal, thesis]
 *                       categoryId:
 *                         type: integer
 *                       description:
 *                         type: string
 *                       image:
 *                         type: string
 *                       category:
 *                         type: object
 *       500:
 *         description: Internal server error
 */
router.get("/collections", publicApiLimiter, getAllCollections);

/**
 * @swagger
 * /collections/{id}:
 *   get:
 *     summary: Get collection by ID
 *     description: Retrieve a single collection by its ID (Public endpoint)
 *     tags: [Collections]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Collection ID
 *     responses:
 *       200:
 *         description: Collection retrieved successfully
 *       404:
 *         description: Collection not found
 *       500:
 *         description: Internal server error
 */
router.get("/collections/:id", publicApiLimiter, getCollectionById);

/**
 * @swagger
 * /collections:
 *   post:
 *     summary: Create new collection
 *     description: Add a new book/collection with cover image upload (Admin/Staff only)
 *     tags: [Collections]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - author
 *               - publisher
 *               - publicationYear
 *               - type
 *               - categoryId
 *             properties:
 *               title:
 *                 type: string
 *                 description: Book title
 *                 example: "Clean Code"
 *               author:
 *                 type: string
 *                 description: Author name
 *                 example: "Robert C. Martin"
 *               publisher:
 *                 type: string
 *                 description: Publisher name
 *                 example: "Prentice Hall"
 *               publicationYear:
 *                 type: string
 *                 description: Year of publication (YYYY)
 *                 example: "2008"
 *               isbn:
 *                 type: string
 *                 description: ISBN number (optional)
 *                 example: "978-0132350884"
 *               type:
 *                 type: string
 *                 enum: [physical_book, ebook, journal, thesis]
 *                 description: Type of collection
 *                 example: "physical_book"
 *               categoryId:
 *                 type: integer
 *                 description: Category ID (must exist)
 *                 example: 1
 *               description:
 *                 type: string
 *                 description: Book description or synopsis
 *                 example: "A handbook of agile software craftsmanship"
 *               cover:
 *                 type: string
 *                 format: binary
 *                 description: Cover image file (jpg, png, webp)
 *     responses:
 *       201:
 *         description: Collection created successfully
 *       400:
 *         description: Validation error, category not found, or ISBN already exists
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin/Staff only
 */
router.post(
  "/collections",
  isAuthenticated,
  requireRole(["super_admin", "staff"]),
  upload.single("cover"),
  createCollection,
);

/**
 * @swagger
 * /collections/{id}:
 *   patch:
 *     summary: Update collection (partial)
 *     description: Partially update an existing collection (Admin/Staff only). Only send fields you want to update. Supports cover image upload.
 *     tags: [Collections]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Collection ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               author:
 *                 type: string
 *               publisher:
 *                 type: string
 *               publicationYear:
 *                 type: string
 *               isbn:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [physical_book, ebook, journal, thesis]
 *               categoryId:
 *                 type: integer
 *               description:
 *                 type: string
 *               cover:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Collection updated successfully
 *       400:
 *         description: Validation error or invalid ID
 *       404:
 *         description: Collection not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin/Staff only
 */
router.patch(
  "/collections/:id",
  isAuthenticated,
  requireRole(["super_admin", "staff"]),
  upload.single("cover"),
  updateCollection,
);

/**
 * @swagger
 * /collections/{id}:
 *   delete:
 *     summary: Delete collection
 *     description: Remove a collection from the system (Admin/Staff only)
 *     tags: [Collections]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Collection ID
 *     responses:
 *       200:
 *         description: Collection deleted successfully
 *       404:
 *         description: Collection not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin/Staff only
 */
router.delete(
  "/collections/:id",
  isAuthenticated,
  requireRole(["super_admin", "staff"]),
  deleteCollection,
);

export const collectionRoutes = router;
