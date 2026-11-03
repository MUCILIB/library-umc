import { describe, it, expect, vi } from "vitest";
import { generateStreamTicket, verifyStreamTicket } from "../stream-ticket";

describe("Stream Ticket Utility (SEC-01 Hardening)", () => {
  it("generates and verifies a valid ephemeral stream ticket", () => {
    const user = { id: "user-test-1", role: "student", email: "student@umc.ac.id" };
    const ticket = generateStreamTicket(user);

    expect(typeof ticket).toBe("string");
    expect(ticket.split(".").length).toBe(2);

    const verified = verifyStreamTicket(ticket);
    expect(verified).not.toBeNull();
    expect(verified?.userId).toBe("user-test-1");
    expect(verified?.role).toBe("student");
    expect(verified?.email).toBe("student@umc.ac.id");
    expect(verified?.exp).toBeGreaterThan(Date.now());
  });

  it("rejects a tampered stream ticket signature", () => {
    const user = { id: "user-test-1", role: "student" };
    const ticket = generateStreamTicket(user);
    const [data] = ticket.split(".");
    const tamperedTicket = `${data}.tamperedSignature1234567890`;

    const verified = verifyStreamTicket(tamperedTicket);
    expect(verified).toBeNull();
  });

  it("rejects an expired stream ticket", () => {
    const user = { id: "user-test-1", role: "student" };
    const ticket = generateStreamTicket(user);

    // Fast-forward 61 seconds (TTL is 60s)
    vi.setSystemTime(Date.now() + 65 * 1000);

    const verified = verifyStreamTicket(ticket);
    expect(verified).toBeNull();

    vi.useRealTimers();
  });

  it("gracefully returns null on malformed ticket inputs", () => {
    expect(verifyStreamTicket("")).toBeNull();
    expect(verifyStreamTicket("random-string-without-dot")).toBeNull();
    expect(verifyStreamTicket("a.b.c")).toBeNull();
  });
});
