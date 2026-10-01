import "dotenv/config";
import dns from "dns";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// Force IPv4 resolution first to prevent dual-stack IPv6 timeout issues in containerized networks
dns.setDefaultResultOrder("ipv4first");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on("error", (err: Error) => {
  console.error("Unexpected error on idle database client", err);
});

export const db = drizzle(pool, { schema });
