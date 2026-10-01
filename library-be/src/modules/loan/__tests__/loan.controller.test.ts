import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { LoanController } from "../controller/loan.controller";
import { LoanService } from "../service/loan.service";
import { MemberService } from "../../member/service/member.service";

// ============================================================
// SETUP: Express App Palsu untuk Controller Testing
// ============================================================
const app = express();
app.use(express.json());

const loanController = new LoanController();

// Route palsu — kita bypass middleware auth dengan menyuntikkan req.user secara manual
app.post("/loans/request", (req, res) => {
  (req as any).user = { id: "user-student-1", role: "student" };
  loanController.createRequest(req, res, (() => undefined) as any);
});

app.post("/loans/:requestId/approve", (req, res) => {
  (req as any).user = { id: "admin-1", role: "super_admin" };
  loanController.approveLoan(req, res, ((error: unknown) => {
    if (error instanceof Error) {
      return res.status(500).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
    return res.status(500).json({
      success: false,
      message: "Unknown error",
      data: null,
    });
  }) as any);
});

app.post("/loans/:requestId/reject", (req, res) => {
  (req as any).user = { id: "admin-1", role: "super_admin" };
  loanController.rejectLoan(req, res, (() => undefined) as any);
});

app.post("/loans/:loanId/return", (req, res) => {
  (req as any).user = { id: "admin-1", role: "super_admin" };
  loanController.returnLoan(req, res, (() => undefined) as any);
});

app.post("/loans/:id/cancel", (req, res) => {
  (req as any).user = { id: "user-student-1", role: "student" };
  loanController.cancelLoan(req, res, (() => undefined) as any);
});

app.get("/loans", (req, res) => {
  (req as any).user = { id: "admin-1", role: "super_admin" };
  loanController.getAllLoans(req, res, (() => undefined) as any);
});

// Route untuk simulasi request tanpa role admin (untuk test Forbidden)
app.post("/loans/:requestId/approve-noadmin", (req, res) => {
  (req as any).user = { id: "student-1", role: "student" }; // role salah!
  loanController.approveLoan(req, res, (() => undefined) as any);
});

// ============================================================
// TEST SUITE
// ============================================================
describe("LoanController Unit Tests", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================
  // POST /loans/request
  // ==========================================================
  describe("POST /loans/request", () => {
    // 🔴 RED CASE: Validasi Zod gagal — bibliographyId kosong
    it("harus return 400 jika body tidak mengandung bibliographyId", async () => {
      const response = await request(app).post("/loans/request").send({}); // body kosong

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Validation Error");
      expect(response.body.data.fieldErrors).toHaveProperty("bibliographyId");
    });

    // 🟢 GREEN CASE: Request berhasil
    it("harus return 200 ketika request pinjaman berhasil dibuat", async () => {
      const mockLoan = {
        id: "loan-xyz",
        memberId: "member-1",
        itemId: "item-abc",
        status: "pending",
        qrCodeUrl: "mock-qr",
      };

      // Mock MemberService.getBorrowEligibilityByUserId
      vi.spyOn(
        MemberService.prototype,
        "getBorrowEligibilityByUserId",
      ).mockResolvedValueOnce({
        success: true,
        message: "Eligible",
        data: { memberId: "member-1", cardStatus: "active", cardNumber: "UMCLIB-001" },
      } as any);

      // Mock requestLoan agar mengembalikan loan palsu
      vi.spyOn(LoanService.prototype, "requestLoan").mockResolvedValueOnce(
        mockLoan as any,
      );

      const response = await request(app)
        .post("/loans/request")
        .send({ bibliographyId: "biblio-abc" });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe("pending");
    });

    // 🔴 RED CASE: Member profile belum dibuat
    it("harus return 400 jika member profile belum ditemukan", async () => {
      vi.spyOn(
        MemberService.prototype,
        "getBorrowEligibilityByUserId",
      ).mockResolvedValueOnce({
        success: false,
        message: "Profil member belum tersedia",
        data: null,
      } as any);

      const response = await request(app)
        .post("/loans/request")
        .send({ bibliographyId: "biblio-abc" });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("Profil member belum tersedia");
    });
  });

  // ==========================================================
  // POST /loans/:requestId/approve
  // ==========================================================
  describe("POST /loans/:requestId/approve", () => {
    // 🔴 RED CASE: Role bukan admin
    it("harus return 403 jika user bukan super_admin atau staff", async () => {
      const response = await request(app).post(
        "/loans/loan-xyz/approve-noadmin",
      );

      expect(response.status).toBe(403);
      expect(response.body.message).toContain("Admin");
    });

    // 🟢 GREEN CASE: Approve berhasil oleh admin
    it("harus return 200 ketika admin berhasil menyetujui pinjaman", async () => {
      vi.spyOn(LoanService.prototype, "approveLoan").mockResolvedValueOnce({
        message:
          "Peminjaman berhasil disetujui, email notifikasi telah dikirim.",
      });

      const response = await request(app).post("/loans/loan-xyz/approve");

      expect(response.status).toBe(200);
      expect(response.body.message).toContain("diapprove");
    });

    // 🔴 RED CASE: Pinjaman tidak ditemukan → service throw Error
    it("harus return 500 dengan pesan error jika pinjaman tidak ditemukan", async () => {
      vi.spyOn(LoanService.prototype, "approveLoan").mockRejectedValueOnce(
        new Error("Data peminjaman tidak ditemukan"),
      );

      const response = await request(app).post("/loans/loan-tidak-ada/approve");

      expect(response.status).toBe(500);
      expect(response.body.message).toBe("Data peminjaman tidak ditemukan");
    });
  });

  // ==========================================================
  // POST /loans/:loanId/return
  // ==========================================================
  describe("POST /loans/:loanId/return", () => {
    // 🟢 GREEN CASE: Pengembalian tepat waktu
    it("harus return 200 dengan pesan tepat waktu jika tidak terlambat", async () => {
      vi.spyOn(LoanService.prototype, "returnLoan").mockResolvedValueOnce({
        success: true,
        message: "Buku telah berhasil dikembalikan tepat waktu.",
      });

      const response = await request(app).post("/loans/loan-xyz/return");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain("Buku berhasil dikembalikan");
      expect(response.body.data.message).toContain("tepat waktu");
    });

    // ⭐ TEST KRITIS: Pengembalian terlambat harus ada info denda di response
    it("⭐ harus return 200 dengan pesan DENDA jika pengembalian terlambat", async () => {
      vi.spyOn(LoanService.prototype, "returnLoan").mockResolvedValueOnce({
        success: true,
        message:
          "Buku dikembalikan, namun terlambat 3 hari. Dikenakan denda sebesar Rp 1.500.",
      });

      const response = await request(app).post("/loans/loan-xyz/return");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain("Buku berhasil dikembalikan");
      expect(response.body.data.message).toContain("terlambat");
      expect(response.body.data.message).toContain("denda");
    });
  });

  // ==========================================================
  // GET /loans (Admin)
  // ==========================================================
  describe("GET /loans", () => {
    // 🟢 GREEN CASE: Get all loans berhasil
    it("harus return 200 dengan list data pinjaman", async () => {
      const mockLoans = [
        { id: "loan-1", status: "pending" },
        { id: "loan-2", status: "approved" },
      ];

      vi.spyOn(LoanService.prototype, "getAllLoans").mockResolvedValueOnce({
        success: true,
        message: "OK",
        data: mockLoans,
      } as any);

      const response = await request(app).get("/loans");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    // 🔴 RED CASE: Query parameter status tidak valid
    it("harus return 400 jika status query param bukan nilai yang valid", async () => {
      const response = await request(app).get("/loans?status=invalid-status");

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Validation Error");
    });
  });

  // ==========================================================
  // POST /loans/:id/cancel
  // ==========================================================
  describe("POST /loans/:id/cancel", () => {
    it("harus return 200 ketika member berhasil membatalkan pemesanan", async () => {
      vi.spyOn(LoanService.prototype, "getMemberIdByUserId").mockResolvedValueOnce(
        "member-1"
      );
      vi.spyOn(LoanService.prototype, "cancelLoan").mockResolvedValueOnce({
        id: "loan-xyz",
        status: "rejected",
      } as any);

      const response = await request(app).post("/loans/loan-xyz/cancel");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain("berhasil dibatalkan");
    });

    it("harus return 400 jika status peminjaman tidak bisa dibatalkan", async () => {
      vi.spyOn(LoanService.prototype, "getMemberIdByUserId").mockResolvedValueOnce(
        "member-1"
      );
      vi.spyOn(LoanService.prototype, "cancelLoan").mockRejectedValueOnce(
        new Error("Hanya pemesanan dengan status pending yang dapat dibatalkan")
      );

      const response = await request(app).post("/loans/loan-xyz/cancel");

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("status pending");
    });
  });
});
