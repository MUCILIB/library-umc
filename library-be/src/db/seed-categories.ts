import { db } from "../db/index";
import { categories } from "../db/schema";

async function seedCategories() {
  console.log("Seeding categories...");
  await db
    .insert(categories)
    .values([
      { name: "Umum", description: "Kategori Umum" },
      { name: "Teknologi", description: "Buku Teknologi & Komputer" },
      { name: "Sains", description: "Buku Sains Alam" },
      { name: "Sejarah", description: "Buku Sejarah" },
    ])
    .onConflictDoNothing();
  console.log("Categories seeded!");
  process.exit(0);
}

seedCategories();
