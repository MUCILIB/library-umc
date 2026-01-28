import { db } from "./index";
import { sql } from "drizzle-orm";

async function reset() {
  console.log("🗑️  Resetting database...");
  try {
    // 1. Drop Tables
    const tables = [
      "transactions",
      "fines",
      "reservations",
      "loans",
      "items",
      "collection_contents",
      "collection_views",
      "acquisitions",
      "collections",
      "members",
      "session",
      "account",
      "verification",
      "logs",
      "web_traffic",
      "users",
      "categories",
      "locations",
      "vendors",
      "recommendations",
      "guest_logs",
      "drizzle_migrations", // Internal drizzle table
    ];

    for (const table of tables) {
      await db.execute(sql.raw(`DROP TABLE IF EXISTS "${table}" CASCADE`));
    }

    // 2. Drop Enums
    const enums = [
      "status_user",
      "collection_type",
      "content_type",
      "item_status",
      "loans_status",
      "reservations_status",
      "fines_status",
      "logs_status",
      "logs_entity",
    ];

    for (const e of enums) {
      await db.execute(sql.raw(`DROP TYPE IF EXISTS "${e}" CASCADE`));
    }

    console.log("✅ Database reset complete.");
  } catch (err) {
    console.error("❌ Error resetting database:", err);
  } finally {
    process.exit(0);
  }
}

reset();
