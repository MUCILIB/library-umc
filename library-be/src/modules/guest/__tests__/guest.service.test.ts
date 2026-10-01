import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock the database
const queryMock = {
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  offset: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockResolvedValue([]),
};

const insertMock = {
  values: vi.fn(),
  returning: vi.fn().mockResolvedValue([]),
};
insertMock.values.mockReturnValue(insertMock);

vi.mock("../../../db", () => ({
  db: {
    select: vi.fn(() => queryMock),
    insert: vi.fn(() => insertMock),
    query: {
      members: { findFirst: vi.fn() },
      Users: { findFirst: vi.fn() },
      faculties: { findFirst: vi.fn() },
      studyPrograms: { findFirst: vi.fn() },
      guestLogs: { findFirst: vi.fn() },
    },
  },
}));

vi.mock("../../../db/schema", () => ({
  guestLogs: {
    id: Symbol("id"),
    name: Symbol("name"),
    identifier: Symbol("identifier"),
    email: Symbol("email"),
    faculty: Symbol("faculty"),
    major: Symbol("major"),
    institution: Symbol("institution"),
    purpose: Symbol("purpose"),
    phone: Symbol("phone"),
    studyProgramId: Symbol("studyProgramId"),
    facultyId: Symbol("facultyId"),
    type: Symbol("type"),
    visitDate: Symbol("visitDate"),
    deletedAt: Symbol("deletedAt"),
    memberId: Symbol("memberId"),
  },
  members: {
    id: Symbol("id"),
    cardNumber: Symbol("cardNumber"),
    nimNidn: Symbol("nimNidn"),
    userId: Symbol("userId"),
    faculty: Symbol("faculty"),
    deletedAt: Symbol("deletedAt"),
  },
  Users: {
    id: Symbol("id"),
    name: Symbol("name"),
    email: Symbol("email"),
    deletedAt: Symbol("deletedAt"),
  },
  faculties: {
    id: Symbol("id"),
    name: Symbol("name"),
    code: Symbol("code"),
    deletedAt: Symbol("deletedAt"),
  },
  studyPrograms: {
    id: Symbol("id"),
    name: Symbol("name"),
    code: Symbol("code"),
    facultyId: Symbol("facultyId"),
    deletedAt: Symbol("deletedAt"),
  },
}));

import { db } from "../../../db";
import { GuestService } from "../service/guest.service";

describe("GuestService - Kiosk Scan & Non-Member", () => {
  let guestService: GuestService;

  beforeEach(() => {
    vi.resetAllMocks();
    insertMock.values.mockReturnValue(insertMock);
    queryMock.from.mockReturnThis();
    queryMock.where.mockReturnThis();
    queryMock.limit.mockReturnThis();
    queryMock.offset.mockReturnThis();
    guestService = new GuestService();
  });

  describe("scanMember", () => {
    it("harus return 404 / 'not_found' jika member tidak ditemukan", async () => {
      vi.mocked(db.query.members.findFirst).mockResolvedValue(undefined as any);
      vi.mocked(db.query.Users.findFirst).mockResolvedValue(undefined as any);

      const res = await guestService.scanMember("NIM_TIDAK_ADA");

      expect(res.success).toBe(false);
      expect(res.code).toBe("not_found");
      expect(res.data).toBeNull();
    });

    it("harus mencatat absensi dan return data member jika member ditemukan", async () => {
      const mockMember = {
        id: "mem-123",
        cardNumber: "UMCLIB-2026-0001",
        nimNidn: "23010001",
        faculty: "Teknik",
        user: {
          name: "Santoso",
          email: "santoso@umc.ac.id",
        },
      };

      vi.mocked(db.query.members.findFirst).mockResolvedValue(mockMember as any);
      vi.mocked(db.query.faculties.findFirst).mockResolvedValue({
        id: 1,
        name: "Teknik",
        code: "FT",
      } as any);
      vi.mocked(db.query.guestLogs.findFirst).mockResolvedValue(null as any);

      const mockNewLog = {
        id: "log-1",
        memberId: "mem-123",
        name: "Santoso",
        major: "Teknik",
        faculty: "Teknik",
        visitDate: new Date(),
      };
      insertMock.returning.mockResolvedValue([mockNewLog]);

      const res = await guestService.scanMember("23010001");

      expect(res.success).toBe(true);
      expect(res.data?.name).toBe("Santoso");
      expect(res.data?.faculty).toBe("Teknik");
      expect(res.data?.alreadyCheckedIn).toBe(false);
    });

    it("harus mengenali jika member sudah check-in hari ini", async () => {
      const mockMember = {
        id: "mem-123",
        cardNumber: "UMCLIB-2026-0001",
        nimNidn: "23010001",
        faculty: "Teknik",
        user: {
          name: "Santoso",
          email: "santoso@umc.ac.id",
        },
      };

      const existingLog = {
        id: "log-existing",
        memberId: "mem-123",
        name: "Santoso",
        major: "Teknik",
        faculty: "Teknik",
        visitDate: new Date(),
      };

      vi.mocked(db.query.members.findFirst).mockResolvedValue(mockMember as any);
      vi.mocked(db.query.guestLogs.findFirst).mockResolvedValue(existingLog as any);

      const res = await guestService.scanMember("23010001");

      expect(res.success).toBe(true);
      expect(res.data?.alreadyCheckedIn).toBe(true);
    });
  });

  describe("createNonMemberGuest", () => {
    it("harus berhasil mencatat tamu non-member", async () => {
      const input = {
        fullName: "Dedi Mizwar",
        institution: "Universitas Padjadjaran",
        purpose: "Penelitian Jurnal",
        phone: "08122334455",
        studyProgramId: 2,
      };

      vi.mocked(db.query.studyPrograms.findFirst).mockResolvedValue({
        id: 2,
        name: "Teknik Sipil",
        facultyId: 1,
        faculty: { name: "Teknik" },
      } as any);

      const inserted = {
        id: "guest-log-1",
        name: input.fullName,
        type: "non-member",
        institution: input.institution,
        purpose: input.purpose,
      };
      insertMock.returning.mockResolvedValue([inserted]);

      const res = await guestService.createNonMemberGuest(input);

      expect(res.success).toBe(true);
      expect(res.data?.name).toBe("Dedi Mizwar");
      expect(res.data?.type).toBe("non-member");
    });
  });
});
