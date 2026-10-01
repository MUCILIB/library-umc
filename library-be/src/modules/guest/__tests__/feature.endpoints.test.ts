import { describe, expect, it, vi, beforeEach } from "vitest";

// ============================================================================
// Drizzle Query Builder Mock Helper
// ============================================================================
function createSelectChain(resolvedData: any = []) {
  const chain: any = {
    from: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    offset: vi.fn().mockReturnThis(),
    then: (resolve: any) => Promise.resolve(resolvedData).then(resolve),
  };
  chain.groupBy.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  chain.leftJoin.mockReturnValue(chain);
  chain.from.mockReturnValue(chain);
  chain.orderBy.mockReturnValue(chain);
  chain.limit.mockReturnValue(chain);
  return chain;
}

const insertMock = {
  values: vi.fn(),
  returning: vi.fn().mockResolvedValue([]),
};
insertMock.values.mockReturnValue(insertMock);

vi.mock("../../../db", () => ({
  db: {
    select: vi.fn(),
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
  webTraffic: {
    id: Symbol("id"),
    ipAddress: Symbol("ipAddress"),
    userId: Symbol("userId"),
    path: Symbol("path"),
    visitTimestamp: Symbol("visitTimestamp"),
  },
}));

import { db } from "../../../db";
import { ReportService } from "../../report/service/report.service";
import { GuestService } from "../../guest/service/guest.service";

describe("FEATURE TEST SUITE: Existing & New Endpoints (Pass, Fail, Edge Cases)", () => {
  let reportService: ReportService;
  let guestService: GuestService;

  beforeEach(() => {
    vi.resetAllMocks();
    insertMock.values.mockReturnValue(insertMock);
    reportService = new ReportService();
    guestService = new GuestService();
  });

  // ==========================================================================
  // 1. FITUR BARU: Pemisahan Analitik Pengunjung (Visitor Analytics)
  // Endpoint: GET /api/reports/visitor-analytics
  // ==========================================================================
  describe("Fitur Baru: Visitor Analytics (Physical vs Web)", () => {
    it("[PASS CASE] Harus berhasil mengagregasi data kunjungan fisik dan web pada range 'week'", async () => {
      const todayStr = new Date().toISOString().slice(0, 10);
      const physicalAgg = [{ timeKey: todayStr, count: 5 }];
      const webAgg = [{ timeKey: todayStr, count: 12 }];
      const prodiAgg = [
        { studyProgramName: "Teknik Informatika", count: 3 },
        { studyProgramName: "Ilmu Komunikasi", count: 2 },
      ];

      vi.mocked(db.select)
        .mockReturnValueOnce(createSelectChain(physicalAgg))
        .mockReturnValueOnce(createSelectChain(webAgg))
        .mockReturnValueOnce(createSelectChain(prodiAgg));

      const result = await reportService.getVisitorAnalytics({ range: "week" });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.summary.totalPhysical).toBe(5);
      expect(result.data?.summary.totalWeb).toBe(12);
      expect(result.data?.summary.combinedTotal).toBe(17);
      expect(result.data?.timeline.length).toBe(7); // 7 hari terakhir
      expect(result.data?.studyProgramDistribution.length).toBe(2);
    });

    it("[PASS CASE] Harus berhasil memproses range 'custom' dengan rentang tanggal valid", async () => {
      vi.mocked(db.select)
        .mockReturnValueOnce(createSelectChain([]))
        .mockReturnValueOnce(createSelectChain([]))
        .mockReturnValueOnce(createSelectChain([]));

      const result = await reportService.getVisitorAnalytics({
        range: "custom",
        startDate: "2026-09-01",
        endDate: "2026-09-05",
      });

      expect(result.success).toBe(true);
      expect(result.data?.range).toBe("custom");
      expect(result.data?.summary.combinedTotal).toBe(0);
      expect(result.data?.timeline.length).toBe(5); // 5 hari interval
    });

    it("[FAIL / FALLBACK CASE] Harus fallback aman jika range 'custom' tidak menyediakan parameter tanggal", async () => {
      vi.mocked(db.select)
        .mockReturnValueOnce(createSelectChain([]))
        .mockReturnValueOnce(createSelectChain([]))
        .mockReturnValueOnce(createSelectChain([]));

      const result = await reportService.getVisitorAnalytics({ range: "custom" });

      expect(result.success).toBe(true);
      expect(result.data?.summary.combinedTotal).toBe(0);
      expect(result.data?.timeline).toBeInstanceOf(Array);
    });
  });

  // ==========================================================================
  // 2. FITUR BARU: Kiosk Presensi Mandiri (Scan KTM) & Buku Tamu Fisik
  // Endpoints: POST /api/guests/scan & POST /api/guests/non-member
  // ==========================================================================
  describe("Fitur Baru: Kiosk Scan & Buku Tamu Non-Member", () => {
    it("[PASS CASE] Scan KTM berhasil mencatat presensi anggota aktif", async () => {
      vi.mocked(db.query.members.findFirst).mockResolvedValue({
        id: "mem-01",
        cardNumber: "KTM-2026-001",
        nimNidn: "2021001",
        userId: "user-01",
        faculty: "Teknik",
        deletedAt: null,
        user: { name: "Ahmad Mahasiswa", email: "ahmad@umc.ac.id" },
      } as any);

      vi.mocked(db.query.guestLogs.findFirst).mockResolvedValue(null as any); // Belum presensi hari ini

      insertMock.returning.mockResolvedValueOnce([
        {
          id: "log-01",
          name: "Ahmad Mahasiswa",
          identifier: "2021001",
          visitDate: new Date(),
          faculty: "Teknik",
          type: "member",
        },
      ]);

      const res = await guestService.scanMember("2021001");

      expect(res.success).toBe(true);
      expect(res.data?.name).toBe("Ahmad Mahasiswa");
      expect(res.data?.alreadyCheckedIn).toBe(false);
    });

    it("[PASS CASE] Scan KTM idempotent: jika anggota sudah presensi hari ini, beri notifikasi ramah tanpa duplicate error", async () => {
      vi.mocked(db.query.members.findFirst).mockResolvedValue({
        id: "mem-01",
        cardNumber: "KTM-2026-001",
        nimNidn: "2021001",
        userId: "user-01",
        faculty: "Teknik",
        deletedAt: null,
        user: { name: "Ahmad Mahasiswa", email: "ahmad@umc.ac.id" },
      } as any);

      vi.mocked(db.query.guestLogs.findFirst).mockResolvedValue({
        id: "log-already",
        name: "Ahmad Mahasiswa",
        visitDate: new Date(),
      } as any);

      const res = await guestService.scanMember("2021001");

      expect(res.success).toBe(true);
      expect(res.data?.alreadyCheckedIn).toBe(true);
    });

    it("[FAIL CASE] Scan KTM gagal jika kartu atau NIM tidak terdaftar di sistem", async () => {
      vi.mocked(db.query.members.findFirst).mockResolvedValue(undefined as any);
      vi.mocked(db.query.Users.findFirst).mockResolvedValue(undefined as any);

      const res = await guestService.scanMember("UNKNOWN_NIM_99999");

      expect(res.success).toBe(false);
      expect(res.code).toBe("not_found");
      expect(res.message).toContain("tidak ditemukan");
    });

    it("[FAIL CASE] Scan KTM gagal jika identifier berupa input kosong atau hanya whitespace", async () => {
      const res = await guestService.scanMember("   ");

      expect(res.success).toBe(false);
      expect(res.message).toContain("tidak boleh kosong");
    });

    it("[PASS CASE] Input Tamu Fisik Non-Member berhasil menyimpan data lengkap", async () => {
      insertMock.returning.mockResolvedValueOnce([
        {
          id: "guest-non-01",
          name: "Budi Utomo",
          institution: "Universitas Luar",
          purpose: "Riset Buku",
          phone: "081234567890",
          type: "non-member",
        },
      ]);

      const res = await guestService.createNonMemberGuest({
        fullName: "Budi Utomo",
        institution: "Universitas Luar",
        purpose: "Riset Buku",
        phone: "081234567890",
      });

      expect(res.success).toBe(true);
      expect(res.data?.name).toBe("Budi Utomo");
      expect(res.data?.type).toBe("non-member");
    });

    it("[FAIL CASE] Input Tamu Fisik Non-Member gagal jika database error", async () => {
      insertMock.returning.mockRejectedValueOnce(new Error("DB Connection Loss"));

      const res = await guestService.createNonMemberGuest({
        fullName: "Budi Utomo",
        institution: "Universitas Luar",
        purpose: "Riset",
        phone: "081234567890",
      });

      expect(res.success).toBe(false);
      expect(res.message).toContain("Gagal mencatat absensi");
    });
  });

  // ==========================================================================
  // 3. KEAMANAN & SANITASI: Anti-XSS Payload Filter
  // ==========================================================================
  describe("Keamanan & Sanitasi: Anti-XSS Filter", () => {
    const sanitizeInput = (input: any): any => {
      if (typeof input === "string") {
        return input
          .replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, "")
          .replace(/<\s*script[^>]*>/gi, "")
          .replace(/<\s*\/\s*script\s*>/gi, "")
          .replace(/javascript\s*:/gi, "")
          .trim();
      }
      return input;
    };

    it("[PASS CASE] Payload script XSS pada field input harus dipangkas bersih", () => {
      const maliciousPayload = "<script>alert(1)</script>Judul Buku Bersih";
      const sanitized = sanitizeInput(maliciousPayload);

      expect(sanitized).toBe("Judul Buku Bersih");
      expect(sanitized).not.toContain("<script>");
      expect(sanitized).not.toContain("alert(1)");
    });

    it("[PASS CASE] Payload script XSS terfragmentasi atau tag bersarang harus tetap dinetralkan", () => {
      const maliciousPayload = "<SCRIPT SRC='http://evil.com/xss.js'></SCRIPT>Nama Pengunjung";
      const sanitized = sanitizeInput(maliciousPayload);

      expect(sanitized).toBe("Nama Pengunjung");
      expect(sanitized).not.toContain("evil.com");
    });
  });
});
