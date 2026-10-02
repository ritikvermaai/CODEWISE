import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import routes from "./routes.js";
import { getHealth, renderHealthPage } from "./services/health.js";

const app = express();

// Render runs Express behind a reverse proxy.
app.set("trust proxy", 1);

// Public backend diagnostics.
// These routes intentionally sit before API rate limiting and authentication
// so UptimeRobot/browser checks can reach them.
app.get("/kaisahai.json", async (req, res) => {
  try {
    const health = await getHealth();
    res
      .status(health.status === "unhealthy" ? 503 : 200)
      .json(health);
  } catch (error) {
    res.status(503).json({
      status: "unhealthy",
      service: "CodeWise API",
      message: error.message || "Health check failed"
    });
  }
});

app.get("/kaisahai", async (req, res) => {
  try {
    const health = await getHealth();
    res
      .status(health.status === "unhealthy" ? 503 : 200)
      .type("html")
      .send(renderHealthPage(health));
  } catch (error) {
    const safeMessage = String(error.message || "Health check failed")
      .replace(/[<>&]/g, "");
    res
      .status(503)
      .type("html")
      .send(`<h1>CodeWise backend health check failed</h1><p>${safeMessage}</p>`);
  }
});

// Simple liveness endpoint for quick checks.
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "CodeWise API"
  });
});

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173"
  })
);

app.use(express.json({ limit: "200kb" }));

app.use(
  "/api",
  rateLimit({
    windowMs: 60_000,
    limit: 120,
    standardHeaders: true,
    legacyHeaders: false
  })
);

app.use("/api", routes);

app.use((error, req, res, next) => {
  console.error(error);
  res
    .status(error.status || 500)
    .json({ message: error.message || "Internal server error" });
});

export default app;
