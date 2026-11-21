import { describe, it, expect } from "vitest";
import type { Request } from "express";
import {
  shouldSkipRateLimit,
  isRateLimitDisabled,
  getAuthLimit,
  getPublicApiLimit,
  getGeneralLimit,
  getStrictLimit,
  getGuestCheckinLimit,
  authLimiter,
  publicApiLimiter,
  generalLimiter,
  strictLimiter,
  guestCheckinLimiter,
} from "../rateLimiter";

describe("rateLimiter configuration", () => {
  it("should export defined limiters", () => {
    expect(authLimiter).toBeDefined();
    expect(publicApiLimiter).toBeDefined();
    expect(generalLimiter).toBeDefined();
    expect(strictLimiter).toBeDefined();
    expect(guestCheckinLimiter).toBeDefined();
  });

  it("should skip rate limit in test environment by default", () => {
    const mockReq = {
      headers: {},
      ip: "127.0.0.1",
    } as unknown as Request;

    // During test runs (NODE_ENV=test), isRateLimitDisabled returns true
    expect(isRateLimitDisabled()).toBe(true);
    expect(shouldSkipRateLimit(mockReq)).toBe(true);
  });

  it("should recognize x-test-bypass-key when configured in production", () => {
    const prevBypass = process.env.TEST_BYPASS_KEY;
    const prevEnv = process.env.NODE_ENV;

    try {
      // Simulate production environment
      (process.env as any).NODE_ENV = "production";
      process.env.TEST_BYPASS_KEY = "super-secret-test-key";

      const validReq = {
        headers: { "x-test-bypass-key": "super-secret-test-key" },
        ip: "192.168.1.1",
      } as unknown as Request;

      const invalidReq = {
        headers: { "x-test-bypass-key": "wrong-key" },
        ip: "192.168.1.1",
      } as unknown as Request;

      expect(isRateLimitDisabled()).toBe(false);
      expect(shouldSkipRateLimit(validReq)).toBe(true);
      expect(shouldSkipRateLimit(invalidReq)).toBe(false);
    } finally {
      process.env.TEST_BYPASS_KEY = prevBypass;
      (process.env as any).NODE_ENV = prevEnv;
    }
  });

  it("should use custom environment limits when provided", () => {
    const prevAuth = process.env.RATE_LIMIT_AUTH_MAX;
    const prevPublic = process.env.RATE_LIMIT_PUBLIC_MAX;
    const prevGeneral = process.env.RATE_LIMIT_GENERAL_MAX;
    const prevStrict = process.env.RATE_LIMIT_STRICT_MAX;
    const prevGuest = process.env.RATE_LIMIT_GUEST_MAX;

    try {
      process.env.RATE_LIMIT_AUTH_MAX = "99";
      process.env.RATE_LIMIT_PUBLIC_MAX = "777";
      process.env.RATE_LIMIT_GENERAL_MAX = "888";
      process.env.RATE_LIMIT_STRICT_MAX = "55";
      process.env.RATE_LIMIT_GUEST_MAX = "66";

      expect(getAuthLimit()).toBe(99);
      expect(getPublicApiLimit()).toBe(777);
      expect(getGeneralLimit()).toBe(888);
      expect(getStrictLimit()).toBe(55);
      expect(getGuestCheckinLimit()).toBe(66);
    } finally {
      process.env.RATE_LIMIT_AUTH_MAX = prevAuth;
      process.env.RATE_LIMIT_PUBLIC_MAX = prevPublic;
      process.env.RATE_LIMIT_GENERAL_MAX = prevGeneral;
      process.env.RATE_LIMIT_STRICT_MAX = prevStrict;
      process.env.RATE_LIMIT_GUEST_MAX = prevGuest;
    }
  });
});
