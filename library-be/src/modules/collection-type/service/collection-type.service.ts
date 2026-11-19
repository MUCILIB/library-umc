import { db } from "../../../db";
import { collectionTypes, gmds } from "../../../db/schema";
import { eq, isNull, asc } from "drizzle-orm";
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

      // Pastikan GMD spesifikasi isi tersedia
      const defaultGmds = [
        "Buku Inti",
        "Buku Pendukung",
        "Buku Referensi",
        "Koleksi Muatan Lokal",
        "Koleksi Khusus",
      ];
      for (const gmdName of defaultGmds) {
        const found = await db.query.gmds.findFirst({
          where: eq(gmds.name, gmdName),
        });
        if (!found) {
          await db.insert(gmds).values({ name: gmdName });
        }
      }
    } catch (err) {
      console.warn("[CollectionTypeService] seedDefaultsIfEmpty error:", err);
    }
  }
}

export const collectionTypeService = new CollectionTypeService();
