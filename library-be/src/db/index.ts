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
  return originalLookup(hostname, { ...options, all: true }, (err, addresses: any) => {
    if (err) return callback(err);
    const list = Array.isArray(addresses) ? addresses : [addresses];
    const v4Only = list.filter((a) => a && (a.family === 4 || a.family === "IPv4"));
    const selected = v4Only.length > 0 ? v4Only : list;
    if (options && options.all) {
      return callback(null, selected);
    }
    const first = selected[0] || {};
    return callback(null, first.address, first.family || 4);
  });
};

dns.setDefaultResultOrder("ipv4first");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 8000,
});

pool.on("error", (err: Error) => {
  console.error("Unexpected error on idle database client", err);
});

export const db = drizzle(pool, { schema });
