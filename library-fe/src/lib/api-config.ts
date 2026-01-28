// Use VITE_API_URL or fallback.
// IMPORTANT: In production, ensure VITE_API_URL includes "/api" if necessary or is the full backend base URL
export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:4000";

console.log("[Config] API_BASE_URL:", API_BASE_URL);
