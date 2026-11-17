import { describe, expect, it } from "vitest";
import { updateProfileSchema } from "../validation/member.validation";

describe("Member Validation Schema", () => {
  it("menerima update profile yang valid", () => {
    const result = updateProfileSchema.safeParse({
      nimNidn: "22010001",
      faculty: "Teknik",
      phone: "08123456789",
    });

    expect(result.success).toBe(true);
  });

  it("menolak nimNidn terlalu pendek", () => {
    const result = updateProfileSchema.safeParse({
      nimNidn: "123",
    });

    expect(result.success).toBe(false);
  });

  it("menolak karakter terlarang / script tag pada institusi, asal daerah, dan fakultas", () => {
    const xssScript = "<script>alert(1);</script>";
    const res1 = updateProfileSchema.safeParse({ institution: xssScript });
    expect(res1.success).toBe(false);

    const res2 = updateProfileSchema.safeParse({ originRegion: xssScript });
    expect(res2.success).toBe(false);

    const res3 = updateProfileSchema.safeParse({ faculty: "Fakultas <script>" });
    expect(res3.success).toBe(false);
  });

  it("menolak karakter non-telepon pada phone", () => {
    const res = updateProfileSchema.safeParse({
      phone: "08123abc-xyz",
    });
    expect(res.success).toBe(false);
  });

  it("menolak input yang melebihi batas panjang maksimum", () => {
    const res = updateProfileSchema.safeParse({
      institution: "A".repeat(101),
      phone: "0812345678901234567890", // 22 chars
    });
    expect(res.success).toBe(false);
  });
});
