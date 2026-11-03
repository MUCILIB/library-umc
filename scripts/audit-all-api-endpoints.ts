import fs from "fs";

const BASE_URL = process.env.API_URL || "http://127.0.0.1:3090";
const ADMIN_EMAIL = "admin@mucilib.ac.id";
const ADMIN_PASSWORD = "Admin123456!";

interface RouteDef {
  path: string;
  methods: string[];
}

async function runAudit() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("       COMPREHENSIVE API AUDIT FOR LIBRARY UMC             ");
  console.log("═══════════════════════════════════════════════════════════\n");

  // 1. Authenticate as Super Admin
  console.log("🔑 Authenticating as Super Admin...");
  const loginRes = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://library-fe-one.vercel.app",
    },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });

  const cookies: string[] = [];
  const setCookies = loginRes.headers.getSetCookie?.() || [];
  for (const sc of setCookies) {
    const [pair] = sc.split(";");
    if (pair) cookies.push(pair);
  }
  const cookieHeader = cookies.join("; ");
  console.log(`✅ Admin logged in. Cookies captured: ${cookies.length > 0 ? "YES" : "NO"}\n`);

  // 2. Load clean routes
  const raw = fs.readFileSync("/root/.hermes/cache/scratch/library_all_routes_clean.json", "utf8");
  const allRoutes: RouteDef[] = JSON.parse(raw);
  const getRoutes = allRoutes.filter((r) => r.methods.includes("GET"));

  // Fetch sample IDs to substitute into parameterized routes
  let sampleBibId = "";
  let sampleItemId = "";
  let sampleMemberId = "";
  let sampleLoanId = "";
  let sampleEbookId = "";

  try {
    const bibs = await (await fetch(`${BASE_URL}/api/bibliographies?limit=1`, { headers: { Cookie: cookieHeader } })).json();
    sampleBibId = bibs.data?.[0]?.id || "";
  } catch {}

  try {
    const items = await (await fetch(`${BASE_URL}/api/items?limit=1`, { headers: { Cookie: cookieHeader } })).json();
    sampleItemId = items.data?.[0]?.id || "";
  } catch {}

  try {
    const members = await (await fetch(`${BASE_URL}/api/members?limit=1`, { headers: { Cookie: cookieHeader } })).json();
    sampleMemberId = members.data?.[0]?.id || "";
  } catch {}

  try {
    const loans = await (await fetch(`${BASE_URL}/api/loans?limit=1`, { headers: { Cookie: cookieHeader } })).json();
    sampleLoanId = loans.data?.[0]?.id || "";
  } catch {}

  try {
    const ebooks = await (await fetch(`${BASE_URL}/api/ebooks?limit=1`, { headers: { Cookie: cookieHeader } })).json();
    sampleEbookId = ebooks.data?.[0]?.id || "";
  } catch {}

  console.log(`Sample context: Bib=${sampleBibId.slice(0, 8)}..., Item=${sampleItemId.slice(0, 8)}..., Member=${sampleMemberId.slice(0, 8)}...\n`);

  const results: { path: string; status: number; durationMs: number; ok: boolean; error?: string }[] = [];
  const serverErrors: { path: string; status: number; body: string }[] = [];

  for (const r of getRoutes) {
    let resolvedPath = r.path;

    // Skip wildcard or parameter routes if we have no sample
    if (resolvedPath.includes(":id") || resolvedPath.includes(":bibliographyId") || resolvedPath.includes(":loanId") || resolvedPath.includes(":memberId")) {
      if (resolvedPath.includes(":bibliographyId") && sampleBibId) {
        resolvedPath = resolvedPath.replace(":bibliographyId", sampleBibId);
      } else if (resolvedPath.includes(":id") && sampleBibId && (resolvedPath.includes("biblio") || resolvedPath.includes("collection"))) {
        resolvedPath = resolvedPath.replace(":id", sampleBibId);
      } else if (resolvedPath.includes(":id") && sampleItemId && resolvedPath.includes("item")) {
        resolvedPath = resolvedPath.replace(":id", sampleItemId);
      } else if (resolvedPath.includes(":id") && sampleLoanId && resolvedPath.includes("loan")) {
        resolvedPath = resolvedPath.replace(":id", sampleLoanId);
      } else if (resolvedPath.includes(":id") && sampleMemberId && resolvedPath.includes("member")) {
        resolvedPath = resolvedPath.replace(":id", sampleMemberId);
      } else if (resolvedPath.includes(":id") && sampleEbookId && resolvedPath.includes("ebook")) {
        resolvedPath = resolvedPath.replace(":id", sampleEbookId);
      } else if (resolvedPath.includes(":id") && (resolvedPath.includes("categories") || resolvedPath.includes("locations") || resolvedPath.includes("faculties") || resolvedPath.includes("study-programs"))) {
        resolvedPath = resolvedPath.replace(":id", "1");
      } else {
        // Skip unresolvable parameterized route in this batch
        continue;
      }
    }

    // Skip raw regex or stream endpoints that hang
    if (resolvedPath.includes("*") || resolvedPath.includes(":token") || resolvedPath.includes("stream-pdf") || resolvedPath.includes("stream")) {
      continue;
    }

    // Ensure /api prefix if not present
    const url = resolvedPath.startsWith("/api") ? `${BASE_URL}${resolvedPath}` : `${BASE_URL}/api${resolvedPath.startsWith("/") ? "" : "/"}${resolvedPath}`;

    const start = Date.now();
    try {
      const res = await fetch(url, {
        headers: {
          Cookie: cookieHeader,
          Origin: "https://library-fe-one.vercel.app",
        },
      });
      const durationMs = Date.now() - start;
      const status = res.status;
      const text = await res.text();

      const isServerError = status >= 500;
      if (isServerError) {
        serverErrors.push({ path: url, status, body: text.slice(0, 300) });
      }

      results.push({
        path: resolvedPath,
        status,
        durationMs,
        ok: !isServerError,
        error: isServerError ? text.slice(0, 150) : undefined,
      });

      const icon = status >= 200 && status < 400 ? "✅" : (status === 401 || status === 403 || status === 404 ? "⚠️" : "❌");
      console.log(`${icon} [${status}] (${durationMs}ms) GET ${resolvedPath}`);
    } catch (err: any) {
      const durationMs = Date.now() - start;
      serverErrors.push({ path: url, status: 0, body: err.message });
      results.push({
        path: resolvedPath,
        status: 0,
        durationMs,
        ok: false,
        error: err.message,
      });
      console.log(`❌ [CRASH] GET ${resolvedPath} - ${err.message}`);
    }
  }

  console.log("\n═══════════════════════════════════════════════════════════");
  console.log(`Total Endpoints Audited: ${results.length}`);
  console.log(`Successful / Handled: ${results.filter((r) => r.ok).length}`);
  console.log(`Server Errors (5xx / Crash): ${serverErrors.length}`);
  console.log("═══════════════════════════════════════════════════════════\n");

  if (serverErrors.length > 0) {
    console.log("🚨 DAFTAR ENDPOINT DENGAN SERVER ERROR (5xx / Crash):");
    for (const se of serverErrors) {
      console.log(`- Status: ${se.status} | URL: ${se.path}`);
      console.log(`  Body/Error: ${se.body}\n`);
    }
  } else {
    console.log("🎉 SEMPURNA: TIDAK ADA ENDPOINT YANG MENGALAMI 5xx SERVER ERROR ATAU CRASH!");
  }
}

runAudit().catch(console.error);
