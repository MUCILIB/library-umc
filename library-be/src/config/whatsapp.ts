export interface WhatsAppOtpSendResult {
  delivered: boolean;
  provider: "fonnte" | "wablas" | "webhook" | "simulation";
  simulatedCode?: string;
}

/**
 * Normalizes Indonesian phone numbers to standard MSISDN digits (e.g. 0812... -> 62812...).
 */
export function normalizeIndonesianPhone(rawPhone: string): string {
  const digits = String(rawPhone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("620")) {
    return `62${digits.slice(3)}`;
  }
  if (digits.startsWith("0")) {
    return `62${digits.slice(1)}`;
  }
  if (digits.startsWith("8")) {
    return `62${digits}`;
  }
  return digits;
}

export function maskPhoneNumber(rawPhone: string): string {
  const clean = String(rawPhone || "").trim();
  if (clean.length <= 6) return clean;
  return `${clean.slice(0, 4)}****${clean.slice(-4)}`;
}

async function postJsonWithTimeout(
  url: string,
  headers: Record<string, string>,
  body: Record<string, unknown>,
  timeoutMs = 10000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Sends a WhatsApp OTP message using configured gateway (Fonnte, Wablas, or custom webhook).
 * Falls back cleanly to dev simulation mode when no gateway API key is configured.
 */
export async function sendWhatsAppOtp(
  normalizedPhone: string,
  otpCode: string
): Promise<WhatsAppOtpSendResult> {
  const message =
    `[UPT Perpustakaan UMC] Kode OTP verifikasi nomor telepon Anda adalah *${otpCode}*. ` +
    `Berlaku selama 5 menit. Jangan bagikan kode ini kepada siapa pun.`;

  const gatewayUrl = process.env.WHATSAPP_GATEWAY_URL?.trim();
  const gatewayToken = process.env.WHATSAPP_GATEWAY_TOKEN?.trim();
  const fonnteToken = process.env.FONNTE_TOKEN?.trim();
  const wablasUrl = process.env.WABLAS_API_URL?.trim();
  const wablasToken = process.env.WABLAS_TOKEN?.trim();

  if (gatewayUrl) {
    const headers: Record<string, string> = {};
    if (gatewayToken) {
      headers.Authorization = gatewayToken.startsWith("Bearer ")
        ? gatewayToken
        : `Bearer ${gatewayToken}`;
    }
    const res = await postJsonWithTimeout(gatewayUrl, headers, {
      target: normalizedPhone,
      phone: normalizedPhone,
      message,
      otp: otpCode,
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      throw new Error(`WhatsApp gateway error (${res.status}): ${errText}`);
    }
    return { delivered: true, provider: "webhook" };
  }

  if (fonnteToken) {
    const res = await postJsonWithTimeout(
      "https://api.fonnte.com/send",
      { Authorization: fonnteToken },
      {
        target: normalizedPhone,
        message,
        countryCode: "62",
      }
    );
    const data = (await res.json().catch(() => null)) as { status?: boolean; reason?: string } | null;
    if (!res.ok || data?.status === false) {
      throw new Error(data?.reason || `Fonnte error (${res.status})`);
    }
    return { delivered: true, provider: "fonnte" };
  }

  if (wablasUrl && wablasToken) {
    const res = await postJsonWithTimeout(
      wablasUrl,
      { Authorization: wablasToken },
      {
        phone: normalizedPhone,
        message,
      }
    );
    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      throw new Error(`Wablas error (${res.status}): ${errText}`);
    }
    return { delivered: true, provider: "wablas" };
  }

  // Fallback dev simulation when no WhatsApp gateway credentials are configured
  console.log(
    `[WhatsApp Mock] Kode OTP simulasi untuk ${normalizedPhone}: ${otpCode} (set FONNTE_TOKEN / WHATSAPP_GATEWAY_URL untuk pengiriman asli)`
  );
  return {
    delivered: true,
    provider: "simulation",
    simulatedCode: process.env.NODE_ENV !== "production" ? otpCode : undefined,
  };
}
