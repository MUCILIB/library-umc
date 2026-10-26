import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { requireRole, isAuthenticated } from "../../../middlewares/auth.middleware";
import * as authUtils from "../../../utils/auth-utils";

describe("Super Admin & Unauthenticated Auth Flow", () => {
  let app: express.Express;

  beforeEach(() => {
    vi.restoreAllMocks();

    app = express();
    app.use(express.json());

    // Endpoint get-session dengan guard 401 unauthenticated
    app.get("/api/auth/get-session", async (req, res) => {
      const session = await authUtils.getSession(req);
      if (!session) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized - Tidak ada session aktif",
          data: null,
        });
      }
      return res.status(200).json(session);
    });

    // Endpoint protected Super Admin (users/all & role & ban)
    app.get(
      "/api/users/all",
      isAuthenticated,
      requireRole(["super_admin"]),
      (req, res) => {
        res.status(200).json({ success: true, message: "OK", data: [] });
      }
    );

    app.patch(
      "/api/users/:id/role",
      isAuthenticated,
      requireRole(["super_admin"]),
      (req, res) => {
        res.status(200).json({ success: true, message: "Role updated", data: null });
      }
    );

    app.patch(
      "/api/users/:id/ban",
      isAuthenticated,
      requireRole(["super_admin"]),
      (req, res) => {
        res.status(200).json({ success: true, message: "Ban updated", data: null });
      }
    );

    app.post(
      "/api/users/:id/sync-member",
      isAuthenticated,
      requireRole(["super_admin"]),
      (req, res) => {
        res.status(200).json({ success: true, message: "Member synced", data: null });
      }
    );
  });

  describe("Ticket 01: Unauthenticated Guard (No Auth)", () => {
    it("harus merespons 401 saat GET /api/auth/get-session dipanggil tanpa auth", async () => {
      vi.spyOn(authUtils, "getSession").mockResolvedValueOnce(null);

      const res = await request(app).get("/api/auth/get-session");
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Unauthorized");
    });

    it("harus merespons 401 saat PATCH /api/users/:id/role dipanggil tanpa auth", async () => {
      vi.spyOn(authUtils, "getSession").mockResolvedValue(null);

      const res = await request(app).patch("/api/users/user-123/role").send({ role: "lecturer" });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Unauthorized");
    });
  });

  describe("Ticket 02 & 03: SABT Super Admin Access & Role Guard", () => {
    it("harus mengembalikan 403 Forbidden jika akun ber-role 'external' mencoba akses super_admin", async () => {
      const externalSession = {
        session: { id: "s-1", userId: "u-ext" },
        user: { id: "u-ext", email: "external@example.com", role: "external" },
      } as any;
      vi.spyOn(authUtils, "getSession").mockResolvedValue(externalSession);

      const res = await request(app)
        .get("/api/users/all")
        .set("Authorization", "Bearer external-token");

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Forbidden - Anda tidak memiliki akses ke resource ini");
    });

    it("harus sukses 200 saat Super Admin dengan SABT mengakses GET /api/users/all", async () => {
      const superAdminSession = {
        session: { id: "s-admin", userId: "admin-seed-001" },
        user: { id: "admin-seed-001", email: "admin@mucilib.ac.id", role: "super_admin" },
      } as any;
      vi.spyOn(authUtils, "getSession").mockResolvedValue(superAdminSession);

      const res = await request(app)
        .get("/api/users/all")
        .set("Authorization", "Bearer valid-sabt-token");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("harus sukses 200 saat SABT update user role ke student / lecturer / staff", async () => {
      const superAdminSession = {
        session: { id: "s-admin", userId: "admin-seed-001" },
        user: { id: "admin-seed-001", email: "admin@mucilib.ac.id", role: "super_admin" },
      } as any;
      vi.spyOn(authUtils, "getSession").mockResolvedValue(superAdminSession);

      const res = await request(app)
        .patch("/api/users/target-user/role")
        .set("Authorization", "Bearer valid-sabt-token")
        .send({ role: "student" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("harus sukses 200 saat SABT mengakses ban / unban user", async () => {
      const superAdminSession = {
        session: { id: "s-admin", userId: "admin-seed-001" },
        user: { id: "admin-seed-001", email: "admin@mucilib.ac.id", role: "super_admin" },
      } as any;
      vi.spyOn(authUtils, "getSession").mockResolvedValue(superAdminSession);

      const res = await request(app)
        .patch("/api/users/target-user/ban")
        .set("Authorization", "Bearer valid-sabt-token")
        .send({ banned: true, banReason: "Violation" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("harus sukses 200 saat SABT mengakses sync-member user", async () => {
      const superAdminSession = {
        session: { id: "s-admin", userId: "admin-seed-001" },
        user: { id: "admin-seed-001", email: "admin@mucilib.ac.id", role: "super_admin" },
      } as any;
      vi.spyOn(authUtils, "getSession").mockResolvedValue(superAdminSession);

      const res = await request(app)
        .post("/api/users/target-user/sync-member")
        .set("Authorization", "Bearer valid-sabt-token");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
