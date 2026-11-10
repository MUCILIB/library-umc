import "dotenv/config";
import { db } from "../src/db";
import { bibliographies, items, locations, collectionTypes } from "../src/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import crypto from "crypto";

async function populateStock10() {
  console.log("=== Mengisi Stok Setiap Buku Menjadi 10 Eksemplar ===");

  // 1. Ambil lokasi default
  const locList = await db.select({ id: locations.id }).from(locations).where(isNull(locations.deletedAt)).limit(1);
  const locationId = locList[0]?.id || 13;

  // 2. Ambil tipe koleksi default
  const ctList = await db.select({ id: collectionTypes.id }).from(collectionTypes).where(isNull(collectionTypes.deletedAt)).limit(1);
  const collectionTypeId = ctList[0]?.id || null;

  // 3. Ambil semua bibliografi aktif
  const bibList = await db
    .select({
      id: bibliographies.id,
      title: bibliographies.title,
      callNumber: bibliographies.callNumber,
      isbn: bibliographies.isbn,
    })
    .from(bibliographies)
    .where(isNull(bibliographies.deletedAt))
    .orderBy(bibliographies.title);

  console.log(`Ditemukan ${bibList.length} judul bibliografi.`);

  let totalItemsAdded = 0;
  let bibsUpdated = 0;

  for (const bib of bibList) {
    // Hitung jumlah item yang sudah ada
    const existingItems = await db
      .select({ id: items.id, itemCode: items.itemCode })
      .from(items)
      .where(and(eq(items.bibliographyId, bib.id), isNull(items.deletedAt)));

    const currentCount = existingItems.length;
    const targetCount = 10;
    const needed = targetCount - currentCount;

    if (needed > 0) {
      // Ambil prefix kode buku
      const cleanBibShort = bib.id.replace(/-/g, "").slice(0, 6).toUpperCase();

      for (let i = 1; i <= needed; i++) {
        const seqNumber = currentCount + i;
        const seqStr = String(seqNumber).padStart(2, "0");
        const itemCode = `UMC-${cleanBibShort}-${seqStr}`;
        const inventoryCode = `INV-${cleanBibShort}-${seqStr}`;
        const qrToken = crypto.randomBytes(20).toString("hex");

        await db.insert(items).values({
          bibliographyId: bib.id,
          itemCode,
          inventoryCode,
          callNumber: bib.callNumber || null,
          locationId,
          collectionTypeId,
          status: "available",
          qrToken,
          qrVersion: 1,
          qrGeneratedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        totalItemsAdded++;
      }
      bibsUpdated++;
    }

    // Sinkronisasi kolom stock pada tabel bibliographies
    const [availableCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(items)
      .where(
        and(
          eq(items.bibliographyId, bib.id),
          eq(items.status, "available"),
          isNull(items.deletedAt)
        )
      );

    await db
      .update(bibliographies)
      .set({
        stock: Number(availableCount?.count ?? 0),
        updatedAt: new Date(),
      })
      .where(eq(bibliographies.id, bib.id));
  }

  console.log(`\n=== Hasil Pengisian Stok ===`);
  console.log(`- Judul bibliografi diperbarui: ${bibsUpdated} dari ${bibList.length}`);
  console.log(`- Total eksemplar fisik baru ditambahkan: ${totalItemsAdded}`);
  console.log(`- Seluruh ${bibList.length} judul sekarang memiliki minimal 10 eksemplar fisik.`);
  process.exit(0);
}

populateStock10().catch((err) => {
  console.error("Gagal mengisi stok:", err);
  process.exit(1);
});
