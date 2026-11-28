import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../../../db";
import { verification } from "../../../db/schema";
import {
  maskPhoneNumber,
  normalizeIndonesianPhone,
  sendWhatsAppOtp,
} from "../../../config/whatsapp";

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const OTP_COOLDOWN_MS = 60 * 1000; // 60 seconds
const MAX_OTP_ATTEMPTS = 5;

interface StoredOtpPayload {
  phone: string;
  displayPhone: string;
  codeHash: string;
  attempts: number;
}

interface StoredVerifiedPayload {
  phone: string;
  verifiedAt: string;
}

export interface RequestPhoneOtpResult {
  success: boolean;
  message: string;
  data: {
    maskedPhone: string;
    normalizedPhone: string;
    expiresInSeconds: number;
    cooldownSeconds: number;
    provider: string;
    devOtpCode?: string;
  } | null;
}

export interface VerifyPhoneOtpResult {
  success: boolean;
  message: string;
  data: {
    normalizedPhone: string;
    displayPhone: string;
    verifiedAt: string;
  } | null;
}

export class PhoneOtpService {
  private getOtpSecret(): string {
    return (
      process.env.BETTER_AUTH_SECRET ||
      process.env.OTP_SECRET ||
      "mucilib-phone-otp-dev-secret"
    );
  }

  private hashOtp(userId: string, normalizedPhone: string, code: string): string {
    return crypto
      .createHmac("sha256", this.getOtpSecret())
      .update(`${userId}:${normalizedPhone}:${code}`)
      .digest("hex");
  }

  private otpIdentifier(userId: string): string {
    return `phone-otp:${userId}`;
  }

  private verifiedIdentifier(userId: string): string {
    return `phone-verified:${userId}`;
  }

  async requestOtp(userId: string, rawPhone: string): Promise<RequestPhoneOtpResult> {
    if (!userId) {
      return { success: false, message: "User ID wajib diisi", data: null };
    }

    const displayPhone = rawPhone.trim();
    const normalizedPhone = normalizeIndonesianPhone(displayPhone);
    if (normalizedPhone.length < 9 || normalizedPhone.length > 15) {
      return {
        success: false,
        message: "Nomor telepon/WhatsApp harus terdiri dari 9 hingga 15 digit angka.",
        data: null,
      };
    }

    const identifier = this.otpIdentifier(userId);
    const existing = await db.query.verification.findFirst({
      where: eq(verification.identifier, identifier),
    });

    const now = Date.now();
    if (existing?.createdAt) {
      const elapsed = now - new Date(existing.createdAt).getTime();
      if (elapsed >= 0 && elapsed < OTP_COOLDOWN_MS) {
        const remaining = Math.ceil((OTP_COOLDOWN_MS - elapsed) / 1000);
        return {
          success: false,
          message: `Tunggu ${remaining} detik sebelum meminta kode OTP baru.`,
          data: null,
        };
      }
    }

    const code = String(crypto.randomInt(100000, 1000000));
    const codeHash = this.hashOtp(userId, normalizedPhone, code);
    const payload: StoredOtpPayload = {
      phone: normalizedPhone,
      displayPhone,
      codeHash,
      attempts: 0,
    };

    const rowId = crypto.randomUUID();
    const createdAt = new Date(now);
    const expiresAt = new Date(now + OTP_TTL_MS);

    await db.delete(verification).where(eq(verification.identifier, identifier));
    await db.insert(verification).values({
      id: rowId,
      identifier,
      value: JSON.stringify(payload),
      expiresAt,
      createdAt,
      updatedAt: createdAt,
    });

    try {
      const sendResult = await sendWhatsAppOtp(normalizedPhone, code);
      return {
        success: true,
        message:
          sendResult.provider === "simulation"
            ? "Kode OTP dibuat (mode simulasi karena gateway WhatsApp belum dikonfigurasi)."
            : "Kode OTP telah dikirim ke nomor WhatsApp Anda.",
        data: {
          maskedPhone: maskPhoneNumber(displayPhone),
          normalizedPhone,
          expiresInSeconds: Math.floor(OTP_TTL_MS / 1000),
          cooldownSeconds: Math.floor(OTP_COOLDOWN_MS / 1000),
          provider: sendResult.provider,
          ...(sendResult.simulatedCode ? { devOtpCode: sendResult.simulatedCode } : {}),
        },
      };
    } catch (err) {
      // Remove pending OTP so user isn't locked behind cooldown after gateway failure
      await db.delete(verification).where(eq(verification.identifier, identifier));
      const msg = err instanceof Error ? err.message : "Gagal mengirim kode OTP WhatsApp";
      return { success: false, message: msg, data: null };
    }
  }

  async verifyOtp(
    userId: string,
    rawPhone: string,
    code: string
  ): Promise<VerifyPhoneOtpResult> {
    if (!userId) {
      return { success: false, message: "User ID wajib diisi", data: null };
    }

    const cleanCode = code.trim();
    if (!/^\d{6}$/.test(cleanCode)) {
      return {
        success: false,
        message: "Kode OTP harus terdiri dari 6 digit angka.",
        data: null,
      };
    }

    const displayPhone = rawPhone.trim();
    const normalizedPhone = normalizeIndonesianPhone(displayPhone);
    const identifier = this.otpIdentifier(userId);

    const record = await db.query.verification.findFirst({
      where: eq(verification.identifier, identifier),
    });

    if (!record) {
      return {
        success: false,
        message: "Kode OTP belum diminta atau sudah kedaluwarsa. Silakan kirim ulang OTP.",
        data: null,
      };
    }

    if (new Date(record.expiresAt).getTime() < Date.now()) {
      await db.delete(verification).where(eq(verification.identifier, identifier));
      return {
        success: false,
        message: "Kode OTP sudah kedaluwarsa. Silakan kirim ulang kode baru.",
        data: null,
      };
    }

    let parsed: StoredOtpPayload;
    try {
      parsed = JSON.parse(record.value) as StoredOtpPayload;
    } catch {
      await db.delete(verification).where(eq(verification.identifier, identifier));
      return {
        success: false,
        message: "Data verifikasi OTP tidak valid. Silakan minta kode baru.",
        data: null,
      };
    }

    if (parsed.phone !== normalizedPhone) {
      return {
        success: false,
        message: "Nomor telepon berubah. Silakan kirim ulang kode OTP ke nomor terbaru.",
        data: null,
      };
    }

    if (parsed.attempts >= MAX_OTP_ATTEMPTS) {
      await db.delete(verification).where(eq(verification.identifier, identifier));
      return {
        success: false,
        message: "Terlalu banyak percobaan OTP yang salah. Silakan minta kode OTP baru.",
        data: null,
      };
    }

    const candidateHash = this.hashOtp(userId, normalizedPhone, cleanCode);
    const expectedBuf = Buffer.from(parsed.codeHash, "hex");
    const candidateBuf = Buffer.from(candidateHash, "hex");
    const isValid =
      expectedBuf.length === candidateBuf.length &&
      crypto.timingSafeEqual(expectedBuf, candidateBuf);

    if (!isValid) {
      const nextAttempts = parsed.attempts + 1;
      if (nextAttempts >= MAX_OTP_ATTEMPTS) {
        await db.delete(verification).where(eq(verification.identifier, identifier));
        return {
          success: false,
          message: "Terlalu banyak percobaan OTP yang salah. Silakan minta kode OTP baru.",
          data: null,
        };
      }

      const updatedPayload: StoredOtpPayload = {
        ...parsed,
        attempts: nextAttempts,
      };
      await db
        .update(verification)
        .set({
          value: JSON.stringify(updatedPayload),
          updatedAt: new Date(),
        })
        .where(eq(verification.id, record.id));

      return {
        success: false,
        message: `Kode OTP tidak sesuai. Sisa percobaan: ${MAX_OTP_ATTEMPTS - nextAttempts}.`,
        data: null,
      };
    }

    // Consume OTP and persist verified phone marker
    await db.delete(verification).where(eq(verification.identifier, identifier));

    const verifiedId = this.verifiedIdentifier(userId);
    const verifiedAt = new Date().toISOString();
    const verifiedPayload: StoredVerifiedPayload = {
      phone: normalizedPhone,
      verifiedAt,
    };

    await db.delete(verification).where(eq(verification.identifier, verifiedId));
    await db.insert(verification).values({
      id: crypto.randomUUID(),
      identifier: verifiedId,
      value: JSON.stringify(verifiedPayload),
      expiresAt: new Date("2099-12-31T23:59:59.000Z"),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return {
      success: true,
      message: "Nomor telepon berhasil diverifikasi.",
      data: {
        normalizedPhone,
        displayPhone: parsed.displayPhone || displayPhone,
        verifiedAt,
      },
    };
  }

  async isPhoneVerified(userId: string, rawPhone?: string | null): Promise<boolean> {
    if (!userId || !rawPhone || !rawPhone.trim()) return false;
    const normalizedPhone = normalizeIndonesianPhone(rawPhone);
    if (!normalizedPhone) return false;

    const record = await db.query.verification.findFirst({
      where: eq(verification.identifier, this.verifiedIdentifier(userId)),
    });
    if (!record) return false;

    try {
      const parsed = JSON.parse(record.value) as StoredVerifiedPayload;
      return parsed.phone === normalizedPhone;
    } catch {
      return false;
    }
  }
}

export const phoneOtpService = new PhoneOtpService();
