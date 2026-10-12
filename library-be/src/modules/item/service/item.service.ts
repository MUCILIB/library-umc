import { db } from "../../../db";
import { items, bibliographies, locations, logs, loans } from "../../../db/schema";
import { eq, and, like, ilike, or, isNull, sql } from "drizzle-orm";
import type { CreateItemData, BulkCreateItemData, UpdateItemData } from "../validation/item.validation";
import { syncCollectionAvailableStock } from "../../shared/utils/stock-sync";
import crypto from "crypto";

export class ItemService {

  async getAllItems(bibliographyId?: string, page: number = 1, limit: number = 20, q?: string) {
    const skip = (page - 1) * limit;
    let whereClause: any = isNull(items.deletedAt);
    
    if (bibliographyId) {
      whereClause = and(eq(items.bibliographyId, bibliographyId), isNull(items.deletedAt));
    }
    
    if (q) {
      const searchPattern = `%${q}%`;
      whereClause = and(
        whereClause,
        or(
          ilike(items.itemCode, searchPattern),
          ilike(items.inventoryCode, searchPattern),
          sql`${items.bibliographyId} IN (
            SELECT id FROM bibliographies 
            WHERE title ILIKE ${searchPattern} AND deleted_at IS NULL
          )`
        )
      );
    }

    const [data, total] = await Promise.all([
      db.query.items.findMany({
        where: whereClause,
        with: { bibliography: true, location: true, vendor: true, collectionType: true },
        orderBy: (items, { desc }) => [desc(items.createdAt)],
        offset: skip,
        limit,
      }),
      db.select({ count: sql<number>`count(*)` }).from(items).where(whereClause),
    ]);
    const totalCount = Number(total[0]?.count ?? 0);
    return {
      success: true,
      message: "Items retrieved",
      data,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  async getItemById(id: string) {
    const result = await db.query.items.findFirst({
      where: and(eq(items.id, id), isNull(items.deletedAt)),
      with: { bibliography: true, location: true, vendor: true, collectionType: true },
    });
    if (!result) return { success: false, message: "Item not found", data: null };
    return { success: true, message: "Item retrieved", data: result };
  }

  async getItemByBarcode(barcode: string) {
    const result = await db.query.items.findFirst({
      where: and(eq(items.itemCode, barcode), isNull(items.deletedAt)),
      with: { bibliography: true, location: true },
    });
    if (!result) return { success: false, message: "Item not found", data: null };
    return { success: true, message: "Item retrieved", data: result };
  }

  async resolveByQrToken(token: string) {
    const item = await db.query.items.findFirst({
      where: and(eq(items.qrToken, token), isNull(items.deletedAt), isNull(items.qrRevokedAt)),
      with: {
        bibliography: { with: { bibliographyAuthors: { with: { author: true } }, bibliographySubjects: { with: { subject: true } } } },
        location: true,
      },
    });
    if (!item) return null;
    return item;
  }

  async lookupItem(param: { itemCode?: string; token?: string; intent?: string }) {
    const rawVal = (param.itemCode || param.token || "").trim();
    if (!rawVal) {
      return { success: false, message: "Kode item atau QR token wajib diisi", data: null };
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawVal);

    // 1. Cari item berdasarkan itemCode, inventoryCode, qrToken, atau id
    let item = await db.query.items.findFirst({
      where: and(
        isNull(items.deletedAt),
        or(
          eq(items.itemCode, rawVal),
          eq(items.inventoryCode, rawVal),
          eq(items.qrToken, rawVal),
          isUuid ? eq(items.id, rawVal) : undefined
        )
      ),
      with: {
        bibliography: true,
        location: true,
      },
    });

    // 2. Jika belum ditemukan dan berupa UUID, mungkin ini bibliographyId
    if (!item && isUuid) {
      item = await db.query.items.findFirst({
        where: and(
          eq(items.bibliographyId, rawVal),
          isNull(items.deletedAt)
        ),
        with: {
          bibliography: true,
          location: true,
        },
      });
    }

    // 3. Jika belum ditemukan, periksa apakah rawVal adalah verificationToken di tabel loans
    let activeLoanData: any = null;
    if (!item) {
      const loanByToken = await db.query.loans.findFirst({
        where: and(
          eq(loans.verificationToken, rawVal),
          isNull(loans.deletedAt)
        ),
        with: {
          item: {
            with: {
              bibliography: true,
              location: true,
            }
          },
          member: {
            with: {
              user: true,
            }
          }
        }
      });

      if (loanByToken?.item) {
        item = loanByToken.item as any;
        activeLoanData = {
          id: loanByToken.id,
          loanCode: loanByToken.id.slice(0, 8).toUpperCase(),
          memberId: loanByToken.memberId,
          memberName: loanByToken.member?.user?.name || "-",
          itemId: loanByToken.itemId,
          status: loanByToken.status,
          loanDate: loanByToken.loanDate,
          dueDate: loanByToken.dueDate,
          returnDate: loanByToken.returnDate,
        };
      }
    }

    if (!item) {
      return { success: false, message: `Item dengan kode/token "${rawVal}" tidak ditemukan`, data: null };
    }

    // 4. Cari active loan jika belum ditemukan
    if (!activeLoanData) {
      const activeLoan = await db.query.loans.findFirst({
        where: and(
          eq(loans.itemId, item.id),
          sql`${loans.status} IN ('approved', 'extended', 'pending')`,
          isNull(loans.deletedAt)
        ),
        with: {
          member: {
            with: {
              user: true,
            }
          }
        },
        orderBy: (loans, { desc }) => [desc(loans.createdAt)],
      });

      if (activeLoan) {
        activeLoanData = {
          id: activeLoan.id,
          loanCode: activeLoan.id.slice(0, 8).toUpperCase(),
          memberId: activeLoan.memberId,
          memberName: activeLoan.member?.user?.name || "-",
          itemId: activeLoan.itemId,
          status: activeLoan.status,
          loanDate: activeLoan.loanDate,
          dueDate: activeLoan.dueDate,
          returnDate: activeLoan.returnDate,
        };
      }
    }

    // 5. Tentukan allowedActions
    const allowedActions: string[] = [];
    const isLoaned = item.status === "loaned" || (activeLoanData && ["approved", "extended"].includes(activeLoanData.status));

    if (item.status === "available" && !isLoaned) {
      allowedActions.push("loan");
    } else if (isLoaned) {
      allowedActions.push("return");
    }

    // Format location string
    let locationStr = "-";
    if (item.location) {
      const parts = [
        item.location.room,
        item.location.rack ? `Rak ${item.location.rack}` : null,
        item.location.shelf ? `Baris ${item.location.shelf}` : null
      ].filter(Boolean);
      locationStr = parts.join(" - ") || "-";
    } else if (item.callNumber) {
      locationStr = item.callNumber;
    }

    const responsePayload = {
      item: {
        id: item.id,
        itemCode: item.itemCode,
        title: item.bibliography?.title || "Tanpa Judul",
        status: item.status,
        location: locationStr,
        bibliographyId: item.bibliographyId,
      },
      activeLoan: activeLoanData,
      allowedActions,
    };

    return {
      success: true,
      message: "Item ditemukan",
      data: responsePayload,
    };
  }

  private generateQrToken(): string {
    return crypto.randomBytes(20).toString("hex");
  }

  private async generateItemCode(bibliographyId: string): Promise<string> {
    const bib = await db.query.bibliographies.findFirst({ where: eq(bibliographies.id, bibliographyId) });
    if (!bib) throw new Error("Bibliography not found");
    const title = bib.title.replace(/[^a-zA-Z]/g, "").toLowerCase();
    const prefix = title.slice(0, 2).padEnd(2, "x");
    const suffix = title.slice(-2).padEnd(2, "x");

    const existingCodes = await db.query.items.findMany({
      where: and(eq(items.bibliographyId, bibliographyId), isNull(items.deletedAt)),
      columns: { itemCode: true },
    });

    const used = new Set(existingCodes.map((i) => i.itemCode));
    for (let n = 1; n <= 999; n++) {
      const code = `${prefix}${String(n).padStart(3, "0")}${suffix}`;
      if (!used.has(code)) return code;
    }
    throw new Error("No available item code");
  }

  async generateItemCodePreview(bibliographyId: string): Promise<string> {
    return this.generateItemCode(bibliographyId);
  }

  async createItem(data: CreateItemData) {
    const bib = await db.query.bibliographies.findFirst({ where: eq(bibliographies.id, data.bibliographyId) });
    if (!bib) return { success: false, message: "Bibliography not found" };

    const userProvidedCode = data.itemCode;
    let itemCode: string;
    if (!userProvidedCode) {
      itemCode = await this.generateItemCode(data.bibliographyId);
    } else {
      const existing = await db.query.items.findFirst({
        where: and(eq(items.itemCode, userProvidedCode), isNull(items.deletedAt)),
      });
      if (existing) return { success: false, message: "item_code already exists" };
      itemCode = userProvidedCode;
    }

    const location = await db.query.locations.findFirst({ where: eq(locations.id, data.locationId) });
    if (!location) return { success: false, message: "Location not found" };

    let result: any;
    try {
      result = await db.transaction(async (tx) => {
        const insertData: any = {
          ...data,
          itemCode,
          price: data.price != null ? String(data.price) : null,
          qrToken: this.generateQrToken(),
          qrVersion: 1,
          qrGeneratedAt: new Date(),
        };
        const [newItem] = await tx.insert(items).values(insertData).returning();
        await syncCollectionAvailableStock(tx, data.bibliographyId);
        return newItem;
      });
    } catch (err: any) {
      // Handle unique constraint violations gracefully
      if (err?.cause?.code === '23505' || err?.code === '23505') {
        const detail = err?.cause?.detail || err?.detail || '';
        if (detail.includes('item_code') || detail.includes('item_item_code')) {
          return { success: false, message: "item_code already exists" };
        }
        if (detail.includes('qr_token') || detail.includes('item_qr_token')) {
          return { success: false, message: "QR token collision, please retry" };
        }
      }
      throw err;
    }

    return { success: true, message: "Item created", data: result };
  }

  async bulkCreate(bibliographyId: string, data: BulkCreateItemData) {
    const bib = await db.query.bibliographies.findFirst({ where: eq(bibliographies.id, bibliographyId) });
    if (!bib) return { success: false, message: "Bibliography not found" };

    const createdItems: any[] = [];
    const errors: { itemCode: string; error: string }[] = [];

    await db.transaction(async (tx) => {
      for (const itemData of data.items) {
        try {
          const existing = await tx.query.items.findFirst({
            where: and(eq(items.itemCode, itemData.itemCode), isNull(items.deletedAt)),
          });
          if (existing) { errors.push({ itemCode: itemData.itemCode, error: "Duplicate item_code" }); continue; }

          const locId = itemData.locationId || data.defaults?.locationId || 1;
          const [newItem] = await tx.insert(items).values({
            bibliographyId,
            itemCode: itemData.itemCode,
            inventoryCode: itemData.inventoryCode || null,
            callNumber: itemData.callNumber || null,
            locationId: locId,
            source: data.defaults?.source || null,
            priceCurrency: data.defaults?.priceCurrency || "IDR",
            collectionTypeId: data.defaults?.collectionTypeId || null,
            status: "available",
            qrToken: this.generateQrToken(),
            qrVersion: 1,
            qrGeneratedAt: new Date(),
          }).returning();
          createdItems.push(newItem);
        } catch (err) {
          errors.push({ itemCode: itemData.itemCode, error: err instanceof Error ? err.message : "Unknown error" });
        }
      }
      await syncCollectionAvailableStock(tx, bibliographyId);
    });

    return { success: true, message: `Created ${createdItems.length} items`, data: { created: createdItems.length, items: createdItems, errors } };
  }

  async updateItem(id: string, data: UpdateItemData) {
    const existingItem = await db.query.items.findFirst({
      where: and(eq(items.id, id), isNull(items.deletedAt)),
    });
    if (!existingItem) return { success: false, message: "Item not found" };

    // Validasi duplikasi itemCode jika diubah
    if (data.itemCode && data.itemCode !== existingItem.itemCode) {
      const duplicate = await db.query.items.findFirst({
        where: and(eq(items.itemCode, data.itemCode), isNull(items.deletedAt)),
      });
      if (duplicate) {
        return { success: false, message: "Kode item sudah digunakan oleh item lain" };
      }
    }

    const result = await db.transaction(async (tx) => {
      const updateData: any = { ...data, updatedAt: new Date() };
      if (data.price != null) updateData.price = String(data.price);
      const [updated] = await tx.update(items).set(updateData).where(eq(items.id, id)).returning();
      
      // Sinkronisasi stok koleksi agar tetap sinkron jika status item berubah
      await syncCollectionAvailableStock(tx, existingItem.bibliographyId);
      
      return updated;
    });

    return { success: true, message: "Item updated", data: result };
  }

  async updateItemStatus(id: string, status: string) {
    const existingItem = await db.query.items.findFirst({
      where: and(eq(items.id, id), isNull(items.deletedAt)),
    });
    if (!existingItem) return { success: false, message: "Item not found" };

    const result = await db.transaction(async (tx) => {
      const [updated] = await tx.update(items).set({ status: status as any, updatedAt: new Date() }).where(eq(items.id, id)).returning();
      await syncCollectionAvailableStock(tx, existingItem.bibliographyId);
      return updated;
    });

    return { success: true, message: "Status updated", data: result };
  }

  async updateItemLocation(id: string, locationId: number) {
    const existingItem = await db.query.items.findFirst({
      where: and(eq(items.id, id), isNull(items.deletedAt)),
    });
    if (!existingItem) return { success: false, message: "Item not found" };

    const [updated] = await db.update(items).set({ locationId, updatedAt: new Date() }).where(eq(items.id, id)).returning();
    return { success: true, message: "Location updated", data: updated };
  }

  async deleteItem(id: string) {
    const existingItem = await db.query.items.findFirst({
      where: and(eq(items.id, id), isNull(items.deletedAt)),
    });
    if (!existingItem) return { success: false, message: "Item not found" };
    if (existingItem.status === "loaned") return { success: false, message: "Cannot delete loaned item" };

    await db.transaction(async (tx) => {
      await tx.update(items).set({ deletedAt: new Date(), status: "lost" }).where(eq(items.id, id));
      await syncCollectionAvailableStock(tx, existingItem.bibliographyId);
    });

    return { success: true, message: "Item deleted" };
  }

  async regenerateQr(id: string, userId?: string) {
    const existingItem = await db.query.items.findFirst({
      where: and(eq(items.id, id), isNull(items.deletedAt)),
    });
    if (!existingItem) return { success: false, message: "Item not found" };

    const oldVersion = existingItem.qrVersion || 0;
    const newVersion = oldVersion + 1;
    const newToken = this.generateQrToken();

    await db.transaction(async (tx) => {
      const [updated] = await tx.update(items).set({
        qrToken: newToken,
        qrVersion: newVersion,
        qrGeneratedAt: new Date(),
        qrRevokedAt: null,
        updatedAt: new Date(),
      }).where(eq(items.id, id)).returning();

      await tx.insert(logs).values({
        userId: userId || null,
        action: "update",
        entity: "item",
        entityId: id,
        detail: JSON.stringify({
          event: "QR_REGENERATED",
          itemCode: existingItem.itemCode,
          oldVersion,
          newVersion,
        }),
      });

      return updated;
    });

    const updated = await db.query.items.findFirst({ where: eq(items.id, id) });
    return { success: true, message: "QR regenerated", data: updated };
  }

  async revokeQr(id: string, userId?: string) {
    const existingItem = await db.query.items.findFirst({
      where: and(eq(items.id, id), isNull(items.deletedAt)),
    });
    if (!existingItem) return { success: false, message: "Item not found" };

    await db.transaction(async (tx) => {
      const [updated] = await tx.update(items).set({
        qrRevokedAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(items.id, id)).returning();

      await tx.insert(logs).values({
        userId: userId || null,
        action: "update",
        entity: "item",
        entityId: id,
        detail: JSON.stringify({
          event: "QR_REVOKED",
          itemCode: existingItem.itemCode,
          version: existingItem.qrVersion,
        }),
      });

      return updated;
    });

    const updated = await db.query.items.findFirst({ where: eq(items.id, id) });
    return { success: true, message: "QR revoked", data: updated };
  }

  async getBulkLabelData(ids: string[]) {
    const result = await db.query.items.findMany({
      where: and(isNull(items.deletedAt), sql`${items.id} = ANY(${ids})`),
      with: { bibliography: true, location: true },
    });
    return result;
  }
}

export const itemService = new ItemService();
