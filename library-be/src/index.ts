import express from "express";
import helmet from "helmet";
import dotenv from "dotenv";
import cors from "cors";
import { routes } from "./routes";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth";
import path from "path";
import { swaggerSpec } from "./config/swagger";
import swaggerUi from "swagger-ui-express";
import { generalLimiter, authLimiter } from "./middlewares/rateLimiter";
import { errorMiddleware } from "./middlewares/error.middleware";
import { getSession } from "./utils/auth-utils";
import { initCronJobs } from "./cron/fineScheduler";
import { initBookingCancelScheduler } from "./cron/bookingCancelScheduler";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "./db";

dotenv.config();

const app = express();

app.disable("x-powered-by");

// Standard HTTP Security Headers (OWASP & Cloudflare Standard)
app.use(
  helmet({
    contentSecurityPolicy: false, // Keep disabled for Swagger UI inline scripts & assets
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow cross-origin PDF blob streaming
  })
);

// Trust proxy fully for secure cookie (X-Forwarded-Proto) from PaaS like Railway, Render, Coolify, etc.
app.set("trust proxy", 1);

// ponytail: HTTPS redirect handled at reverse proxy boundary (Caddy/Traefik)
// Skip app-level redirect to prevent reverse proxy loops with TLS termination

const allowedOrigins = [
  process.env.FRONTEND_URL || "http://localhost:5173",
  "http://localhost:4173",
  "https://library-fe-one.vercel.app",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:4173",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost",
  "http://127.0.0.1"
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, postman, curl)
      if (!origin) return callback(null, true);

      // In development, allow any origin to make local/network development easy
      if (process.env.NODE_ENV !== "production") {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      callback(new Error("Not allowed by CORS"));
    },
    credentials: true
  })
);
app.use(express.json());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, "../public")));

// Swagger UI using swagger-ui-express
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// General rate limiter for all API routes (baseline protection)
app.use("/api", generalLimiter);

// Rate limiter khusus untuk endpoint autentikasi Better-Auth (prevent brute-force & credential stuffing)
app.use(
  [
    "/api/auth/sign-in",
    "/api/auth/sign-up",
    "/api/auth/forget-password",
    "/api/auth/forgot-password",
    "/api/auth/reset-password"
  ],
  authLimiter
);

// Enforce 401 Unauthorized for unauthenticated get-session requests (REST standard & QA assertion)
app.get(["/api/auth/get-session", "/auth/get-session"], async (req, res, next) => {
  try {
    const session = await getSession(req);
    if (!session) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - Tidak ada session aktif",
        data: null,
      });
    }
    return res.status(200).json(session);
  } catch (error) {
    next(error);
  }
});

// Better Auth Handler — harus SEBELUM custom routes
// agar semua /api/auth/* (sign-in/email, sign-up/email, dll) ditangani oleh
// better-auth yang bisa meng-set cookie session ke browser
app.all("/api/auth/*path", toNodeHandler(auth));

// Routes
app.use("/api", routes);
app.use(routes);

app.get("/", (req, res) => {
  res.redirect("/docs");
});

app.get("/health", (req, res) => {
  res.status(200).send("API IS OK");
});

// Error Middleware (MuST be at the end)
app.use(errorMiddleware);

async function runPendingMigrations() {
  try {
    const migrationsFolder = path.join(__dirname, "../drizzle");
    console.log(`[Database] Checking and running pending migrations from ${migrationsFolder}...`);
    await migrate(db, { migrationsFolder });
    console.log("[Database] Migrations verified and applied successfully.");
  } catch (error) {
    console.warn("[Database] Migration check failed or skipped:", error);
  }

  // Ensure collection_types columns & seed default classification (Sirkulasi & Referensi)
  try {
    const { sql } = await import("drizzle-orm");
    await db.execute(sql`
      ALTER TABLE "collection_types" ADD COLUMN IF NOT EXISTS "code" varchar(50) DEFAULT 'S';
      ALTER TABLE "collection_types" ADD COLUMN IF NOT EXISTS "can_be_borrowed" boolean DEFAULT true NOT NULL;
      ALTER TABLE "collection_types" ADD COLUMN IF NOT EXISTS "description" text;
      ALTER TABLE "collection_types" ADD COLUMN IF NOT EXISTS "color_tag" varchar(50);
      ALTER TABLE "collection_types" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now();
      ALTER TABLE "collection_types" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now();
    `);

    const { collectionTypeService } = await import("./modules/collection-type/service/collection-type.service");
    await collectionTypeService.seedDefaultsIfEmpty();
  } catch (ctErr) {
    console.warn("[Database] Collection types initialization error:", ctErr);
  }

  // Ensure repository_proposals chapter & chapter_title columns
  try {
    const { sql } = await import("drizzle-orm");
    await db.execute(sql`
      ALTER TABLE "repository_proposals" ADD COLUMN IF NOT EXISTS "chapter" varchar(50) DEFAULT 'FULL_TEXT';
      ALTER TABLE "repository_proposals" ADD COLUMN IF NOT EXISTS "chapter_title" varchar(255);
    `);
  } catch (repoErr) {
    console.warn("[Database] repository_proposals chapter initialization error:", repoErr);
  }

  // Ensure news enums and table
  try {
    const { sql } = await import("drizzle-orm");
    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE "news_category" AS ENUM ('pengumuman', 'agenda', 'kegiatan', 'layanan', 'literasi');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE "news_status" AS ENUM ('draft', 'published', 'archived');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      CREATE TABLE IF NOT EXISTS "news" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "title" varchar(255) NOT NULL,
        "slug" varchar(255) NOT NULL UNIQUE,
        "category" "news_category" NOT NULL DEFAULT 'pengumuman',
        "excerpt" text,
        "content" text NOT NULL,
        "cover_image" varchar(500),
        "status" "news_status" NOT NULL DEFAULT 'draft',
        "views" integer NOT NULL DEFAULT 0,
        "author_id" text REFERENCES "users"("id") ON DELETE SET NULL,
        "published_at" timestamp,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS "news_slug_idx" ON "news" ("slug");
      CREATE INDEX IF NOT EXISTS "news_category_idx" ON "news" ("category");
      CREATE INDEX IF NOT EXISTS "news_status_idx" ON "news" ("status");
      CREATE INDEX IF NOT EXISTS "news_published_at_idx" ON "news" ("published_at");
    `);
  } catch (newsErr) {
    console.warn("[Database] news table initialization error:", newsErr);
  }

  // Auto-seed default external demo user if missing
  try {
    const { Users, account: accountTable, members } = await import("./db/schema");
    const { eq } = await import("drizzle-orm");
    const { hashPassword } = await import("better-auth/crypto");

    const EXTERNAL_EMAIL = "external@mucilib.ac.id";
    const existing = await db.query.Users.findFirst({
      where: eq(Users.email, EXTERNAL_EMAIL),
    });

    if (!existing) {
      console.log("[Database] Seeding default demo external user...");
      const now = new Date();
      const extId = "external-seed-001";
      await db.insert(Users).values({
        id: extId,
        name: "Budi Santoso",
        email: EXTERNAL_EMAIL,
        emailVerified: true,
        role: "external",
        createdAt: now,
        updatedAt: now,
      });

      const hashed = await hashPassword("External123456!");
      await db.insert(accountTable).values({
        id: `account-${extId}-credential`,
        accountId: extId,
        providerId: "credential",
        userId: extId,
        password: hashed,
        createdAt: now,
        updatedAt: now,
      });

      await db.insert(members).values({
        userId: extId,
        memberType: "external",
        cardNumber: "EXT-2026-0001",
        cardStatus: "active",
        institution: "Universitas Muhammadiyah Cirebon (Tamu)",
        originRegion: "Cirebon",
        phone: "081234567890",
        createdAt: now,
        updatedAt: now,
      });
      console.log("[Database] Demo external user created successfully.");
    } else if (existing.name === "Budi Santoso (External)") {
      await db
        .update(Users)
        .set({ name: "Budi Santoso", updatedAt: new Date() })
        .where(eq(Users.id, existing.id));
      console.log("[Database] Cleaned up legacy demo external user name to 'Budi Santoso'.");
    }
  } catch (seedErr) {
    console.warn("[Database] Demo external seed skipped:", seedErr);
  }
}

const PORT = Number(process.env.PORT) || 4000;
// ponytail: explicit 0.0.0.0 bind required for Docker container bridge networking (Coolify/Traefik)
app.listen(PORT, "0.0.0.0", async () => {
  console.log(`SERVER RUNNING ON PORT ${PORT}`);
  await runPendingMigrations();
  initCronJobs();
  initBookingCancelScheduler();
});
