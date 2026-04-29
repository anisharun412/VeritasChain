import { Router } from "express";
import axios from "axios";
import { ethers } from "ethers";

const router = Router();

const shouldUseProver = (url) => {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const selfPort = Number(process.env.PORT) || 4000;
    const isSelfHost = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    return !(isSelfHost && Number(parsed.port || selfPort) === selfPort);
  } catch {
    return false;
  }
};

const areTemperaturesValid = (temperatures, min, max) => {
  if (!Array.isArray(temperatures) || temperatures.length === 0) {
    return false;
  }
  if (typeof min !== "number" || typeof max !== "number") {
    return false;
  }
  if (min > max) {
    return false;
  }
  return temperatures.every(
    (value) => typeof value === "number" && value >= min && value <= max
  );
};

router.post("/generate", async (req, res) => {
  const { temperatures, min, max, docHash } = req.body || {};

  if (!docHash || !ethers.isHexString(docHash, 32)) {
    return res.status(400).json({ error: "docHash must be 32-byte hex" });
  }

  const proverUrl = process.env.PROVER_URL;
  if (shouldUseProver(proverUrl)) {
    try {
      const response = await axios.post(`${proverUrl}/api/proof/generate`, {
        temperatures,
        min,
        max,
        docHash,
      });
      return res.json(response.data);
    } catch (error) {
      console.warn("External prover failed, falling back to mock.");
    }
  }

  const valid = areTemperaturesValid(temperatures, min, max);
  if (!valid) {
    return res.status(400).json({ error: "temperatures out of range" });
  }

  return res.json({
    proof: "0x1234",
    publicInputs: [1, docHash],
  });
});

export default router;
