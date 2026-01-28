import { Request, Response } from "express";
import { MemberService } from "../service/member.service";
import { updateProfileSchema } from "../validation/member.validation";

const memberService = new MemberService();

/**
 * Get Profile milik user yang sedang login (Me)
 */
export const getMyProfile = async (req: Request, res: Response) => {
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

    const userId = sessionUser.id;

    const result = await memberService.getMemberByUserId(userId);

    if (!result.success) {
      return res.status(404).json(result);
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error("[MemberController] Error getting profile:", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      data: null,
    });
  }
};

/**
 * Update Profile milik user yang sedang login (Me)
 */
export const updateMyProfile = async (req: Request, res: Response) => {
  try {
    // Validasi Input Body
    const validation = updateProfileSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        data: validation.error.flatten(),
      });
    }

    //  Ambil userId dari session
    const sessionUser = res.locals.user;

    if (!sessionUser || !sessionUser.id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
        data: null,
      });
    }

    const userId = sessionUser.id;

    const result = await memberService.updateProfile(userId, validation.data);

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error("[MemberController] Error Updating Profile", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      data: null,
    });
  }
};
