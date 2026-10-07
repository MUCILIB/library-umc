import { type db } from "../../../db";
import { items, bibliographies } from "../../../db/schema";
import { eq, and, sql, isNull } from "drizzle-orm";

/**
 * Lock the bibliography row FOR UPDATE, then sync stock.
 * Must be called inside a transaction.
 *
 * Flow:
 * 1. SELECT bibliography row FOR UPDATE (acquires row-level lock)
 * 2. Count available non-deleted items
 * 3. UPDATE bibliographies.stock
 * 4. Lock is released when transaction commits/rolls back
 */
export async function syncCollectionAvailableStock(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  bibliographyId: string
): Promise<void> {
  // Step 1: Lock the bibliography row FOR UPDATE
  const locked = await tx
    .select({ id: bibliographies.id })
    .from(bibliographies)
    .where(eq(bibliographies.id, bibliographyId))
    .for("update");

  if (!locked || locked.length === 0) {
    throw new Error(`Bibliography ${bibliographyId} not found for stock lock`);
  }

  // Step 2: Count available items
  const [availableCount] = await tx
    .select({ count: sql<number>`count(*)` })
    .from(items)
    .where(
      and(
        eq(items.bibliographyId, bibliographyId),
        eq(items.status, "available"),
        isNull(items.deletedAt)
      )
    );

  // Step 3: Update stock
  await tx
    .update(bibliographies)
    .set({ stock: Number(availableCount?.count ?? 0), updatedAt: new Date() })
    .where(eq(bibliographies.id, bibliographyId));
}
