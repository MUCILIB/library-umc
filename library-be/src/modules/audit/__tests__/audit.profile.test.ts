import { describe, expect, it, vi } from "vitest";

const { select, query } = vi.hoisted(() => {
  const query: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const method of ["from", "leftJoin", "where", "orderBy", "limit"]) query[method] = vi.fn(() => query);
  query.offset = vi.fn(async () => []);
  return { select: vi.fn(() => query), query };
});
vi.mock("../../../db", () => ({ db: { select } }));
import auditService from "../service/audit.service";
import { Users, logs } from "../../../db/schema";

describe("audit profile projection", () => {
  it("selects the current image separately from historical snapshots and retains scope", async () => {
    await auditService.getLogs({ action: "update", entity: "role", limit: 25, offset: 10 });
    expect(select).toHaveBeenCalledWith(expect.objectContaining({
      actorSnapshot: logs.actorSnapshot,
      targetSnapshot: logs.targetSnapshot,
      user: { id: Users.id, name: Users.name, email: Users.email, role: Users.role, image: Users.image },
    }));
    expect(query.leftJoin).toHaveBeenCalledOnce();
    expect(query.where).toHaveBeenCalledWith(expect.anything());
    expect(query.limit).toHaveBeenCalledWith(25);
    expect(query.offset).toHaveBeenCalledWith(10);
  });
});
