import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { routes } from "./routes";

dotenv.config();

const app = express();
app.use(cors()); // Agar FE bisa panggil tanpa error CORS
app.use(express.json());

// Routes
app.use("/api", routes);

const PORT = 4000;

app.get("/", (req, res) => {
  res.json({
    message: "Backend is Running with Bun & Express!",
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
