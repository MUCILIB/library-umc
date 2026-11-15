import { z } from "zod";

const snapshotText = z.string().max(255);
const value = z.union([z.string(), z.boolean(), z.null()]);
export const structuredAuditEventSchema = z.strictObject({
  eventType: z.enum(["role.created", "role.updated", "role.deleted", "role.permissions_updated"]),
  action: z.enum(["create", "update", "delete"]),
  entity: z.literal("role"),
  entityId: snapshotText.min(1),
  outcome: z.literal("success"),
  actorSnapshot: z.strictObject({ id: z.string().min(1), name: snapshotText, role: snapshotText }),
  targetSnapshot: z.strictObject({ id: snapshotText, type: z.literal("role"), label: snapshotText }),
  changes: z.record(z.string().regex(/^(name|description|permissions\.[a-zA-Z0-9_]+\.(canView|canAdd|canEdit|canDelete))$/), z.strictObject({ before: value, after: value })),
  metadata: z.strictObject({ schemaVersion: z.literal(1) }),
});
