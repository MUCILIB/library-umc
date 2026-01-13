import { Request, Response } from "express";
import { AuthService } from "../service/AuthService";
import { loginSchema } from "../validation";

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
