import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { routes } from "./routes";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth";
import path from "path";
import { swaggerSpec } from "./config/swagger";
import swaggerUi from "swagger-ui-express";
import { generalLimiter } from "./middleware/rateLimiter";

dotenv.config();

const app = express();

app.set("trust proxy", true);

app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL || "http://localhost:5173",
      "http://localhost:4173",
    ],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, "../public")));

// Swagger UI using swagger-ui-express
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// General rate limiter for all API routes (baseline protection)
app.use("/api", generalLimiter);

// Routes
app.use("/api", routes);

// Better Auth Handler
app.all("/api/auth/*path", toNodeHandler(auth));

const PORT = process.env.PORT || 4000;

app.get("/", (req, res) => {
  res.redirect("/docs");
});

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

app.listen(PORT, () => {
  console.log(`SERVER RUNNING ON PORT ${PORT}`);
});
