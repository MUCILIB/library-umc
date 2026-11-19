import dotenv from "dotenv";
dotenv.config();
import { db } from "../src/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Adding chapter and chapter_title columns to repository_proposals if not exists...");
  await db.execute(sql`
    ALTER TABLE "repository_proposals" 
    ADD COLUMN IF NOT EXISTS "chapter" varchar(50) DEFAULT 'FULL_TEXT',
    ADD COLUMN IF NOT EXISTS "chapter_title" varchar(255);
  `);
  console.log("Successfully added chapter and chapter_title columns.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
