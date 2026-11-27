import { db } from "../../../db";
import { collectionTypes, gmds } from "../../../db/schema";
import { eq, and, ilike, isNull, asc } from "drizzle-orm";
import type { CreateCollectionTypeInput, UpdateCollectionTypeInput } from "../validation/collection-type.validation";

export class CollectionTypeService {
  async getAll() {
    const list = await db.query.collectionTypes.findMany({
      where: isNull(collectionTypes.deletedAt),
      orderBy: [asc(collectionTypes.id)],
    });
    return list;
  }

  async getById(id: number) {
    const item = await db.query.collectionTypes.findFirst({
      where: eq(collectionTypes.id, id),
    });
    return item;
  }

  async create(data: CreateCollectionTypeInput) {
    const code = (data.code || "S").toUpperCase().trim();
    const [created] = await db
      .insert(collectionTypes)
      .values({
        name: data.name.trim(),
        code,
        canBeBorrowed: data.canBeBorrowed ?? true,
        description: data.description?.trim() || null,
        colorTag: data.colorTag?.trim() || null,
      })
      .returning();
    return created;
  }

  async update(id: number, data: UpdateCollectionTypeInput) {
    const payload: Partial<typeof collectionTypes.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (data.name !== undefined) payload.name = data.name.trim();
    if (data.code !== undefined) payload.code = data.code.toUpperCase().trim();
    if (data.canBeBorrowed !== undefined) payload.canBeBorrowed = data.canBeBorrowed;
    if (data.description !== undefined) payload.description = data.description?.trim() || null;
    if (data.colorTag !== undefined) payload.colorTag = data.colorTag?.trim() || null;

    const [updated] = await db
      .update(collectionTypes)
      .set(payload)
      .where(eq(collectionTypes.id, id))
      .returning();
    return updated;
  }

  async delete(id: number) {
    const [deleted] = await db
      .update(collectionTypes)
      .set({ deletedAt: new Date() })
      .where(eq(collectionTypes.id, id))
      .returning();
    return deleted;
  }

  async getAllGmds() {
    return db.query.gmds.findMany({
      where: isNull(gmds.deletedAt),
      orderBy: [asc(gmds.name)],
    });
  }

  async getGmdById(id: number) {
    return db.query.gmds.findFirst({
      where: and(eq(gmds.id, id), isNull(gmds.deletedAt)),
    });
  }

  async createGmd(name: string) {
    const trimmed = name.trim();
    const existing = await db.query.gmds.findFirst({
      where: and(ilike(gmds.name, trimmed), isNull(gmds.deletedAt)),
    });
    if (existing) {
      throw new Error(`Tipe GMD "${trimmed}" sudah ada`);
    }

    const [created] = await db.insert(gmds).values({ name: trimmed }).returning();
    return created;
  }

  async updateGmd(id: number, name: string) {
    const trimmed = name.trim();
    const target = await this.getGmdById(id);
    if (!target) return null;

    const duplicate = await db.query.gmds.findFirst({
      where: and(ilike(gmds.name, trimmed), isNull(gmds.deletedAt)),
    });
    if (duplicate && duplicate.id !== id) {
      throw new Error(`Tipe GMD "${trimmed}" sudah ada`);
    }

    const [updated] = await db
      .update(gmds)
      .set({ name: trimmed })
      .where(and(eq(gmds.id, id), isNull(gmds.deletedAt)))
      .returning();
    return updated || null;
  }

  async deleteGmd(id: number) {
    const [deleted] = await db
      .update(gmds)
      .set({ deletedAt: new Date() })
      .where(and(eq(gmds.id, id), isNull(gmds.deletedAt)))
      .returning();
    return deleted || null;
  }

  async seedDefaultsIfEmpty() {
    try {
      const existing = await db.query.collectionTypes.findMany({
        where: isNull(collectionTypes.deletedAt),
      });

      const sirkulasi = existing.find((ct) => ct.name.toLowerCase() === "sirkulasi" || ct.code === "S");
      if (!sirkulasi) {
        await db.insert(collectionTypes).values({
          name: "Sirkulasi",
          code: "S",
          canBeBorrowed: true,
          description: "Koleksi umum perpustakaan, dapat dipinjam keluar oleh pemustaka.",
          colorTag: "emerald",
        });
      }

      const referensi = existing.find((ct) => ct.name.toLowerCase() === "referensi" || ct.code === "R");
      if (!referensi) {
        await db.insert(collectionTypes).values({
          name: "Referensi",
          code: "R",
          canBeBorrowed: false,
          description: "Koleksi rujukan (kamus, ensiklopedia, guidebook, buku langka). Hanya dapat dibaca di tempat.",
          colorTag: "amber",
        });
      }

      // Seed GMD bawaan hanya jika tabel GMD masih kosong agar penghapusan oleh admin tetap bertahan
      const existingGmds = await db.query.gmds.findMany({ limit: 1 });
      if (existingGmds.length === 0) {
        const defaultGmds = [
          "Buku Inti",
          "Buku Pendukung",
          "Buku Referensi",
          "Koleksi Muatan Lokal",
          "Koleksi Khusus",
        ];
        for (const gmdName of defaultGmds) {
          await db.insert(gmds).values({ name: gmdName });
        }
      }
    } catch (err) {
      console.warn("[CollectionTypeService] seedDefaultsIfEmpty error:", err);
    }
  }
}

export const collectionTypeService = new CollectionTypeService();
