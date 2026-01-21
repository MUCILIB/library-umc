import { Request, Response } from "express";
import { AuthService } from "../service/auth.service";
import { loginSchema } from "../validation";

import { UserService } from "../service/user.service";

export const LoginController = async (req: Request, res: Response) => {
  try {
    const validation = loginSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: validation.error.message,
        data: null,
      });
      return;
    }

    const { email } = validation.data;

    const result = await AuthService.verifyWithCampus(email);

    if (!result.success) {
      res.status(401).json(result);
      return;
    }

    res.status(200).json(result);
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      data: null,
    });
  }
};

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    // Session & Role check sudah ditangani oleh Middleware
    const result = await UserService.getAllUsers();

    if (!result.success) {
      res.status(500).json({
        success: false,
        message: "Internal server error",
        data: null,
      });

      return;
    }

    res.status(200).json(result);
  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      data: null,
    });
  }
};
