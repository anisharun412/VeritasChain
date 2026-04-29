import { Router } from "express";
import axios from "axios";
import dotenv from "dotenv";
import { ethers } from "ethers";

const router = Router();

dotenv.config();

const getBundlerUrl = () => process.env.BUNDLER_URL;
const getPaymasterAddress = () => process.env.PAYMASTER_ADDRESS || "0x0000000000000000000000000000000000000000";
const getEntryPointAddress = () => process.env.ENTRYPOINT_ADDRESS;

router.post("/submit", async (req, res) => {
  const userOp = req.body;

  if (!userOp || typeof userOp !== "object") {
    return res.status(400).json({ error: "userOperation object required" });
  }

  const bundlerUrl = getBundlerUrl();
  const paymasterAddress = getPaymasterAddress();

  if (!bundlerUrl) {
    return res.status(500).json({ error: "BUNDLER_URL not configured" });
  }

  const entryPoint = userOp.entryPoint || getEntryPointAddress();
  if (!entryPoint || !ethers.isAddress(entryPoint)) {
    return res.status(400).json({ error: "entryPoint is required" });
  }

  const userOpPayload = { ...userOp };
  delete userOpPayload.entryPoint;

  try {
    const response = await axios.post(bundlerUrl, {
      jsonrpc: "2.0",
      id: 1,
      method: "eth_sendUserOperation",
      params: [userOpPayload, entryPoint],
    });

    if (response.data?.result) {
      return res.json({ txHash: response.data.result });
    }

    if (response.data?.error) {
      return res.status(502).json({ error: "bundler_error", details: response.data.error });
    }

    return res.status(502).json({ error: "bundler_unknown_response", details: response.data });
  } catch (error) {
    return res.status(502).json({ error: "bundler_request_failed", details: error?.message });
  }
});

export default router;
