import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemberService } from "../service/member.service";
import { db } from "../../../db";

vi.mock("../../../db", () => {
  return {
    db: {
      query: {
        members: {
          findFirst: vi.fn(),
          findMany: vi.fn(),
        },
      },
      update: vi.fn(),
      insert: vi.fn(),
    },
  };
});

describe("MemberService - Card Renewal Workflow", () => {
  let memberService: MemberService;

  beforeEach(() => {
    vi.clearAllMocks();
    memberService = new MemberService();
  });

  describe("requestCardRenewal", () => {
    it("gagal jika member tidak ditemukan", async () => {
      (db.query.members.findFirst as any).mockResolvedValueOnce(null);

      const res = await memberService.requestCardRenewal("user-1");
      expect(res.success).toBe(false);
      expect(res.message).toContain("tidak ditemukan");
    });

    it("gagal jika status kartu bukan active atau expired", async () => {
      (db.query.members.findFirst as any).mockResolvedValueOnce({
        id: "mem-1",
        userId: "user-1",
        cardStatus: "pending",
      });

      const res = await memberService.requestCardRenewal("user-1");
      expect(res.success).toBe(false);
      expect(res.message).toContain("Hanya kartu yang aktif atau kedaluwarsa");
    });

    it("gagal jika perpanjangan sudah pending", async () => {
      (db.query.members.findFirst as any).mockResolvedValueOnce({
        id: "mem-1",
        userId: "user-1",
        cardStatus: "active",
        cardRenewalStatus: "pending",
      });

      const res = await memberService.requestCardRenewal("user-1");
      expect(res.success).toBe(false);
      expect(res.message).toContain("masih dalam proses");
    });

    it("sukses mengajukan perpanjangan kartu untuk member aktif", async () => {
      (db.query.members.findFirst as any).mockResolvedValueOnce({
        id: "mem-1",
        userId: "user-1",
        cardStatus: "active",
        cardRenewalStatus: null,
      });

      let updatedData: any = null;
      (db.update as any).mockImplementationOnce(() => ({
        set: vi.fn().mockImplementation((val) => {
          updatedData = val;
          return {
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValueOnce([{ id: "mem-1", ...val }]),
            }),
          };
        }),
      }));

      const res = await memberService.requestCardRenewal("user-1");
      expect(res.success).toBe(true);
      expect(updatedData.cardRenewalStatus).toBe("pending");
      expect(updatedData.cardRenewalRequestedAt).toBeInstanceOf(Date);
    });
  });

  describe("approveCardRenewal", () => {
    it("sukses menyetujui perpanjangan dan memperpanjang masa berlaku", async () => {
      const existingExpiry = new Date();
      existingExpiry.setDate(existingExpiry.getDate() + 5);

      (db.query.members.findFirst as any).mockResolvedValueOnce({
        id: "mem-1",
        cardStatus: "active",
        cardExpiresAt: existingExpiry,
        cardRenewalStatus: "pending",
      });

      let updatedData: any = null;
      (db.update as any).mockImplementationOnce(() => ({
        set: vi.fn().mockImplementation((val) => {
          updatedData = val;
          return {
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValueOnce([{ id: "mem-1", ...val }]),
            }),
          };
        }),
      }));

      const res = await memberService.approveCardRenewal("mem-1", 365);
      expect(res.success).toBe(true);
      expect(updatedData.cardStatus).toBe("active");
      expect(updatedData.cardRenewalStatus).toBe("approved");
      expect(updatedData.cardExpiresAt.getTime()).toBeGreaterThan(existingExpiry.getTime());
    });
  });

  describe("rejectCardRenewal", () => {
    it("sukses menolak perpanjangan kartu dengan alasan", async () => {
      (db.query.members.findFirst as any).mockResolvedValueOnce({
        id: "mem-1",
        cardRenewalStatus: "pending",
      });

      let updatedData: any = null;
      (db.update as any).mockImplementationOnce(() => ({
        set: vi.fn().mockImplementation((val) => {
          updatedData = val;
          return {
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValueOnce([{ id: "mem-1", ...val }]),
            }),
          };
        }),
      }));

      const res = await memberService.rejectCardRenewal("mem-1", "Data tidak valid");
      expect(res.success).toBe(true);
      expect(updatedData.cardRenewalStatus).toBe("rejected");
      expect(updatedData.cardRejectedReason).toBe("Data tidak valid");
    });
  });
});
