import { beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeIndonesianPhone } from "../../../config/whatsapp";
import {
  requestPhoneOtpSchema,
  verifyPhoneOtpSchema,
} from "../validation/member.validation";

const verificationStore = new Map<string, any>();

vi.mock("../../../db", () => ({
  db: {
    query: {
      verification: {
        findFirst: vi.fn(async () => {
          return Array.from(verificationStore.values())[0] ?? null;
        }),
      },
    },
    delete: vi.fn(() => ({
      where: vi.fn(async () => {
        verificationStore.clear();
      }),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(async (val: any) => {
        verificationStore.set(val.identifier, val);
      }),
    })),
    update: vi.fn(() => ({
      set: vi.fn((updates: any) => ({
        where: vi.fn(async () => {
          const first = Array.from(verificationStore.values())[0];
          if (first) {
            verificationStore.set(first.identifier, { ...first, ...updates });
          }
        }),
      })),
    })),
  },
}));

vi.mock("../../../db/schema", () => ({
  verification: {
    id: Symbol("verification.id"),
    identifier: Symbol("verification.identifier"),
  },
}));

import { db } from "../../../db";
import { PhoneOtpService } from "../service/phone-otp.service";

describe("PhoneOtpService & Validation", () => {
  let service: PhoneOtpService;

  beforeEach(() => {
    vi.clearAllMocks();
    verificationStore.clear();
    service = new PhoneOtpService();
    delete process.env.FONNTE_TOKEN;
    delete process.env.WHATSAPP_GATEWAY_URL;
    delete process.env.WABLAS_API_URL;
    delete process.env.WABLAS_TOKEN;
    process.env.NODE_ENV = "test";
  });

  it("normalizes Indonesian phone formats consistently", () => {
    expect(normalizeIndonesianPhone("081234567890")).toBe("6281234567890");
    expect(normalizeIndonesianPhone("+62 812-3456-7890")).toBe("6281234567890");
    expect(normalizeIndonesianPhone("62081234567890")).toBe("6281234567890");
    expect(normalizeIndonesianPhone("81234567890")).toBe("6281234567890");
  });

  it("validates requestPhoneOtpSchema and verifyPhoneOtpSchema", () => {
    expect(requestPhoneOtpSchema.safeParse({ phone: "081234567890" }).success).toBe(true);
    expect(requestPhoneOtpSchema.safeParse({ phone: "12345" }).success).toBe(false);
    expect(
      verifyPhoneOtpSchema.safeParse({ phone: "081234567890", code: "123456", name: "Budi" })
        .success
    ).toBe(true);
    expect(
      verifyPhoneOtpSchema.safeParse({ phone: "081234567890", code: "12ab56" }).success
    ).toBe(false);
  });

  it("generates hashed OTP in simulation mode, enforces cooldown, and verifies OTP successfully", async () => {
    vi.mocked(db.query.verification.findFirst).mockImplementation(async () => {
      return verificationStore.get("phone-otp:user-1") ?? null;
    });

    const reqRes = await service.requestOtp("user-1", "081234567890");
    expect(reqRes.success).toBe(true);
    expect(reqRes.data?.provider).toBe("simulation");
    expect(reqRes.data?.devOtpCode).toMatch(/^\d{6}$/);

    const storedOtp = verificationStore.get("phone-otp:user-1");
    expect(storedOtp).toBeDefined();
    expect(storedOtp.value).not.toContain(reqRes.data!.devOtpCode!);

    // Cooldown prevents immediate resend
    const cooldownRes = await service.requestOtp("user-1", "081234567890");
    expect(cooldownRes.success).toBe(false);
    expect(cooldownRes.message).toMatch(/Tunggu \d+ detik/);

    // Wrong OTP decrements attempts
    const badVerify = await service.verifyOtp("user-1", "081234567890", "000000");
    expect(badVerify.success).toBe(false);
    expect(badVerify.message).toContain("Sisa percobaan: 4");

    // Correct OTP succeeds & marks phone verified
    const goodVerify = await service.verifyOtp(
      "user-1",
      "081234567890",
      reqRes.data!.devOtpCode!
    );
    expect(goodVerify.success).toBe(true);
    expect(goodVerify.data?.normalizedPhone).toBe("6281234567890");

    vi.mocked(db.query.verification.findFirst).mockImplementation(async () => {
      return verificationStore.get("phone-verified:user-1") ?? null;
    });
    expect(await service.isPhoneVerified("user-1", "+62 812-3456-7890")).toBe(true);
    expect(await service.isPhoneVerified("user-1", "089999999999")).toBe(false);
  });

  it("rejects expired OTP codes", async () => {
    verificationStore.set("phone-otp:user-exp", {
      id: "v-1",
      identifier: "phone-otp:user-exp",
      value: JSON.stringify({
        phone: "6281234567890",
        displayPhone: "081234567890",
        codeHash: "abc",
        attempts: 0,
      }),
      expiresAt: new Date(Date.now() - 10_000),
      createdAt: new Date(Date.now() - 120_000),
    });

    vi.mocked(db.query.verification.findFirst).mockResolvedValueOnce(
      verificationStore.get("phone-otp:user-exp")
    );

    const res = await service.verifyOtp("user-exp", "081234567890", "123456");
    expect(res.success).toBe(false);
    expect(res.message).toContain("kedaluwarsa");
  });
});
