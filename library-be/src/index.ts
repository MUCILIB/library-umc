import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { routes } from "./routes";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth";
import path from "path";
import { swaggerSpec } from "./config/swagger";
import swaggerUi from "swagger-ui-express";
import { generalLimiter } from "./middlewares/rateLimiter";
import { errorMiddleware } from "./middlewares/error.middleware";
import { initCronJobs } from "./cron/fineScheduler";
import { initBookingCancelScheduler } from "./cron/bookingCancelScheduler";

dotenv.config();

const app = express();

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

// Sanitize request body strings to strip dangerous HTML / script tags
function sanitizeValue(value: unknown): unknown {
  if (typeof value === "string") {
    // Strip <script ...>...</script> tags and direct script/html injection tags
    return value
      .replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, "")
      .replace(/<\s*script[^>]*>/gi, "")
      .replace(/<\s*\/\s*script\s*>/gi, "")
      .replace(/javascript:/gi, "");
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value !== null && typeof value === "object") {
    const cleanObj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      cleanObj[k] = sanitizeValue(v);
    }
    return cleanObj;
  }
  return value;
}

app.use((req, _res, next) => {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeValue(req.body);
  }
  next();
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, "../public")));

// Swagger UI using swagger-ui-express
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// General rate limiter for all API routes (baseline protection)
app.use("/api", generalLimiter);

// Better Auth Handler — harus SEBELUM custom routes
// agar semua /api/auth/* (sign-in/email, sign-up/email, dll) ditangani oleh
// better-auth yang bisa meng-set cookie session ke browser
app.all("/api/auth/*path", toNodeHandler(auth));

// Routes
app.use("/api", routes);

app.get("/", (req, res) => {
  res.redirect("/docs");
});

app.get("/health", (req, res) => {
  res.status(200).send("API IS OK");
});

// Error Middleware (MuST be at the end)
app.use(errorMiddleware);

const PORT = Number(process.env.PORT) || 4000;
// ponytail: explicit 0.0.0.0 bind required for Docker container bridge networking (Coolify/Traefik)
app.listen(PORT, "0.0.0.0", () => {
  console.log(`SERVER RUNNING ON PORT ${PORT}`);
  initCronJobs();
  initBookingCancelScheduler();
});
