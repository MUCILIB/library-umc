import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import { Pool } from "pg";

const connectionString = process.env.TEST_DATABASE_URL;
if (!connectionString) throw new Error("Explicit TEST_DATABASE_URL required");
const url = new URL(connectionString);
if (!["postgres:", "postgresql:"].includes(url.protocol) ||
    !["127.0.0.1", "localhost"].includes(url.hostname) ||
    !/^\/[a-zA-Z0-9_]+_audit_test$/.test(url.pathname)) {
  throw new Error("Audit HTTP tests require an isolated local *_audit_test database");
}
// Set the guarded URL before importing any application module that creates a pool.
process.env.DATABASE_URL = connectionString;
const pool = new Pool({ connectionString });
const prefix = `audit-http-${randomUUID().slice(0, 8)}`;
const adminId = `${prefix}-admin`;
const staffId = `${prefix}-staff`;
const adminToken = `${prefix}-admin-token`;
const staffToken = `${prefix}-staff-token`;
const roleName = `${prefix}-role`;
const roleId = roleName.replace(/-/g, "_");
const legacyId = randomUUID();
const historicalName = `${prefix} Historical Admin`;
const userAgent = `${prefix}/integration`;
const app = express();
let closeDatabase: (() => Promise<void>) | undefined;

beforeAll(async () => {
  const database = await import("../../../db");
  closeDatabase = database.closeDatabase;
  const [{ roleRoutes }, { auditRoutes }, { errorMiddleware }] = await Promise.all([
    import("../../role/route/role.route"),
    import("../route/audit.route"),
    import("../../../middlewares/error.middleware"),
  ]);
  app.use(express.json());
  app.use("/api", roleRoutes, auditRoutes);
  app.use(errorMiddleware);
  for (const [id, name, role, token] of [
    [adminId, historicalName, "super_admin", adminToken],
    [staffId, `${prefix} Staff`, "staff", staffToken],
  ]) {
    await pool.query(`INSERT INTO users
      (id, name, email, email_verified, created_at, updated_at, role)
      VALUES ($1, $2, $3, true, now(), now(), $4)`, [id, name, `${id}@example.invalid`, role]);
    await pool.query(`INSERT INTO session
      (id, user_id, token, expires_at, created_at, updated_at)
      VALUES ($1, $2, $3, now() + interval '1 hour', now(), now())`, [`${id}-session`, id, token]);
  }
}, 30000);

afterAll(async () => {
  try {
    await pool.query("DELETE FROM logs WHERE user_id = ANY($1::text[]) OR id = $2", [[adminId, staffId], legacyId]);
    await pool.query("DELETE FROM role_permissions WHERE role_id = $1", [roleId]);
    await pool.query("DELETE FROM roles WHERE id = $1", [roleId]);
    await pool.query("DELETE FROM session WHERE user_id = ANY($1::text[])", [[adminId, staffId]]);
    await pool.query("DELETE FROM users WHERE id = ANY($1::text[])", [[adminId, staffId]]);
  } finally {
    await Promise.all([pool.end(), closeDatabase?.()]);
  }
}, 30000);

const admin = () => ({ Authorization: `Bearer ${adminToken}`, "User-Agent": userAgent });
const roleEvents = async () => {
  const response = await request(app).get("/api/logs?entity=role&limit=100").set(admin()).expect(200);
  expect(response.body.success).toBe(true);
  expect(Array.isArray(response.body.data)).toBe(true);
  return response.body.data.filter((event: { entityId: string }) => event.entityId === roleId);
};

describe("audit HTTP with real sessions and middleware", () => {
  it("allows only super_admin to read logs: admin 200, staff 403, anonymous 401", async () => {
    await request(app).get("/api/logs").expect(401);
    await request(app).get("/api/logs").set("Authorization", `Bearer ${prefix}-missing`).expect(401);
    const denied = await request(app).get("/api/logs").set("Authorization", `Bearer ${staffToken}`).expect(403);
    expect(denied.body).toMatchObject({ success: false, data: null });
    const allowed = await request(app).get("/api/logs").set(admin()).expect(200);
    expect(allowed.body.success).toBe(true);
    expect(Array.isArray(allowed.body.data)).toBe(true);
  });

  it("audits HTTP role CRUD and permission changes exactly once, preserving snapshots and ignoring no-ops", async () => {
    const created = await request(app).post("/api/roles").set(admin()).send({
      name: roleName, description: "Initial description",
      actorId: staffId, actorSnapshot: { id: staffId, name: "Forged", role: "staff" },
    }).expect(201);
    expect(created.body.data.id).toBe(roleId);
    const creation = (await roleEvents())[0];
    expect(creation).toMatchObject({
      eventType: "role.created", action: "create", entity: "role", entityId: roleId,
      outcome: "success", userId: adminId,
      actorSnapshot: { id: adminId, name: historicalName, role: "super_admin" },
      targetSnapshot: { id: roleId, type: "role", label: roleName },
      metadata: { schemaVersion: 1 }, userAgent,
      changes: { name: { before: null, after: roleName } },
    });
    expect(creation.ipAddress).toBeTruthy();
    expect(Number.isNaN(Date.parse(creation.occurredAt))).toBe(false);
    expect(await roleEvents()).toHaveLength(1);

    const renamed = `${roleName} renamed`;
    const update = { name: renamed, description: "Updated description" };
    await request(app).patch(`/api/roles/${roleId}`).set(admin()).send(update).expect(200);
    await request(app).patch(`/api/roles/${roleId}`).set(admin()).send(update).expect(200);
    let events = await roleEvents();
    expect(events).toHaveLength(2);
    expect(events.find((event: { eventType: string }) => event.eventType === "role.updated")).toMatchObject({
      changes: {
        name: { before: roleName, after: renamed },
        description: { before: "Initial description", after: "Updated description" },
      },
      targetSnapshot: { id: roleId, type: "role", label: renamed },
    });

    const enabled = { menuKey: "dashboard", canView: true, canAdd: false, canEdit: false, canDelete: false };
    const unchanged = { ...enabled, menuKey: "loans", canView: false };
    const permissions = [enabled, unchanged];
    const permissionPath = `/api/roles/${roleId}/permissions`;
    await request(app).put(permissionPath).set(admin()).send({ permissions }).expect(200);
    await request(app).put(permissionPath).set(admin()).send({ permissions: [...permissions].reverse() }).expect(200);
    events = await roleEvents();
    expect(events).toHaveLength(3);
    const permissionEvent = events.find((event: { eventType: string }) => event.eventType === "role.permissions_updated");
    expect(permissionEvent.changes).toEqual({ "permissions.dashboard.canView": { before: false, after: true } });
    expect(permissionEvent.targetSnapshot).toEqual({ id: roleId, type: "role", label: renamed });

    const beforeInvalid = (await pool.query("SELECT * FROM role_permissions WHERE role_id=$1 ORDER BY menu_key", [roleId])).rows;
    for (const invalid of [
      [enabled, enabled], [{ ...enabled, menuKey: "unknown-menu" }],
      [{ ...enabled, canView: "true" }], "not-an-array",
    ]) {
      await request(app).put(permissionPath).set(admin()).send({ permissions: invalid }).expect(400);
    }
    expect((await pool.query("SELECT * FROM role_permissions WHERE role_id=$1 ORDER BY menu_key", [roleId])).rows).toEqual(beforeInvalid);
    expect(await roleEvents()).toHaveLength(3);

    await request(app).delete(`/api/roles/${roleId}`).set(admin()).expect(200);
    expect((await pool.query("SELECT id FROM roles WHERE id=$1", [roleId])).rows).toHaveLength(0);
    expect((await pool.query("SELECT id FROM role_permissions WHERE role_id=$1", [roleId])).rows).toHaveLength(0);
    await pool.query("UPDATE users SET name=$1 WHERE id=$2", [`${prefix} Current Admin`, adminId]);
    events = await roleEvents();
    expect(events).toHaveLength(4);
    expect(events.map((event: { eventType: string }) => event.eventType).sort()).toEqual([
      "role.created", "role.deleted", "role.permissions_updated", "role.updated",
    ]);
    expect(events.find((event: { eventType: string }) => event.eventType === "role.deleted")).toMatchObject({
      action: "delete", targetSnapshot: { id: roleId, type: "role", label: renamed },
      changes: { name: { before: renamed, after: null }, description: { before: "Updated description", after: null } },
    });
    for (const event of events) {
      expect(event.actorSnapshot).toEqual({ id: adminId, name: historicalName, role: "super_admin" });
      expect(event.user.name).toBe(`${prefix} Current Admin`);
      expect(event.outcome).toBe("success");
    }
    expect(events.find((event: { eventType: string }) => event.eventType === "role.created").targetSnapshot.label).toBe(roleName);
  }, 30000);

  it("reads legacy rows with null detail/timestamps without inventing structured evidence", async () => {
    await pool.query(`INSERT INTO logs
      (id, user_id, action, entity, entity_id, detail, created_at, occurred_at)
      VALUES ($1, $2, 'update', 'Users', $3, NULL, NULL, NULL)`, [legacyId, adminId, `${prefix}-legacy`]);
    const response = await request(app).get("/api/logs?entity=Users&limit=100").set(admin()).expect(200);
    expect(Array.isArray(response.body.data)).toBe(true);
    const legacy = response.body.data.find((event: { id: string }) => event.id === legacyId);
    expect(legacy).toMatchObject({
      id: legacyId, action: "update", entity: "Users", entityId: `${prefix}-legacy`,
      detail: null, createdAt: null, occurredAt: null, eventType: null, outcome: null,
      actorSnapshot: null, targetSnapshot: null, changes: null, metadata: null,
    });
  });
});
