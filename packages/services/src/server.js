import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import os from "os";

import proverRouter from "./routes/prover.js";
import vaultRouter from "./routes/vault.js";
import relayerRouter from "./routes/relayer.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 4000;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Routes
app.use("/api/proof", proverRouter);
app.use("/api/vault", vaultRouter);
app.use("/api/relay", relayerRouter);

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ error: "not_found" });
});

// Express error handler — catch body-parser JSON errors and other errors
app.use((err, req, res, next) => {
  console.error("Express error:", err && err.stack ? err.stack : err);
  // body-parser sets `err.type === 'entity.parse.failed'` on JSON parse errors
  if (err && (err.type === "entity.parse.failed" || err instanceof SyntaxError)) {
    return res.status(400).json({ error: "invalid_json" });
  }
  const status = (err && err.status) || 500;
  const message = (err && err.message) || "internal_server_error";
  res.status(status).json({ error: message });
});

app.listen(port, () => {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const net of Object.values(interfaces)) {
    for (const address of net || []) {
      if (address.family === "IPv4" && !address.internal) {
        addresses.push(address.address);
      }
    }
  }

  console.log(`Off-chain services running on port ${port}`);
  if (addresses.length > 0) {
    console.log("Available on:");
    for (const address of addresses) {
      console.log(`  http://${address}:${port}`);
    }
  }
});

// Keep process alive on unexpected rejections/exceptions — log for diagnostics
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err && err.stack ? err.stack : err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});
