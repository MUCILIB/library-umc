import { afterAll, expect, it } from "vitest";
import { Pool } from "pg";

const connectionString = process.env.TEST_DATABASE_URL;
if (!connectionString) throw new Error("Explicit TEST_DATABASE_URL required");
const url = new URL(connectionString);
if (!["127.0.0.1", "localhost"].includes(url.hostname) || !url.pathname.endsWith("_audit_test")) {
  throw new Error("Audit tests require an isolated local *_audit_test database");
}
const pool = new Pool({ connectionString });
afterAll(() => pool.end());

it("persists structured audit evidence alongside legacy rows without inventing snapshots", async () => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const structured = await client.query(`INSERT INTO logs
      (action, entity, event_type, outcome, actor_snapshot, target_snapshot, changes, metadata)
      VALUES ('update', 'role', 'role.updated', 'success', $1, $2, $3, $4)
      RETURNING *`, [
      { id: "audit-test-actor", name: "Historical Admin", role: "super_admin" },
      { id: "audit-test-role", type: "role", label: "Librarian" },
      { name: { before: "Assistant", after: "Librarian" } },
      { schemaVersion: 1 },
    ]);
    expect(structured.rows[0].actor_snapshot.name).toBe("Historical Admin");
    expect(structured.rows[0].changes.name).toEqual({ before: "Assistant", after: "Librarian" });
    expect(structured.rows[0].occurred_at).toBeInstanceOf(Date);
    const legacy = await client.query("INSERT INTO logs (action, entity, detail) VALUES ('update', 'Users', 'Legacy event') RETURNING *");
    expect(legacy.rows[0].actor_snapshot).toBeNull();
    expect(legacy.rows[0].detail).toBe("Legacy event");
  } finally {
    await client.query("ROLLBACK");
    client.release();
  }
});
