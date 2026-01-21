import { db } from "../db";
import { Users } from "../db/schema";

export const UserService = {
  // Get All User
  getAllUsers: async () => {
    try {
      const users = await db
        .select({
          id: Users.id,
          name: Users.name,
          email: Users.email,
          image: Users.image,
          role: Users.role,
          banned: Users.banned,
          createdAt: Users.createdAt,
        })
        .from(Users);

      if (!users) {
        return {
          success: false,
          message: "Get All User failed",
          data: null,
        };
      }

      return {
        success: true,
        message: "Get All User Successfully",
        data: users,
      };
    } catch (err) {
      console.error("[UserService] Error getting users:", err);
      return {
        success: false,
        message: "Get All User Failed",
        data: null,
      };
    }
  },
};
