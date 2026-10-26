import { db } from ".";
import {
  Users, account as accountTable, members, categories, locations, vendors,
  publishers, languages, publicationPlaces, gmds,
  collectionTypes, authors, subjects, bibliographies, bibliographyAuthors,
  bibliographySubjects, items, faculties, studyPrograms
} from "./schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import crypto from "crypto";

const ADMIN_EMAIL = "admin@mucilib.ac.id";
const ADMIN_PASSWORD = "Admin123456!";

async function seed() {
  console.log("Seeding database...");

  // 1. Admin user
  const existingAdmin = await db.query.Users.findFirst({ where: eq(Users.email, ADMIN_EMAIL) });
  let adminId: string;
  if (!existingAdmin) {
    const now = new Date();
    adminId = "admin-seed-001";
    await db.insert(Users).values({ id: adminId, name: "Super Admin", email: ADMIN_EMAIL, emailVerified: true, role: "super_admin", createdAt: now, updatedAt: now });
    console.log("Created admin user");
  } else {
    adminId = existingAdmin.id;
    if (existingAdmin.role !== "super_admin") {
      await db.update(Users).set({ role: "super_admin" }).where(eq(Users.id, adminId));
    }
    console.log("Admin user already exists");
  }

  const existingAccount = await db.query.account.findFirst({ where: eq(accountTable.userId, adminId) });
  if (!existingAccount) {
    const hashedPassword = await hashPassword(ADMIN_PASSWORD);
    const now = new Date();
    await db.insert(accountTable).values({ id: `account-${adminId}-credential`, accountId: ADMIN_EMAIL, providerId: "credential", userId: adminId, password: hashedPassword, createdAt: now, updatedAt: now });
    console.log("Created admin credential account");
  } else {
    console.log("Admin credential account already exists");
  }

  // 2. Categories
  const categoryNames = ["Pendidikan", "Psikologi", "PAUD", "FAI", "BK", "Komunikasi", "Pemerintahan", "Umum", "Bahasa Inggris", "Matematika"];
  for (const name of categoryNames) {
    const existing = await db.query.categories.findFirst({ where: eq(categories.name, name) });
    if (!existing) await db.insert(categories).values({ name });
  }
  console.log(`Seeded ${categoryNames.length} categories`);

  // 3. Location
  const existingLoc = await db.query.locations.findFirst();
  if (!existingLoc) {
    await db.insert(locations).values({ room: "UMC Library", rack: "Rak Utama", shelf: "Lantai 1" });
    console.log("Created default location");
  } else {
    console.log("Default location already exists");
  }

  // 4. Languages
  const langData = [{ code: "id", name: "Indonesia" }, { code: "en", name: "English" }, { code: "ar", name: "Arabic" }, { code: "ms", name: "Malay" }];
  for (const lang of langData) {
    const existing = await db.query.languages.findFirst({ where: eq(languages.code, lang.code) });
    if (!existing) await db.insert(languages).values(lang);
  }
  console.log(`Seeded ${langData.length} languages`);

  // 5. GMDs
  const gmdNames = ["Text", "Electronic", "Audio", "Video", "Image", "Map", "Mixed"];
  for (const name of gmdNames) {
    const existing = await db.query.gmds.findFirst({ where: eq(gmds.name, name) });
    if (!existing) await db.insert(gmds).values({ name });
  }
  console.log(`Seeded ${gmdNames.length} GMDs`);

  // 6. Collection Types
  const ctData = [
    { name: "Text", code: "Text" }, { name: "Pendidikan", code: "Pendidikan" },
    { name: "Psikologi", code: "Psikologi" }, { name: "PAUD", code: "PAUD" },
    { name: "FAI", code: "FAI" }, { name: "BK", code: "BK" },
    { name: "Komunikasi", code: "Komunikasi" }, { name: "Pemerintahan", code: "Pemerintahan" },
    { name: "Umum", code: "Umum" }, { name: "Bahasa Inggris", code: "Bahasa Inggris" },
    { name: "Matematika", code: "Matematika" },
  ];
  for (const ct of ctData) {
    const existing = await db.query.collectionTypes.findFirst({ where: eq(collectionTypes.name, ct.name) });
    if (!existing) await db.insert(collectionTypes).values(ct);
  }
  console.log(`Seeded ${ctData.length} collection types`);

  // 7. Vendors
  const existingVendor = await db.query.vendors.findFirst();
  if (!existingVendor) {
    await db.insert(vendors).values({ name: "UMC Library", contact: "library@umc.ac.id" });
    console.log("Created default vendor");
  } else {
    console.log("Default vendor already exists");
  }

  // 8. Publishers
  const pubData = ["Gramedia", "Erlangga", "Pustaka Jaya", "Informatika", "Rekayasa Sains"];
  for (const name of pubData) {
    const existing = await db.query.publishers.findFirst({ where: eq(publishers.name, name) });
    if (!existing) await db.insert(publishers).values({ name, normalizedName: name.toLowerCase() });
  }
  console.log(`Seeded ${pubData.length} publishers`);

  // 9. Publication Places
  const placeData = ["Jakarta", "Bandung", "Yogyakarta", "Surabaya"];
  for (const name of placeData) {
    const existing = await db.query.publicationPlaces.findFirst({ where: eq(publicationPlaces.name, name) });
    if (!existing) await db.insert(publicationPlaces).values({ name, normalizedName: name.toLowerCase() });
  }
  console.log(`Seeded ${placeData.length} publication places`);

  // 10. Sample Bibliographies + Authors + Subjects + Items
  const existingBibs = await db.query.bibliographies.findMany({ limit: 1 });
  if (existingBibs.length === 0) {
    const locId = (await db.query.locations.findFirst())?.id || 1;
    const gmdTextId = (await db.query.gmds.findFirst({ where: eq(gmds.name, "Text") }))?.id || 1;
    const ctTextId = (await db.query.collectionTypes.findFirst({ where: eq(collectionTypes.name, "Text") }))?.id || 1;

    const catalogData = [
      { title: "Pemrograman Web dengan JavaScript", isbn: "978-602-123-001-1", year: 2024, ed: "Edisi 3", authors: ["Budi Santoso"], subjects: ["Pemrograman", "JavaScript"], stock: 5 },
      { title: "Dasar-Dasar Psikologi Pendidikan", isbn: "978-602-123-002-8", year: 2023, ed: "Edisi 2", authors: ["Ani Wijayati"], subjects: ["Psikologi"], stock: 3 },
      { title: "Manajemen Sumber Daya Manusia", isbn: "978-602-123-003-5", year: 2024, ed: "Edisi 1", authors: ["Rina Hartono", "Dedi Kurniawan"], subjects: ["Manajemen"], stock: 4 },
      { title: "Teknik Informatika Dasar", isbn: "978-602-123-004-2", year: 2022, ed: "Edisi 4", authors: ["Ahmad Fauzi"], subjects: ["Informatika"], stock: 2 },
      { title: "Bahasa Inggris untuk Pemula", isbn: "978-602-123-005-9", year: 2023, ed: "Edisi 1", authors: ["Sarah Johnson"], subjects: ["Bahasa Inggris"], stock: 6 },
      { title: "Matematika Diskrit", isbn: "978-602-123-006-6", year: 2021, ed: "Edisi 2", authors: ["Dr. Surya"], subjects: ["Matematika"], stock: 3 },
      { title: "Jaringan Komputer", isbn: "978-602-123-007-3", year: 2023, ed: "Edisi 1", authors: ["Bambang Riyanto"], subjects: ["Jaringan"], stock: 4 },
      { title: "Basis Data Relasional", isbn: "978-602-123-008-0", year: 2022, ed: "Edisi 3", authors: ["Dewi Lestari", "Rudi Hartono"], subjects: ["Basis Data"], stock: 2 },
      { title: "Kecerdasan Buatan", isbn: "978-602-123-009-7", year: 2024, ed: "Edisi 1", authors: ["Prof. Wibowo"], subjects: ["AI"], stock: 3 },
      { title: "Statistika untuk Penelitian", isbn: "978-602-123-010-3", year: 2023, ed: "Edisi 2", authors: ["Dr. Rina", "Dr. Sari"], subjects: ["Statistika"], stock: 5 },
    ];

    let bibCount = 0, itemCount = 0;
    for (const b of catalogData) {
      const br = await db.insert(bibliographies).values({
        title: b.title, isbnIssn: b.isbn, edition: b.ed, publishYear: b.year,
        gmdId: gmdTextId, collectionTypeId: ctTextId, type: "physical_book", stock: b.stock,
      }).returning();
      const bid = br[0].id;

      for (let i = 0; i < b.authors.length; i++) {
        const ar = await db.query.authors.findFirst({ where: eq(authors.name, b.authors[i]) });
        let aid = ar?.id;
        if (!aid) {
          const created = await db.insert(authors).values({ name: b.authors[i], normalizedName: b.authors[i].toLowerCase() }).returning();
          aid = created[0].id;
        }
        await db.insert(bibliographyAuthors).values({ bibliographyId: bid, authorId: aid!, role: i === 0 ? "primary" : "co-author", position: i + 1 });
      }

      for (const sn of b.subjects) {
        let sid = (await db.query.subjects.findFirst({ where: eq(subjects.name, sn) }))?.id;
        if (!sid) {
          const created = await db.insert(subjects).values({ name: sn, normalizedName: sn.toLowerCase() }).returning();
          sid = created[0].id;
        }
        await db.insert(bibliographySubjects).values({ bibliographyId: bid, subjectId: sid! });
      }

      for (let i = 0; i < Math.min(b.stock, 3); i++) {
        await db.insert(items).values({
          bibliographyId: bid, itemCode: `ITEM-${b.isbn.slice(-4)}-${String(i + 1).padStart(2, "0")}`,
          locationId: locId, status: "available", qrToken: crypto.randomBytes(20).toString("hex"),
          qrVersion: 1, qrGeneratedAt: new Date(),
        });
        itemCount++;
      }
      bibCount++;
    }

    await db.execute(sql`UPDATE bibliographies SET stock = (SELECT count(*) FROM items WHERE items.bibliography_id = bibliographies.id AND items.status = 'available' AND deleted_at IS NULL) WHERE deleted_at IS NULL`);

    console.log(`\nSeeded ${bibCount} bibliographies, ${itemCount} items`);
  } else {
    console.log("Catalog data already exists. Skipping.");
  }

  // 11. Faculties
  const facultyData = [
    { name: "Fakultas Ilmu Komputer", code: "FIK" },
    { name: "Fakultas Ekonomi dan Bisnis", code: "FEB" },
    { name: "Fakultas Teknik", code: "FT" },
    { name: "Fakultas Keguruan dan Ilmu Pendidikan", code: "FKIP" },
    { name: "Fakultas Hukum", code: "FH" },
    { name: "Fakultas Pertanian", code: "FP" },
  ];
  const facultyMap = new Map<string, number>();
  for (const f of facultyData) {
    const existing = await db.query.faculties.findFirst({ where: eq(faculties.name, f.name) });
    if (!existing) {
      const [created] = await db.insert(faculties).values(f).returning();
      facultyMap.set(f.code, created.id);
    } else {
      facultyMap.set(f.code, existing.id);
    }
  }
  console.log(`Seeded ${facultyData.length} faculties`);

  // 12. Study Programs
  const spData = [
    { name: "Teknik Informatika", code: "TI", facultyCode: "FIK" },
    { name: "Sistem Informasi", code: "SI", facultyCode: "FIK" },
    { name: "Manajemen", code: "MNJ", facultyCode: "FEB" },
    { name: "Akuntansi", code: "AKT", facultyCode: "FEB" },
    { name: "Teknik Sipil", code: "TS", facultyCode: "FT" },
    { name: "Teknik Mesin", code: "TM", facultyCode: "FT" },
    { name: "Pendidikan Matematika", code: "PM", facultyCode: "FKIP" },
    { name: "Pendidikan Bahasa Inggris", code: "PBI", facultyCode: "FKIP" },
    { name: "Ilmu Hukum", code: "IH", facultyCode: "FH" },
    { name: "Agroteknologi", code: "AGRO", facultyCode: "FP" },
  ];
  for (const sp of spData) {
    const fid = facultyMap.get(sp.facultyCode);
    if (!fid) continue;
    const existing = await db.query.studyPrograms.findFirst({
      where: eq(studyPrograms.name, sp.name),
    });
    if (!existing) {
      await db.insert(studyPrograms).values({ name: sp.name, code: sp.code, facultyId: fid });
    }
  }
  console.log(`Seeded ${spData.length} study programs`);

  console.log("Seeding complete.");
  process.exit(0);
}

// Need sql import
import { sql } from "drizzle-orm";

seed();
