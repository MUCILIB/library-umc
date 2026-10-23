/**
 * Generate deterministic DiceBear Waves avatar URL based on a seed (e.g. email/id).
 * The seed is trimmed and lowercased to guarantee identical avatar generation.
 */
export function generateDefaultAvatar(seed?: string | null): string {
  const normalizedSeed = (seed ?? "").trim().toLowerCase();
  const safeSeed = normalizedSeed.length > 0 ? normalizedSeed : "library-user";
  return `https://api.dicebear.com/9.x/waves/svg?seed=${encodeURIComponent(safeSeed)}`;
}
