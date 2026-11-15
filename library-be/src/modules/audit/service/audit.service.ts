import { db } from "../../../db";
import { logs, Users } from "../../../db/schema";
import { eq, desc, type SQL, and } from "drizzle-orm";
import { structuredAuditEventSchema } from "../audit.validation";
import type { AuditTx, StructuredAuditEvent } from "../audit.types";

interface CreateLogPayload {
  userId?: string;
  action:
    | "create"
    | "update"
    | "delete"
    | "approve"
    | "blacklist"
    | "failed_login"
    | "rate_limited";
  entity:
    | "loan"
    | "item"
    | "fine"
    | "Users"
    | "category"
    | "bibliography"
    | "reservation"
    | "auth"
    | "faculty"
    | "study_program";
  entityId?: string;
  ipAddress?: string;
  userAgent?: string;
  detail?: string;
}

class AuditService {
  async recordEvent(tx: AuditTx, event: StructuredAuditEvent): Promise<void> {
    const { ipAddress, userAgent, ...evidence } = event;
    const validated = structuredAuditEventSchema.parse(evidence);
    await tx.insert(logs).values({
      ...validated,
      userId: validated.actorSnapshot.id,
      ipAddress: ipAddress?.slice(0, 255) || null,
      userAgent: userAgent?.slice(0, 1024) || null,
      detail: `${validated.eventType}: ${validated.targetSnapshot.label}`
        // eslint-disable-next-line no-control-regex
        .replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, 1000),
    });
  }

  /**
   * Log an action to the database.
   * Does NOT throw errors to prevent main flows from failing just because logging failed.
   */
  async createLog(payload: CreateLogPayload): Promise<void> {
    try {
      await db.insert(logs).values({
        userId: payload.userId || null,
        action: payload.action,
        entity: payload.entity,
        entityId: payload.entityId || null,
        ipAddress: payload.ipAddress || null,
        userAgent: payload.userAgent || null,
        detail: payload.detail || null,
      });
    } catch (error) {
      console.error("AuditService Error [Ignored]:", error);
    }
  }

  /**
   * Get logs securely for admin
   */
  async getLogs(
    filters: {
      action?: string;
      entity?: string;
      limit?: number;
      offset?: number;
    } = {},
  ) {
    try {
      const conditions: SQL<unknown>[] = [];
      if (filters.action) {
        conditions.push(
          eq(
            logs.action,
            filters.action as
              | "create"
              | "update"
              | "delete"
              | "approve"
              | "blacklist"
              | "failed_login"
              | "rate_limited",
          ),
        );
      }
      if (filters.entity) {
        conditions.push(
          eq(
            logs.entity,
            filters.entity as
              | "loan"
              | "item"
              | "fine"
              | "Users"
              | "category"
              | "bibliography"
              | "reservation"
              | "auth",
          ),
        );
      }

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      const result = await db
        .select({
          id: logs.id,
          userId: logs.userId,
          action: logs.action,
          entity: logs.entity,
          entityId: logs.entityId,
          ipAddress: logs.ipAddress,
          userAgent: logs.userAgent,
          detail: logs.detail,
          eventType: logs.eventType,
          outcome: logs.outcome,
          actorSnapshot: logs.actorSnapshot,
          targetSnapshot: logs.targetSnapshot,
          changes: logs.changes,
          metadata: logs.metadata,
          occurredAt: logs.occurredAt,
          createdAt: logs.createdAt,
          user: {
            id: Users.id,
            name: Users.name,
            email: Users.email,
            role: Users.role,
            image: Users.image,
          },
        })
        .from(logs)
        .leftJoin(Users, eq(Users.id, logs.userId))
        .where(whereClause)
        .orderBy(desc(logs.createdAt))
        .limit(filters.limit || 100)
        .offset(filters.offset || 0);

      return {
        success: true,
        message: "Berhasil memuat audit logs.",
        data: result,
      };
    } catch (error) {
      console.error("AuditService.getLogs Error:", error);
      throw error;
    }
  }
}

export default new AuditService();
