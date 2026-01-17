import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { routes } from "./routes";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth";

dotenv.config();

const app = express();

app.set("trust proxy", true);

app.use(
  cors({
    origin: process.env.FRONTEND_URL, // Ganti sesuai URL frontend Anda
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json());

// Better Auth Handler
app.all("/api/auth/*path", toNodeHandler(auth));

// Routes
app.use("/api", routes);

const PORT = process.env.PORT || 4000;

app.get("/", (req, res) => {
  res.json({
    message: "Backend is Running with Node.js & Express!",
    status: "OK",
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

app.listen(PORT, () => {
  console.log(`SERVER RUNNING ON PORT ${PORT}`);
});
