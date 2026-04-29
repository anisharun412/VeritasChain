import express, { Router } from "express";
import crypto from "crypto";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import secrets from "secrets.js-grempe";
import axios from "axios";
import { Web3Storage, File } from "web3.storage";

const router = Router();
const vaultData = new Map();
const courtOrders = new Set(["0xdeadbeef"]); // Demo hash

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const storageDir = join(__dirname, "..", "..", "vault-storage");
const thresholdServiceUrl = process.env.THRESHOLD_BLS_URL;

mkdirSync(storageDir, { recursive: true });

const rawBodyParser = (req, res, next) => {
  const contentType = req.headers["content-type"] || "";
  const match = contentType.match(/boundary=(.*)$/);
  if (!match) {
    return res.status(400).json({ error: "missing multipart boundary" });
  }
  const boundary = match[1].trim().replace(/^"|"$/g, "");
  req.multipartBoundary = boundary;

  const chunks = [];
  req.on("data", (chunk) => chunks.push(chunk));
  req.on("end", () => {
    req.rawBody = Buffer.concat(chunks);
    next();
  });
};

const parseMultipart = (buffer, boundary) => {
  const boundaryText = `--${boundary}`;
  const raw = buffer.toString("binary");
  const parts = raw.split(boundaryText).slice(1, -1);

  const fields = {};
  let file = null;

  for (const part of parts) {
    const trimmed = part.replace(/^\r\n/, "").replace(/\r\n$/, "");
    if (!trimmed) continue;

    const splitIndex = trimmed.indexOf("\r\n\r\n");
    if (splitIndex === -1) continue;

    const headerText = trimmed.slice(0, splitIndex);
    const bodyText = trimmed.slice(splitIndex + 4);
    const headers = headerText.split("\r\n");

    const disposition = headers.find((h) => h.toLowerCase().startsWith("content-disposition"));
    if (!disposition) continue;

    const nameMatch = disposition.match(/name="([^"]+)"/);
    const filenameMatch = disposition.match(/filename="([^"]+)"/);
    const name = nameMatch ? nameMatch[1] : undefined;

    const contentTypeHeader = headers.find((h) => h.toLowerCase().startsWith("content-type"));
    const contentType = contentTypeHeader ? contentTypeHeader.split(":")[1].trim() : "application/octet-stream";

    const bodyBuffer = Buffer.from(bodyText.replace(/\r\n$/, ""), "binary");

    if (filenameMatch) {
      file = {
        fieldName: name,
        filename: filenameMatch[1],
        contentType,
        data: bodyBuffer,
      };
    } else if (name) {
      fields[name] = bodyBuffer.toString("utf8").replace(/\r\n$/, "");
    }
  }

  return { fields, file };
};

const encryptBuffer = (buffer) => {
  const key = crypto.randomBytes(32);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const tag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, tag, encrypted]);
  return { key, payload };
};

const splitKey = async (keyHex) => {
  if (thresholdServiceUrl) {
    const response = await axios.post(`${thresholdServiceUrl}/split`, {
      secret: keyHex,
      shares: 5,
      threshold: 3,
    });
    if (Array.isArray(response.data?.shares)) {
      return response.data.shares;
    }
    throw new Error("threshold-bls split failed");
  }

  return secrets.share(keyHex, 5, 3);
};

const combineKey = async (shares) => {
  if (thresholdServiceUrl) {
    const response = await axios.post(`${thresholdServiceUrl}/combine`, {
      shares,
    });
    if (typeof response.data?.secret === "string") {
      return response.data.secret;
    }
    throw new Error("threshold-bls combine failed");
  }

  return secrets.combine(shares);
};

const decryptBuffer = (payload, key) => {
  const iv = payload.subarray(0, 12);
  const tag = payload.subarray(12, 28);
  const ciphertext = payload.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
};

const storeLocally = (payload, shipmentId) => {
  const filePath = join(storageDir, `${shipmentId}.bin`);
  writeFileSync(filePath, payload);
  return `local-${shipmentId}`;
};

const fetchLocal = (shipmentId) => {
  const filePath = join(storageDir, `${shipmentId}.bin`);
  return readFileSync(filePath);
};

router.post("/store", rawBodyParser, async (req, res) => {
  const { fields, file } = parseMultipart(req.rawBody, req.multipartBoundary);
  const shipmentId = fields.shipmentId;

  if (!shipmentId || !file) {
    return res.status(400).json({ error: "shipmentId and document are required" });
  }

  const { key, payload } = encryptBuffer(file.data);
  const keyHex = key.toString("hex");
  let shares;
  try {
    shares = await splitKey(keyHex);
  } catch (error) {
    console.warn("Threshold split failed, using local fallback.");
    shares = secrets.share(keyHex, 5, 3);
  }

  const token = process.env.STORAGE_API_TOKEN;
  let ipfsCid = "";

  if (token) {
    const client = new Web3Storage({ token });
    const storageFile = new File([payload], `${shipmentId}.bin`, {
      type: "application/octet-stream",
    });
    ipfsCid = await client.put([storageFile]);
  } else {
    ipfsCid = storeLocally(payload, shipmentId);
  }

  vaultData.set(shipmentId, {
    ipfsCid,
    encryptedKey: keyHex,
    shares,
  });

  return res.json({ ipfsCid, shares });
});

router.post("/access", express.json(), async (req, res) => {
  const { shipmentId, courtOrderHash, sharesProvided } = req.body || {};
  const entry = vaultData.get(shipmentId);

  if (!entry) {
    return res.status(404).json({ error: "shipment not found" });
  }

  let shares = Array.isArray(sharesProvided) ? sharesProvided.slice(0, 3) : [];
  if (shares.length < 3) {
    if (!courtOrders.has(courtOrderHash)) {
      return res.status(403).json({ error: "insufficient shares or court order" });
    }
    shares = entry.shares.slice(0, 3);
  }

  let keyHex;
  try {
    keyHex = await combineKey(shares);
  } catch (error) {
    console.warn("Threshold combine failed, using local fallback.");
    keyHex = secrets.combine(shares);
  }
  const key = Buffer.from(keyHex, "hex");

  let payload;
  if (entry.ipfsCid.startsWith("local-")) {
    payload = fetchLocal(shipmentId);
  } else {
    const client = new Web3Storage({ token: process.env.STORAGE_API_TOKEN });
    const response = await client.get(entry.ipfsCid);
    if (!response) {
      return res.status(404).json({ error: "ipfs file not found" });
    }
    const files = await response.files();
    payload = Buffer.from(await files[0].arrayBuffer());
  }

  const decrypted = decryptBuffer(payload, key);
  console.log(`Vault access for shipment ${shipmentId}`);

  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=\"${shipmentId}.bin\"`
  );
  return res.send(decrypted);
});

router.post("/register-court-order", express.json(), (req, res) => {
  const { courtOrderHash } = req.body || {};
  if (!courtOrderHash) {
    return res.status(400).json({ error: "courtOrderHash required" });
  }
  courtOrders.add(courtOrderHash);
  return res.json({ ok: true });
});

export default router;
