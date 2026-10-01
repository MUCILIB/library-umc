import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on("error", (err: Error) => {
  console.error("Unexpected error on idle database client", err);
});

export const db = drizzle(pool, { schema });
