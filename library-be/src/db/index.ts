import "dotenv/config";
import dns from "dns";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// Filter out IPv6 addresses because Docker container network does not have an external IPv6 gateway to AWS Neon
const originalLookup = dns.lookup;
// @ts-ignore
dns.lookup = function (hostname: any, options: any, callback: any) {
  if (typeof options === "function") {
    callback = options;
    options = {};
  }
  return originalLookup(hostname, options, (err, address, family) => {
    if (err) return callback(err);
    if (Array.isArray(address)) {
      const v4Only = address.filter((a) => a.family === 4);
      return callback(null, v4Only.length > 0 ? v4Only : address);
    }
    return callback(null, address, family);
  });
};

dns.setDefaultResultOrder("ipv4first");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on("error", (err: Error) => {
  console.error("Unexpected error on idle database client", err);
});

export const db = drizzle(pool, { schema });
