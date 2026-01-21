import { Request, Response } from "express";
import {
  upload,
  uploadToCloudinary,
  deleteFromCloudinary,
} from "../utils/upload";

/**
 * Example: Upload single image
 * Route: POST /api/upload
 */
export const uploadImage = [
  upload.single("image"), // Middleware to handle file upload
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Upload to Cloudinary
      const result = await uploadToCloudinary(req.file.buffer, "books");

      return res.status(200).json({
        message: "Image uploaded successfully",
        data: {
          url: result.url,
          publicId: result.publicId,
        },
      });
    } catch (error) {
      console.error("Upload error:", error);
      return res.status(500).json({ error: "Failed to upload image" });
    }
  },
];

/**
 * Example: Upload multiple images
 * Route: POST /api/upload/multiple
 */
export const uploadMultipleImages = [
  upload.array("images", 5), // Max 5 images
  async (req: Request, res: Response) => {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
      }

      // Upload all files to Cloudinary
      const uploadPromises = req.files.map((file) =>
        uploadToCloudinary(file.buffer, "books"),
      );
      const results = await Promise.all(uploadPromises);

      return res.status(200).json({
        message: "Images uploaded successfully",
        data: results,
      });
    } catch (error) {
      console.error("Upload error:", error);
      return res.status(500).json({ error: "Failed to upload images" });
    }
  },
];

/**
 * Example: Delete image
 * Route: DELETE /api/upload/:publicId
 */
export const deleteImage = async (req: Request, res: Response) => {
  try {
    const { publicId } = req.params as { publicId: string };

    if (!publicId) {
      return res.status(400).json({ error: "Public ID is required" });
    }

    // Delete from Cloudinary
    await deleteFromCloudinary(publicId);

    return res.status(200).json({
      message: "Image deleted successfully",
    });
  } catch (error) {
    console.error("Delete error:", error);
    return res.status(500).json({ error: "Failed to delete image" });
  }
};
