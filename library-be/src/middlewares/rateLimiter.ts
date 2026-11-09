import rateLimit from "express-rate-limit";
import auditService from "../modules/audit/service/audit.service";

/**
 * Rate Limiter Configuration for Production
 *
 * Security Strategy:
 * 1. Strict limits for authentication endpoints (prevent brute force)
 * 2. Moderate limits for public API endpoints (prevent abuse)
 * 3. Relaxed limits for authenticated users
 *
 * NOTE: express-rate-limit v7+ sudah menangani IPv4-mapped IPv6 bypass
 * (CVE #28) secara internal. Tidak perlu custom keyGenerator.
 * Menggunakan custom keyGenerator yang membaca req.ip secara manual
 * justru akan memunculkan ValidationError: ERR_ERL_KEY_GEN_IPV6.
 */

const isTestOrCI = process.env.NODE_ENV === "test" || Boolean(process.env.CI);

// 1. STRICT - Authentication endpoints (login, register, password reset)
export const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 menit
  limit: 5, // maks 5 request per windowMs
  skip: () => isTestOrCI,
  message: {
    status: 429,
    message:
      "Terlalu banyak percobaan login. Silakan coba lagi dalam 10 menit.",
  },
  standardHeaders: "draft-7", // RateLimit headers IETF draft-7
  legacyHeaders: false, // Nonaktifkan X-RateLimit-*
  skipSuccessfulRequests: false,
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
        "Terlalu banyak percobaan login. Silakan coba lagi dalam 10 menit.",
    });
  },
});

// 2. MODERATE - Public GET endpoints (books, categories, etc)
export const publicApiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 menit
  limit: 300, // maks 100 request per windowMs
  skip: () => isTestOrCI,
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
  limit: 500, // maks 300 request per menit
  skip: () => isTestOrCI,
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
  limit: 10, // maks 10 request per jam
  skip: () => isTestOrCI,
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
  limit: 60, // maks 60 check-in per menit per IP
  skip: () => isTestOrCI,
  message: {
    status: 429,
    message: "Terlalu banyak permintaan presensi. Silakan coba sesaat lagi.",
  },
  standardHeaders: "draft-7",
  legacyHeaders: false,
});
