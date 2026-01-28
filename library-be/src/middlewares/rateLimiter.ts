import rateLimit from "express-rate-limit";

/**
 * Rate Limiter Configuration for Production
 *
 * Security Strategy:
 * 1. Strict limits for authentication endpoints (prevent brute force)
 * 2. Moderate limits for public API endpoints (prevent abuse)
 * 3. Relaxed limits for authenticated users
 */

// 1. STRICT - Authentication endpoints (login, register, password reset)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per windowMs
  message: {
    status: 429,
    message:
      "Terlalu banyak percobaan login. Silakan coba lagi dalam 15 menit.",
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Store in memory (for single server) - upgrade to Redis for production cluster
  skipSuccessfulRequests: false, // Count all requests
  skipFailedRequests: false,
});

// 2. MODERATE - Public GET endpoints (books, categories, etc)
export const publicApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per windowMs
  message: {
    status: 429,
    message: "Terlalu banyak permintaan dari IP ini. Silakan coba lagi nanti.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip successful requests for read operations (optional)
  skipSuccessfulRequests: false,
});

// 3. GENERAL - All other API endpoints
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // 200 requests per windowMs
  message: {
    status: 429,
    message:
      "Terlalu banyak permintaan. Silakan coba lagi dalam beberapa menit.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 4. VERY STRICT - For sensitive operations (delete, admin actions)
export const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 requests per hour
  message: {
    status: 429,
    message: "Terlalu banyak operasi sensitif. Silakan coba lagi dalam 1 jam.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
