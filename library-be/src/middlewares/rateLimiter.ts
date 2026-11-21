import rateLimit from "express-rate-limit";
import type { Request } from "express";
import auditService from "../modules/audit/service/audit.service";

/**
 * Rate Limiter Configuration for Production & Testing
 *
 * Security Strategy:
 * 1. Strict limits for authentication endpoints (prevent brute force)
 *    - skipSuccessfulRequests: true ensures legitimate users & testers are not blocked on valid logins.
 * 2. Moderate limits for public API endpoints (prevent abuse)
 * 3. Configurable thresholds via environment variables (RATE_LIMIT_*)
 * 4. Header-based / secret-based bypass for automated QA and E2E testing
 *
 * NOTE: express-rate-limit v7+ sudah menangani IPv4-mapped IPv6 bypass
 * (CVE #28) secara internal. Tidak perlu custom keyGenerator.
 */

export const isRateLimitDisabled = (): boolean => {
  return (
    process.env.NODE_ENV === "test" ||
    Boolean(process.env.CI) ||
    process.env.NODE_ENV === "development" ||
    process.env.DISABLE_RATE_LIMIT === "true"
  );
};

const isProd = (): boolean => process.env.NODE_ENV === "production";

/**
 * Determines whether the current request should bypass rate limiting.
 * Skips in test/CI/dev, when DISABLE_RATE_LIMIT=true, or when an authorized bypass key is provided.
 */
export const shouldSkipRateLimit = (req: Request): boolean => {
  if (isRateLimitDisabled()) return true;
  const bypassHeader = req.headers["x-test-bypass-key"];
  const configuredSecret = process.env.TEST_BYPASS_KEY;
  if (configuredSecret && bypassHeader === configuredSecret) {
    return true;
  }
  return false;
};

// Threshold getters: configurable via env, falling back to sane prod/non-prod defaults
export const getAuthLimit = (): number =>
  Number(process.env.RATE_LIMIT_AUTH_MAX) || (isProd() ? 20 : 100);

export const getPublicApiLimit = (): number =>
  Number(process.env.RATE_LIMIT_PUBLIC_MAX) || (isProd() ? 500 : 2000);

export const getGeneralLimit = (): number =>
  Number(process.env.RATE_LIMIT_GENERAL_MAX) || (isProd() ? 600 : 3000);

export const getStrictLimit = (): number =>
  Number(process.env.RATE_LIMIT_STRICT_MAX) || (isProd() ? 30 : 500);

export const getGuestCheckinLimit = (): number =>
  Number(process.env.RATE_LIMIT_GUEST_MAX) || (isProd() ? 120 : 500);

// 1. STRICT - Authentication endpoints (login, register, password reset)
export const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 menit
  limit: getAuthLimit, // 20 failed attempts in prod, 100 in testing/staging (dynamic function)
  skip: shouldSkipRateLimit,
  message: {
    status: 429,
    message:
      "Terlalu banyak percobaan login yang gagal. Silakan coba lagi dalam 10 menit.",
  },
  standardHeaders: "draft-7", // RateLimit headers IETF draft-7
  legacyHeaders: false, // Nonaktifkan X-RateLimit-*
  skipSuccessfulRequests: true, // Login berhasil TIDAK memotong kuota rate limit!
  skipFailedRequests: false,
  handler: (req, res) => {
    const attemptedEmail =
      typeof req.body?.email === "string" ? req.body.email : undefined;

    void auditService.createLog({
      action: "rate_limited",
      entity: "auth",
      ipAddress: req.ip,
      userAgent: req.get("user-agent") || undefined,
      detail: `too_many_attempts${
        attemptedEmail ? `; email=${attemptedEmail}` : ""
      }`,
    });

    return res.status(429).json({
      status: 429,
      message:
        "Terlalu banyak percobaan login yang gagal. Silakan coba lagi dalam 10 menit.",
    });
  },
});

// 2. MODERATE - Public GET endpoints (books, categories, etc)
export const publicApiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 menit
  limit: getPublicApiLimit,
  skip: shouldSkipRateLimit,
  message: {
    status: 429,
    message: "Terlalu banyak permintaan dari IP ini. Silakan coba lagi nanti.",
  },
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});

// 3. GENERAL - All other API endpoints
export const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 menit
  limit: getGeneralLimit,
  skip: shouldSkipRateLimit,
  message: {
    status: 429,
    message:
      "Terlalu banyak permintaan. Silakan coba lagi dalam beberapa menit.",
  },
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

// 4. VERY STRICT - For sensitive operations (delete, admin actions)
export const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 jam
  limit: getStrictLimit,
  skip: shouldSkipRateLimit,
  message: {
    status: 429,
    message: "Terlalu banyak operasi sensitif. Silakan coba lagi dalam 1 jam.",
  },
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

// 5. GUEST CHECK-IN - Visitor presensi & kiosk scanning (prevent attendance flood)
export const guestCheckinLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 menit
  limit: getGuestCheckinLimit,
  skip: shouldSkipRateLimit,
  message: {
    status: 429,
    message: "Terlalu banyak permintaan presensi. Silakan coba sesaat lagi.",
  },
  standardHeaders: "draft-7",
  legacyHeaders: false,
});
