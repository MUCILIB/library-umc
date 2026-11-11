import { db } from "../src/db";
import { 
  faculties, studyPrograms, bibliographies, items, loans, reservations, 
  fines, transactions, returnRequests, acquisitions, bibliographyAuthors, 
  bibliographySubjects, bibliographyContents, bibliographyViews, 
  bibliographyFaculties, bibliographyStudyPrograms, guestLogs, importBibliographyItemCodes 
} from "../src/db/schema";
import { sql } from "drizzle-orm";

export const REAL_UMC_FACULTIES = [
  {
    name: "Fakultas Ekonomi & Bisnis",
    code: "FEB",
    prodis: [
      { name: "S1 Akuntansi", code: "AKT-S1" },
      { name: "S1 Manajemen", code: "MNJ-S1" },
    ],
  },
  {
    name: "Fakultas Ilmu Sosial & Politik",
    code: "FISIP",
    prodis: [
      { name: "D3 Hubungan Masyarakat", code: "HUMAS-D3" },
      { name: "S1 Ilmu Komunikasi", code: "ILKOM-S1" },
      { name: "S1 Ilmu Pemerintahan", code: "IPEM-S1" },
    ],
  },
  {
    name: "Fakultas Teknik",
    code: "FT",
    prodis: [
      { name: "D3 Teknik Informatika", code: "TI-D3" },
      { name: "S1 Teknik Industri", code: "TIND-S1" },
      { name: "S1 Teknik Informatika", code: "TI-S1" },
      { name: "S1 Peternakan", code: "PTR-S1" },
    ],
  },
  {
    name: "Fakultas Keguruan & Ilmu Pendidikan",
    code: "FKIP",
    prodis: [
      { name: "S1 PG-PAUD", code: "PAUD-S1" },
      { name: "S1 PGSD", code: "PGSD-S1" },
      { name: "S1 Pendidikan Bahasa Inggris", code: "PBI-S1" },
      { name: "S1 Pendidikan IPA", code: "PIPA-S1" },
      { name: "S1 Pendidikan Kimia", code: "PKIM-S1" },
      { name: "S1 Pendidikan Matematika", code: "PMAT-S1" },
    ],
  },
  {
    name: "Fakultas Hukum",
    code: "FH",
    prodis: [
      { name: "S1 Ilmu Hukum", code: "IH-S1" },
    ],
  },
  {
    name: "Fakultas Ilmu Kesehatan",
    code: "FIKES",
    prodis: [
      { name: "S1 Ilmu Keperawatan", code: "KEP-S1" },
      { name: "S1 Gizi", code: "GIZI-S1" },
      { name: "S1 Ilmu Keolahragaan", code: "IKOR-S1" },
      { name: "Profesi Ners A", code: "NERS-A" },
      { name: "Profesi Ners B", code: "NERS-B" },
    ],
  },
  {
    name: "Fakultas Agama Islam",
    code: "FAI",
    prodis: [
      { name: "S1 Ilmu Al-Qur'an dan Tafsir", code: "IAT-S1" },
      { name: "S1 Tasawuf dan Psikoterapi", code: "TP-S1" },
    ],
  },
];

async function main() {
  console.log("=== STEP 1: CLEANING EXISTING CATALOG & DEPENDENCIES ===");
  // Clear any guestLogs & repositoryProposals references
  await db.execute(sql`UPDATE guest_logs SET faculty_id = NULL, study_program_id = NULL`);
  await db.execute(sql`UPDATE repository_proposals SET study_program_id = NULL`);

  // Clear transactional data referencing bibliographies & items
  await db.execute(sql`DELETE FROM transactions`);
  await db.execute(sql`DELETE FROM fines`);
  await db.execute(sql`DELETE FROM return_requests`);
  await db.execute(sql`DELETE FROM loans`);
  await db.execute(sql`DELETE FROM reservations`);
  await db.execute(sql`DELETE FROM acquisitions`);
  await db.execute(sql`DELETE FROM bibliography_views`);
  await db.execute(sql`DELETE FROM bibliography_contents`);
  await db.execute(sql`DELETE FROM bibliography_faculties`);
  await db.execute(sql`DELETE FROM bibliography_study_programs`);
  await db.execute(sql`DELETE FROM bibliography_authors`);
  await db.execute(sql`DELETE FROM bibliography_subjects`);
  await db.execute(sql`DELETE FROM import_bibliography_item_codes`);
  await db.execute(sql`DELETE FROM items`);
  await db.execute(sql`DELETE FROM bibliographies`);
  console.log("-> Catalog bibliographies, items, and junctions wiped clean.");

  console.log("=== STEP 2: RESETTING FACULTIES & STUDY PROGRAMS ===");
  await db.execute(sql`DELETE FROM study_programs`);
  await db.execute(sql`DELETE FROM faculties`);
  console.log("-> Obsolete faculties and study programs removed.");

  console.log("=== STEP 3: SEEDING REAL UMC FACULTIES & STUDY PROGRAMS ===");
  let facultyCount = 0;
  let prodiCount = 0;

  for (const f of REAL_UMC_FACULTIES) {
    const [createdFac] = await db.insert(faculties).values({
      name: f.name,
      code: f.code,
    }).returning();
    facultyCount++;

    for (const p of f.prodis) {
      await db.insert(studyPrograms).values({
        facultyId: createdFac.id,
        name: p.name,
        code: p.code,
      });
      prodiCount++;
    }
  }

  console.log(`-> Successfully seeded ${facultyCount} Real UMC Faculties & ${prodiCount} Study Programs.`);

  console.log("=== STEP 4: VERIFYING DATABASE STATE ===");
  const allFacs = await db.query.faculties.findMany();
  const allProdis = await db.query.studyPrograms.findMany();
  const bibCount = await db.execute(sql`SELECT count(*) FROM bibliographies`);
  const itemCount = await db.execute(sql`SELECT count(*) FROM items`);

  console.log(`Faculties in DB: ${allFacs.length}`);
  console.log(`Study Programs in DB: ${allProdis.length}`);
  console.log(`Bibliographies in DB: ${bibCount.rows[0].count}`);
  console.log(`Items in DB: ${itemCount.rows[0].count}`);

  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
