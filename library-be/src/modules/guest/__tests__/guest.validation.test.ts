import { describe, expect, it } from "vitest";
import {
  createGuestSchema,
  updateGuestSchema,
  scanMemberSchema,
  createNonMemberGuestSchema,
  guestFilterQuerySchema
} from "../validation/guest.validation";

describe("Guest Validation Schema", () => {
  it("menerima payload create guest yang valid", () => {
    const result = createGuestSchema.safeParse({
      name: "Budi Santoso",
      identifier: "22010001",
      email: "budi@example.com",
      faculty: "Teknik",
      major: "Informatika",
    });

    expect(result.success).toBe(true);
  });

  it("menolak create guest jika name terlalu pendek", () => {
    const result = createGuestSchema.safeParse({
      name: "Ab",
      identifier: "22010001",
    });

    expect(result.success).toBe(false);
  });

  it("mengizinkan update partial guest", () => {
    const result = updateGuestSchema.safeParse({
      major: "Sistem Informasi",
    });

    expect(result.success).toBe(true);
  });

  describe("scanMemberSchema", () => {
    it("menerima identifier yang valid (NIM / Barcode / Card Number)", () => {
      const res = scanMemberSchema.safeParse({
        memberIdentifier: "202400123"
      });
      expect(res.success).toBe(true);
    });

    it("menolak jika memberIdentifier kosong", () => {
      const res = scanMemberSchema.safeParse({
        memberIdentifier: ""
      });
      expect(res.success).toBe(false);
    });
  });

  describe("createNonMemberGuestSchema", () => {
    it("menerima payload tamu non-member lengkap", () => {
      const res = createNonMemberGuestSchema.safeParse({
        fullName: "Ahmad Dahlan",
        institution: "Universitas Indonesia",
        purpose: "Riset Skripsi dan Membaca Buku",
        phone: "081234567890",
        studyProgramId: 1,
        facultyId: 2
      });
      expect(res.success).toBe(true);
    });

    it("menolak tamu non-member jika nama terlalu pendek", () => {
      const res = createNonMemberGuestSchema.safeParse({
        fullName: "A",
        institution: "UI",
        purpose: "Riset",
        phone: "081234567890"
      });
      expect(res.success).toBe(false);
    });

    it("menolak jika nomor HP terlalu pendek", () => {
      const res = createNonMemberGuestSchema.safeParse({
        fullName: "Ahmad Dahlan",
        institution: "UI",
        purpose: "Riset",
        phone: "1234"
      });
      expect(res.success).toBe(false);
    });
  });

  describe("guestFilterQuerySchema", () => {
    it("mem-parsing filter query dengan benar", () => {
      const res = guestFilterQuerySchema.safeParse({
        page: "2",
        limit: "25",
        studyProgramId: "3",
        facultyId: "1",
        type: "member",
        search: "budi"
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.page).toBe(2);
        expect(res.data.limit).toBe(25);
        expect(res.data.studyProgramId).toBe(3);
        expect(res.data.facultyId).toBe(1);
        expect(res.data.type).toBe("member");
      }
    });
  });
});
