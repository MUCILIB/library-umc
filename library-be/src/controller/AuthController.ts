import { Request, Response } from "express";
import { AuthService } from "../service/auth.service";
import { loginSchema } from "../validation";
import { UserService } from "../service/user.service";

const authService = new AuthService();

/**
 * Login Controller - Verify user with Campus API
 */
export const LoginController = async (req: Request, res: Response) => {
  try {
    const validation = loginSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        data: validation.error.flatten(),
      });
    }

    const { email } = validation.data;

    const result = await authService.verifyWithCampus(email);

    if (!result.success) {
      return res.status(401).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("[AuthController] Error in login:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      data: null,
    });
  }
};

/**
 * Get All Users (Admin Only)
 */
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    // Session & Role check sudah ditangani oleh Middleware
    const result = await UserService.getAllUsers();

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: "Failed to get users",
        data: null,
      });
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error("[AuthController] Error getting all users:", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      data: null,
    });
  }
};
