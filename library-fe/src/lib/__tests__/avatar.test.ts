import { describe, it, expect } from "vitest";
import { getUserAvatar } from "../avatar";

describe("getUserAvatar", () => {
  it("should return the user's custom image if present", () => {
    const user = {
      image: "https://minio.dahono.site/library/profiles/custom-photo.jpg",
      email: "user@umc.ac.id",
      name: "User Name",
    };
    expect(getUserAvatar(user)).toBe("https://minio.dahono.site/library/profiles/custom-photo.jpg");
  });

  it("should return deterministic DiceBear waves SVG when image is missing or empty", () => {
    const userWithNull = { image: null, email: "User.Test@umc.ac.id", name: "User Test" };
    expect(getUserAvatar(userWithNull)).toBe("https://api.dicebear.com/10.x/waves/svg?seed=user.test%40umc.ac.id");

    const userWithEmpty = { image: "   ", email: "User.Test@umc.ac.id", name: "User Test" };
    expect(getUserAvatar(userWithEmpty)).toBe("https://api.dicebear.com/10.x/waves/svg?seed=user.test%40umc.ac.id");
  });

  it("should produce the same avatar given name or id when email is undefined", () => {
    const userWithName = { name: "Ahmad Fauzan" };
    expect(getUserAvatar(userWithName)).toBe("https://api.dicebear.com/10.x/waves/svg?seed=ahmad%20fauzan");

    const userWithId = { id: "user_uuid_123" };
    expect(getUserAvatar(userWithId)).toBe("https://api.dicebear.com/10.x/waves/svg?seed=user_uuid_123");
  });

  it("should fallback gracefully to library-user seed when user is null/undefined", () => {
    expect(getUserAvatar(undefined)).toBe("https://api.dicebear.com/10.x/waves/svg?seed=library-user");
    expect(getUserAvatar(null)).toBe("https://api.dicebear.com/10.x/waves/svg?seed=library-user");
  });
});
