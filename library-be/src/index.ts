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
}

const PORT = Number(process.env.PORT) || 4000;
// ponytail: explicit 0.0.0.0 bind required for Docker container bridge networking (Coolify/Traefik)
app.listen(PORT, "0.0.0.0", async () => {
  console.log(`SERVER RUNNING ON PORT ${PORT}`);
  await runPendingMigrations();
  initCronJobs();
  initBookingCancelScheduler();
});
