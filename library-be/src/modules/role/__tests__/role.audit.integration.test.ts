import { afterAll, beforeAll, expect, it } from "vitest";
import { Pool } from "pg";

const connectionString = process.env.TEST_DATABASE_URL;
if (!connectionString) throw new Error("Explicit TEST_DATABASE_URL required");
const url = new URL(connectionString);
if (!["127.0.0.1", "localhost"].includes(url.hostname) || !url.pathname.endsWith("_audit_test")) throw new Error("Isolated local audit test database required");
process.env.DATABASE_URL = connectionString;
const pool = new Pool({ connectionString });
const actorId = "audit-integration-admin";
let service: typeof import("../service/role.service").roleService;
beforeAll(async () => {
  service = (await import("../service/role.service")).roleService;
  await pool.query(`INSERT INTO users (id,name,email,email_verified,created_at,updated_at,role)
    VALUES ($1,'Historical Admin','audit-integration@example.invalid',true,now(),now(),'super_admin') ON CONFLICT (id) DO NOTHING`, [actorId]);
});
afterAll(async () => {
  await pool.query("DELETE FROM logs WHERE user_id=$1", [actorId]);
  await pool.query("DELETE FROM role_permissions WHERE role_id='audit_test_role'");
  await pool.query("DELETE FROM roles WHERE id='audit_test_role'");
  await pool.query("DELETE FROM users WHERE id=$1", [actorId]);
  await pool.end();
  const { closeDatabase } = await import("../../../db");
  await closeDatabase();
});
it("role update records the actual before and after values", async () => {
  await pool.query("INSERT INTO roles (id,name,is_system) VALUES ('audit_test_update','Audit Test Role',false)");
  try {
  await service.updateRole("audit_test_update", { name: "Audit Renamed" }, { actorId });
  const result = await pool.query("SELECT * FROM logs WHERE entity_id='audit_test_update' AND event_type='role.updated'");
  expect(result.rows).toHaveLength(1);
  expect(result.rows[0].changes.name).toEqual({ before: "Audit Test Role", after: "Audit Renamed" });
  } finally {
    await pool.query("DELETE FROM roles WHERE id='audit_test_update'");
  }
});

it("permission updates record only changes and ignore reordered no-ops", async () => {
  await service.createRole({ name: "Audit Permissions" }, { actorId });
  try {
    const permissions = [{ menuKey: "dashboard", canView: true, canAdd: false, canEdit: false, canDelete: false }];
    await service.updateRolePermissions("audit_permissions", permissions, { actorId });
    await service.updateRolePermissions("audit_permissions", [...permissions].reverse(), { actorId });
    const result = await pool.query("SELECT * FROM logs WHERE entity_id='audit_permissions' AND event_type='role.permissions_updated'");
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].changes).toEqual({ "permissions.dashboard.canView": { before: false, after: true } });
    await expect(service.updateRolePermissions("audit_permissions", [permissions[0], permissions[0]], { actorId })).rejects.toThrow();
  } finally {
    await pool.query("DELETE FROM roles WHERE id='audit_permissions'");
  }
});

it("delete keeps historical target and actor snapshots", async () => {
  await service.createRole({ name: "Audit Deleted" }, { actorId });
  await service.deleteRole("audit_deleted", { actorId });
  await pool.query("UPDATE users SET name='Current Admin' WHERE id=$1", [actorId]);
  const result = await pool.query("SELECT * FROM logs WHERE entity_id='audit_deleted' AND event_type='role.deleted'");
  expect(result.rows).toHaveLength(1);
  expect(result.rows[0].actor_snapshot.name).toBe("Historical Admin");
  expect(result.rows[0].target_snapshot.label).toBe("Audit Deleted");
  await pool.query("UPDATE users SET name='Historical Admin' WHERE id=$1", [actorId]);
});

it("preserves long descriptions and audits explicit clearing to null", async () => {
  const description = "x".repeat(1500);
  await service.createRole({ name: "Audit Long Description", description }, { actorId });
  try {
    await service.updateRole("audit_long_description", { description: null }, { actorId });
    expect((await pool.query("SELECT description FROM roles WHERE id='audit_long_description'")).rows[0].description).toBeNull();
    const events = await pool.query("SELECT changes FROM logs WHERE entity_id='audit_long_description' AND event_type='role.updated'");
    expect(events.rows[0].changes.description).toEqual({ before: description, after: null });
    await service.updateRole("audit_long_description", { description }, { actorId });
    await service.deleteRole("audit_long_description", { actorId });
    expect((await pool.query("SELECT id FROM roles WHERE id='audit_long_description'")).rows).toHaveLength(0);
  } finally {
    await pool.query("DELETE FROM roles WHERE id='audit_long_description'");
  }
});

it("concurrent permission updates preserve committed before values", async () => {
  await service.createRole({ name: "Audit Concurrent" }, { actorId });
  try {
    const row = { menuKey: "dashboard", canView: false, canAdd: false, canEdit: false, canDelete: false };
    await Promise.all([
      service.updateRolePermissions("audit_concurrent", [{ ...row, canView: true }], { actorId }),
      service.updateRolePermissions("audit_concurrent", [row], { actorId }),
    ]);
    const result = await pool.query("SELECT changes FROM logs WHERE entity_id='audit_concurrent' AND event_type='role.permissions_updated' ORDER BY occurred_at");
    const final = await pool.query("SELECT can_view FROM role_permissions WHERE role_id='audit_concurrent' AND menu_key='dashboard'");
    const diffs = result.rows.map(row => row.changes["permissions.dashboard.canView"]);
    expect(diffs[0]).toEqual({ before: false, after: true });
    if (diffs.length === 2) expect(diffs[1]).toEqual({ before: true, after: false });
    expect(final.rows[0].can_view).toBe(diffs.at(-1)!.after);
  } finally {
    await pool.query("DELETE FROM roles WHERE id='audit_concurrent'");
  }
});

it("audit insert failure rolls back role and permissions", async () => {
  await pool.query(`CREATE FUNCTION audit_test_reject() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.entity_id = 'audit_rollback' THEN RAISE EXCEPTION 'test audit unavailable'; END IF; RETURN NEW; END $$`);
  await pool.query("CREATE TRIGGER audit_test_reject BEFORE INSERT ON logs FOR EACH ROW EXECUTE FUNCTION audit_test_reject()");
  try {
    await expect(service.createRole({ name: "Audit Rollback" }, { actorId })).rejects.toThrow();
    expect((await pool.query("SELECT * FROM roles WHERE id='audit_rollback'")).rows).toHaveLength(0);
    expect((await pool.query("SELECT * FROM role_permissions WHERE role_id='audit_rollback'")).rows).toHaveLength(0);
    await pool.query("INSERT INTO roles (id,name,is_system) VALUES ('audit_rollback','Before',false)");
    await pool.query("INSERT INTO role_permissions (role_id,menu_key,can_view) VALUES ('audit_rollback','dashboard',false)");
    await expect(service.updateRole("audit_rollback", { name: "After" }, { actorId })).rejects.toThrow();
    expect((await pool.query("SELECT name FROM roles WHERE id='audit_rollback'")).rows[0].name).toBe("Before");
    await expect(service.updateRolePermissions("audit_rollback", [{ menuKey: "dashboard", canView: true, canAdd: false, canEdit: false, canDelete: false }], { actorId })).rejects.toThrow();
    expect((await pool.query("SELECT can_view FROM role_permissions WHERE role_id='audit_rollback'")).rows[0].can_view).toBe(false);
    await expect(service.deleteRole("audit_rollback", { actorId })).rejects.toThrow();
    expect((await pool.query("SELECT name FROM roles WHERE id='audit_rollback'")).rows[0].name).toBe("Before");
  } finally {
    await pool.query("DELETE FROM roles WHERE id='audit_rollback'");
    await pool.query("DROP TRIGGER audit_test_reject ON logs");
    await pool.query("DROP FUNCTION audit_test_reject()");
  }
});

it("role creation persists exactly one event in the same database", async () => {
  await service.createRole({ name: "Audit Test Role" }, { actorId });
  const result = await pool.query("SELECT * FROM logs WHERE entity_id='audit_test_role' AND user_id=$1", [actorId]);
  expect(result.rows).toHaveLength(1);
  expect(result.rows[0].event_type).toBe("role.created");
  expect(result.rows[0].entity).toBe("role");
  expect(result.rows[0].actor_snapshot.name).toBe("Historical Admin");
});
