import { API_BASE_URL } from "@/utils/api-config";

export interface AuditLog {
  id: string;
  userId?: string | null;
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
    | "role";
  entityId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  detail?: string | null;
  createdAt?: string | null;
  occurredAt?: string | null;
  eventType?: "role.created" | "role.updated" | "role.deleted" | "role.permissions_updated" | null;
  outcome?: "success" | "failure" | "denied" | null;
  actorSnapshot?: { id: string; name: string; role: string } | null;
  targetSnapshot?: { id: string; type: "role"; label: string } | null;
  changes?: Record<string, { before: string | boolean | null; after: string | boolean | null }> | null;
  metadata?: { schemaVersion: 1 } | null;
  user?: {
    id?: string | null;
    name?: string | null;
    email?: string | null;
    role?: string | null;
  } | null;
}

const jsonOrThrow = async (res: Response) => {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message || "Request failed");
  }
  return data;
};

export const auditLogsService = {
  async getLogs(params?: {
    action?: string;
    entity?: string;
    limit?: number;
    offset?: number;
  }) {
    const query = new URLSearchParams();
    if (params?.action) query.set("action", params.action);
    if (params?.entity) query.set("entity", params.entity);
    if (typeof params?.limit === "number")
      query.set("limit", String(params.limit));
    if (typeof params?.offset === "number")
      query.set("offset", String(params.offset));

    const suffix = query.toString() ? `?${query.toString()}` : "";
    const res = await fetch(`${API_BASE_URL}/api/logs${suffix}`, {
      credentials: "include",
    });

    const data = await jsonOrThrow(res);
    return data.success && Array.isArray(data.data)
      ? (data.data as AuditLog[])
      : [];
  },
};
