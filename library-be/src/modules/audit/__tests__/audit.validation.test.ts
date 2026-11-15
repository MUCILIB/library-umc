import { expect, it } from "vitest";
import { structuredAuditEventSchema } from "../audit.validation";

const event = {
  eventType: "role.updated", action: "update", entity: "role", entityId: "assistant",
  outcome: "success", actorSnapshot: { id: "admin", name: "Admin", role: "super_admin" },
  targetSnapshot: { id: "assistant", type: "role", label: "Assistant" },
  changes: { name: { before: "Old", after: "Assistant" } }, metadata: { schemaVersion: 1 },
};
it("accepts role evidence and rejects unapproved secret metadata", () => {
  expect(structuredAuditEventSchema.safeParse(event).success).toBe(true);
  expect(structuredAuditEventSchema.safeParse({ ...event, metadata: { schemaVersion: 1, password: "secret" } }).success).toBe(false);
  expect(structuredAuditEventSchema.safeParse({ ...event, changes: { password: { before: null, after: "secret" } } }).success).toBe(false);
});
