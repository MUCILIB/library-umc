// Use VITE_API_URL if valid, or fallback to live production backend API
const envUrl = import.meta.env.VITE_API_URL;
export const API_BASE_URL =
  envUrl || "http://localhost:4000";

