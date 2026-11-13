import { createAuthClient } from "better-auth/react";

// better-auth v1.x menggunakan `requestPasswordReset` (bukan `forgetPassword` yang sudah deprecated)
// Method ini sudah built-in di tipe `createAuthClient`, tidak perlu interface manual.
export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_BETTER_AUTH_URL || "http://localhost:4000",
  sessionOptions: {
    refetchOnWindowFocus: false
  }
});