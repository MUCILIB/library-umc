import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import bibliographyRoutes from "../route/bibliography.route";
import { bibliographyService } from "../service/bibliography.service";
import * as authUtils from "../../../utils/auth-utils";
import { roleService } from "../../role/service/role.service";

describe("Bibliography Auth & Validation Guards", () => {
  let app: express.Express;

  beforeEach(() => {
    vi.restoreAllMocks();
    app = express();
    app.use(express.json());
    app.use("/api", bibliographyRoutes);
    app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      res.status(err.status || 500).json({ success: false, message: err.message });
    });
  });

  describe("1. BUG Check for duplicate bibliographies No Auth (Invalid)", () => {
    it("harus merespons 401 saat GET /api/bibliographies/check-duplicate dipanggil tanpa Auth", async () => {
      vi.spyOn(authUtils, "getSession").mockResolvedValue(null);

      const res = await request(app).get("/api/bibliographies/check-duplicate?isbn=978-602-1234");
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Unauthorized");
    });
  });

  describe("2. Check for duplicate bibliographies ISBN & ISSN", () => {
    it("harus mengizinkan duplikat check jika terotentikasi dengan hak akses view", async () => {
      const staffSession = {
        session: { id: "s-staff", userId: "u-staff" },
        user: { id: "u-staff", email: "staff@mucilib.ac.id", role: "staff" },
      } as any;
      vi.spyOn(authUtils, "getSession").mockResolvedValue(staffSession);
      vi.spyOn(roleService, "getUserPermissions").mockResolvedValue({
        bibliographies: { canView: true, canAdd: true, canEdit: false, canDelete: false },
      } as any);
      vi.spyOn(bibliographyService, "checkDuplicate").mockResolvedValue({
        duplicates: [],
        hasExactMatch: false,
      } as any);

      const res = await request(app)
        .get("/api/bibliographies/check-duplicate?isbn=978-602-1234-56-7&issn=1234-5678")
        .set("Authorization", "Bearer valid-token");

      // Harus lolos auth guard (status 200)
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("duplicates");
      expect(res.body.data).toHaveProperty("hasExactMatch");
    });
  });

  describe("3. BUG Soft Delete Bibliography No Auth (Invalid) (API)", () => {
    it("harus merespons 401 saat DELETE /api/bibliographies/:id dipanggil tanpa Auth", async () => {
      vi.spyOn(authUtils, "getSession").mockResolvedValue(null);

      const res = await request(app).delete("/api/bibliographies/test-id-123");
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Unauthorized");
    });

    it("harus merespons 401 saat DELETE /api/bibliographies (tanpa ID) dipanggil tanpa Auth", async () => {
      vi.spyOn(authUtils, "getSession").mockResolvedValue(null);

      const res = await request(app).delete("/api/bibliographies");
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Unauthorized");
    });

    it("harus merespons 400 saat DELETE /api/bibliographies (tanpa ID) dipanggil oleh super_admin", async () => {
      const adminSession = {
        session: { id: "s-admin", userId: "u-admin" },
        user: { id: "u-admin", email: "admin@mucilib.ac.id", role: "super_admin" },
      } as any;
      vi.spyOn(authUtils, "getSession").mockResolvedValue(adminSession);

      const res = await request(app)
        .delete("/api/bibliographies")
        .set("Authorization", "Bearer admin-token");

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("ID bibliografi diperlukan");
    });
  });

  describe("4. BUG Update Bibliography No Auth (Invalid)", () => {
    it("harus merespons 401 saat PATCH /api/bibliographies/:id dipanggil tanpa Auth", async () => {
      vi.spyOn(authUtils, "getSession").mockResolvedValue(null);

      const res = await request(app)
        .patch("/api/bibliographies/test-id-123")
        .send({ title: "Buku Baru" });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Unauthorized");
    });

    it("harus merespons 401 saat PATCH /api/bibliographies (tanpa ID) dipanggil tanpa Auth", async () => {
      vi.spyOn(authUtils, "getSession").mockResolvedValue(null);

      const res = await request(app)
        .patch("/api/bibliographies")
        .send({ title: "Buku Baru" });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Unauthorized");
    });

    it("harus merespons 400 saat PATCH /api/bibliographies (tanpa ID) dipanggil oleh super_admin", async () => {
      const adminSession = {
        session: { id: "s-admin", userId: "u-admin" },
        user: { id: "u-admin", email: "admin@mucilib.ac.id", role: "super_admin" },
      } as any;
      vi.spyOn(authUtils, "getSession").mockResolvedValue(adminSession);

      const res = await request(app)
        .patch("/api/bibliographies")
        .set("Authorization", "Bearer admin-token")
        .send({ title: "Buku Baru" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("ID bibliografi diperlukan");
    });
  });

  describe("5. BUG Get All Bibliographies No Auth (Invalid)", () => {
    it("harus merespons 401 saat GET /api/bibliographies dipanggil tanpa Auth", async () => {
      vi.spyOn(authUtils, "getSession").mockResolvedValue(null);

      const res = await request(app).get("/api/bibliographies");
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Unauthorized");
    });

    it("harus sukses 200 saat GET /api/bibliographies dipanggil oleh user terotentikasi", async () => {
      const staffSession = {
        session: { id: "s-staff", userId: "u-staff" },
        user: { id: "u-staff", email: "staff@mucilib.ac.id", role: "staff" },
      } as any;
      vi.spyOn(authUtils, "getSession").mockResolvedValue(staffSession);
      vi.spyOn(roleService, "getUserPermissions").mockResolvedValue({
        bibliographies: { canView: true, canAdd: true, canEdit: true, canDelete: true },
      } as any);
      vi.spyOn(bibliographyService, "list").mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      } as any);

      const res = await request(app)
        .get("/api/bibliographies?page=1&limit=10")
        .set("Authorization", "Bearer valid-token");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("items");
    });

    it("harus sukses 200 saat GET /api/bibliographies dipanggil oleh user dengan role external (bukan 403 Forbidden)", async () => {
      const externalSession = {
        session: { id: "s-ext", userId: "u-ext" },
        user: { id: "u-ext", email: "external@gmail.com", role: "external" },
      } as any;
      vi.spyOn(authUtils, "getSession").mockResolvedValue(externalSession);
      vi.spyOn(bibliographyService, "list").mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      } as any);

      const res = await request(app)
        .get("/api/bibliographies?page=1&limit=10")
        .set("Authorization", "Bearer valid-token");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("items");
    });
  });
});
