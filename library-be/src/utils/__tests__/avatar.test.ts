import { describe, it, expect } from "vitest";
import { generateDefaultAvatar } from "../avatar";

describe("generateDefaultAvatar", () => {
  it("should return DiceBear waves SVG url with encoded lowercase seed", () => {
    const url = generateDefaultAvatar("John.Doe@example.com");
    expect(url).toBe("https://api.dicebear.com/9.x/waves/svg?seed=john.doe%40example.com");
  });

  it("should produce the exact same URL for identical seeds regardless of casing or surrounding whitespace", () => {
    const url1 = generateDefaultAvatar("  Student@umc.ac.id ");
    const url2 = generateDefaultAvatar("student@umc.ac.id");
    expect(url1).toBe(url2);
    expect(url1).toBe("https://api.dicebear.com/9.x/waves/svg?seed=student%40umc.ac.id");
  });

  it("should fallback to a default seed when given empty string or whitespace", () => {
    const url = generateDefaultAvatar("   ");
    expect(url).toBe("https://api.dicebear.com/9.x/waves/svg?seed=library-user");
  });
});
