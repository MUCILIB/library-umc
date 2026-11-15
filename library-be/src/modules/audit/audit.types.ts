import type { z } from "zod";
import type { db } from "../../db";
import type { structuredAuditEventSchema } from "./audit.validation";

export type AuditTx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export interface AuditContext {
  actorId: string;
  ipAddress?: string;
  userAgent?: string;
}
export type StructuredAuditEvent = z.infer<typeof structuredAuditEventSchema> & {
  ipAddress?: string;
  userAgent?: string;
};
