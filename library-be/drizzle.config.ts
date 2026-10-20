import "dotenv/config";
import { defineConfig } from "drizzle-kit";

let dbUrlString = process.env.DATABASE_URL || "";
if (dbUrlString) {
  try {
    const dbUrl = new URL(dbUrlString);
    // Keep sslmode if required by cloud databases (e.g. Neon, Supabase, AWS RDS)
    // Only strip channel_binding which some node-postgres versions don't support
    dbUrl.searchParams.delete("channel_binding");
    dbUrlString = dbUrl.toString();
  } catch (_e) {
    // keep raw string if not a valid URL
  }
}

export default defineConfig({
  out: "./drizzle/",
  schema: "./src/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: dbUrlString,
  },
});
