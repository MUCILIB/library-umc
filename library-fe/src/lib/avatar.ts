export interface AvatarUserLike {
  image?: string | null;
  email?: string | null;
  name?: string | null;
  id?: string | null;
}

/**
 * Returns user image if provided and non-empty.
 * Otherwise returns a deterministic DiceBear Waves SVG avatar URL.
 * The seed is trimmed and lowercased so identical users always get the exact same avatar.
 */
export function getUserAvatar(user?: AvatarUserLike | null): string {
  if (user?.image && typeof user.image === "string" && user.image.trim() !== "") {
    return user.image.trim();
  }

  const rawSeed = user?.email || user?.name || user?.id || "library-user";
  const normalizedSeed = rawSeed.trim().toLowerCase();
  const safeSeed = normalizedSeed.length > 0 ? normalizedSeed : "library-user";

  return `https://api.dicebear.com/10.x/waves/svg?seed=${encodeURIComponent(safeSeed)}`;
}
