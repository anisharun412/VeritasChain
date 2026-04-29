import cors from "cors";
import dotenv from "dotenv";
import express from "express";

import { generateProof } from "./proof/groth16.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 4001;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/proof/generate", async (req, res) => {
  try {
    const { temperatures, min, max } = req.body || {};

    if (!Array.isArray(temperatures) || temperatures.length === 0) {
      return res.status(400).json({ error: "temperatures must be a non-empty array" });
    }
    if (typeof min !== "number" || typeof max !== "number") {
      return res.status(400).json({ error: "min and max must be numbers" });
    }
    if (min > max) {
      return res.status(400).json({ error: "min must be <= max" });
    }
    if (!temperatures.every((value) => typeof value === "number")) {
      return res.status(400).json({ error: "temperatures must be numbers" });
    }

    const result = await generateProof({ temperatures, min, max });
    return res.json(result);
  } catch (error) {
    console.error("Prover error:", error);
    return res.status(500).json({ error: "failed to generate proof" });
  }
});

app.listen(port, () => {
  console.log(`Local prover running on port ${port}`);
});
