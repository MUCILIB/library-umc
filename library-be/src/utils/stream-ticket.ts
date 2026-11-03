import crypto from "crypto";

const TICKET_SECRET =
  process.env.BETTER_AUTH_SECRET || "mucilib-stream-ticket-fallback-secret-2026";
const TICKET_TTL_MS = 60 * 1000; // 60 seconds TTL

export interface StreamTicketPayload {
  userId: string;
  role: string;
  email?: string;
  exp: number;
}

/**
 * Generate a short-lived (60s), single-purpose HMAC signed ticket for PDF streaming / download.
 * Eliminates the need to pass long-lived master session tokens in URL query strings (OWASP CWE-598).
 */
export function generateStreamTicket(user: {
  id: string;
  role?: string;
  email?: string;
}): string {
  const payload: StreamTicketPayload = {
    userId: user.id,
    role: user.role || "member",
    email: user.email,
    exp: Date.now() + TICKET_TTL_MS,
  };

  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", TICKET_SECRET)
    .update(data)
    .digest("base64url");

  return `${data}.${signature}`;
}

/**
 * Verify and decode an ephemeral stream ticket.
 * Returns null if ticket is invalid, altered, or expired.
 */
export function verifyStreamTicket(ticket: string): StreamTicketPayload | null {
  try {
    if (!ticket || typeof ticket !== "string") return null;
    const parts = ticket.split(".");
    if (parts.length !== 2) return null;

    const [data, signature] = parts;
    const expectedSignature = crypto
      .createHmac("sha256", TICKET_SECRET)
      .update(data)
      .digest("base64url");

    if (
      signature.length !== expectedSignature.length ||
      !crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      )
    ) {
      return null;
    }

    const payload: StreamTicketPayload = JSON.parse(
      Buffer.from(data, "base64url").toString("utf8")
    );

    if (Date.now() > payload.exp) {
      return null; // Expired
    }

    return payload;
  } catch {
    return null;
  }
}
