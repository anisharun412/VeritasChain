import { useState, useCallback } from 'react';
import { BrowserProvider, Contract, ethers } from 'ethers';
import {
  SHIPMENT_REGISTRY_ABI,
  DWH_VERIFIER_ABI,
  FRESHNESS_SCORE_ABI,
  REGISTRY_ADDRESS,
  DWH_ADDRESS,
  FRESHNESS_ADDRESS,
  allDeployed,
} from './contractABI';

// ─── Types ──────────────────────────────────────────────────────────

export interface TxResult {
  txHash: string;
  blockNumber: number;
  gasUsed: string;
}

export interface ShipmentOnChain {
  sphincsPqMetaHash: string;
  registrarDid: string;
  nfcSealFingerprint: string;
  registrar: string;
  registeredAt: number;
  status: number; // 0=REGISTERED, 1=IN_TRANSIT, 2=DELIVERED, 3=CONTESTED, 4=RECALLED
}

export interface HandoffOnChain {
  shipmentId: string;
  merkleRoot: string;
  prevHandoffHash: string;
  sender: string;
  receiver: string;
  recordedAt: number;
  contested: boolean;
  reasonHash: string;
}

export interface FreshnessOnChain {
  score: number;
  lastUpdatedAt: number;
  lastProofHash: string;
  updateCount: number;
  initialized: boolean;
}

// ─── Status label helper ────────────────────────────────────────────

export const SHIPMENT_STATUS_LABELS = ['Registered', 'In Transit', 'Delivered', 'Contested', 'Recalled'] as const;

// ─── Contract getters ───────────────────────────────────────────────

function getRegistry(signerOrProvider: any) {
  return new Contract(REGISTRY_ADDRESS, SHIPMENT_REGISTRY_ABI, signerOrProvider);
}

function getDWH(signerOrProvider: any) {
  return new Contract(DWH_ADDRESS, DWH_VERIFIER_ABI, signerOrProvider);
}

function getFreshness(signerOrProvider: any) {
  return new Contract(FRESHNESS_ADDRESS, FRESHNESS_SCORE_ABI, signerOrProvider);
}

async function getSigner() {
  if (!window.ethereum) throw new Error('MetaMask not installed');
  const provider = new BrowserProvider(window.ethereum);
  return provider.getSigner();
}

async function getProvider() {
  if (!window.ethereum) throw new Error('MetaMask not installed');
  return new BrowserProvider(window.ethereum);
}

// ─── Hook ───────────────────────────────────────────────────────────

export function useContract() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastTx, setLastTx] = useState<TxResult | null>(null);

  const isDeployed = allDeployed;

  // ─── ShipmentRegistry: Register ─────────────────────────────────

  const registerShipment = useCallback(async (
    metaHashHex: string,
    registrarDid: string,
    sealFingerprintHex: string,
  ): Promise<{ shipmentId: string; tx: TxResult } | null> => {
    if (!isDeployed) { setError('Contracts not deployed'); return null; }
    setIsSubmitting(true); setError(null);
    try {
      const signer = await getSigner();
      const registry = getRegistry(signer);

      const metaHash = ethers.zeroPadValue(metaHashHex.startsWith('0x') ? metaHashHex : '0x' + metaHashHex, 32);
      const sealFP = ethers.zeroPadValue(sealFingerprintHex.startsWith('0x') ? sealFingerprintHex : '0x' + sealFingerprintHex, 32);
      const didBytes = ethers.toUtf8Bytes(registrarDid);

      const tx = await registry.registerShipment(metaHash, didBytes, sealFP);
      const receipt = await tx.wait();

      // Parse shipmentId from event
      const iface = new ethers.Interface(SHIPMENT_REGISTRY_ABI);
      let shipmentId = '';
      for (const log of receipt.logs) {
        try {
          const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
          if (parsed?.name === 'ShipmentRegistered') {
            shipmentId = parsed.args.shipmentId;
            break;
          }
        } catch { /* skip non-matching logs */ }
      }

      const result: TxResult = { txHash: tx.hash, blockNumber: receipt.blockNumber, gasUsed: receipt.gasUsed.toString() };
      setLastTx(result);
      setIsSubmitting(false);
      return { shipmentId, tx: result };
    } catch (err: any) {
      setError(err?.reason || err?.message || 'registerShipment failed');
      setIsSubmitting(false);
      return null;
    }
  }, [isDeployed]);

  // ─── ShipmentRegistry: Get shipment data ────────────────────────

  const getShipment = useCallback(async (shipmentId: string): Promise<ShipmentOnChain | null> => {
    if (!isDeployed) return null;
    try {
      const provider = await getProvider();
      const registry = getRegistry(provider);
      const s = await registry.shipments(shipmentId);
      return {
        sphincsPqMetaHash: s[0],
        registrarDid: ethers.toUtf8String(s[1]),
        nfcSealFingerprint: s[2],
        registrar: s[3],
        registeredAt: Number(s[4]),
        status: Number(s[5]),
      };
    } catch { return null; }
  }, [isDeployed]);

  // ─── ShipmentRegistry: Get total count ──────────────────────────

  const getShipmentCount = useCallback(async (): Promise<number> => {
    if (!isDeployed) return 0;
    try {
      const provider = await getProvider();
      const registry = getRegistry(provider);
      return Number(await registry.shipmentCount());
    } catch { return 0; }
  }, [isDeployed]);

  // ─── DWHVerifier: Record handoff ────────────────────────────────

  const recordHandoff = useCallback(async (
    shipmentId: string,
    merkleRoot: string,
    prevHandoffHash: string,
    sender: string,
    receiver: string,
    senderSig: string,
    receiverSig: string,
  ): Promise<TxResult | null> => {
    if (!isDeployed) { setError('Contracts not deployed'); return null; }
    setIsSubmitting(true); setError(null);
    try {
      const signer = await getSigner();
      const dwh = getDWH(signer);

      const tx = await dwh.recordHandoff(
        shipmentId, merkleRoot, prevHandoffHash,
        sender, receiver, senderSig, receiverSig,
      );
      const receipt = await tx.wait();

      const result: TxResult = { txHash: tx.hash, blockNumber: receipt.blockNumber, gasUsed: receipt.gasUsed.toString() };
      setLastTx(result);
      setIsSubmitting(false);
      return result;
    } catch (err: any) {
      setError(err?.reason || err?.message || 'recordHandoff failed');
      setIsSubmitting(false);
      return null;
    }
  }, [isDeployed]);

  // ─── DWHVerifier: Contest ───────────────────────────────────────

  const contestHandoff = useCallback(async (
    shipmentId: string,
    handoffHash: string,
    reason: string,
  ): Promise<TxResult | null> => {
    if (!isDeployed) { setError('Contracts not deployed'); return null; }
    setIsSubmitting(true); setError(null);
    try {
      const signer = await getSigner();
      const dwh = getDWH(signer);
      const tx = await dwh.contestHandoff(shipmentId, handoffHash, reason);
      const receipt = await tx.wait();
      const result: TxResult = { txHash: tx.hash, blockNumber: receipt.blockNumber, gasUsed: receipt.gasUsed.toString() };
      setLastTx(result);
      setIsSubmitting(false);
      return result;
    } catch (err: any) {
      setError(err?.reason || err?.message || 'contestHandoff failed');
      setIsSubmitting(false);
      return null;
    }
  }, [isDeployed]);

  // ─── DWHVerifier: Get latest handoff ────────────────────────────

  const getLatestHandoff = useCallback(async (shipmentId: string): Promise<HandoffOnChain | null> => {
    if (!isDeployed) return null;
    try {
      const provider = await getProvider();
      const dwh = getDWH(provider);
      const latestHash = await dwh.latestHandoff(shipmentId);
      if (latestHash === ethers.ZeroHash) return null;
      const r = await dwh.handoffRecords(latestHash);
      return {
        shipmentId: r[0], merkleRoot: r[1], prevHandoffHash: r[2],
        sender: r[3], receiver: r[4], recordedAt: Number(r[5]),
        contested: r[6], reasonHash: r[7],
      };
    } catch { return null; }
  }, [isDeployed]);

  // ─── FreshnessScore: Initialize ─────────────────────────────────

  const initializeFreshness = useCallback(async (
    shipmentId: string,
  ): Promise<TxResult | null> => {
    if (!isDeployed) { setError('Contracts not deployed'); return null; }
    setIsSubmitting(true); setError(null);
    try {
      const signer = await getSigner();
      const freshness = getFreshness(signer);
      const tx = await freshness.initialize(shipmentId);
      const receipt = await tx.wait();
      const result: TxResult = { txHash: tx.hash, blockNumber: receipt.blockNumber, gasUsed: receipt.gasUsed.toString() };
      setLastTx(result);
      setIsSubmitting(false);
      return result;
    } catch (err: any) {
      setError(err?.reason || err?.message || 'initializeFreshness failed');
      setIsSubmitting(false);
      return null;
    }
  }, [isDeployed]);

  // ─── FreshnessScore: Get score ──────────────────────────────────

  const getFreshnessScore = useCallback(async (shipmentId: string): Promise<number | null> => {
    if (!isDeployed) return null;
    try {
      const provider = await getProvider();
      const freshness = getFreshness(provider);
      return Number(await freshness.getScore(shipmentId));
    } catch { return null; }
  }, [isDeployed]);

  // ─── FreshnessScore: Get full record ────────────────────────────

  const getFreshnessRecord = useCallback(async (shipmentId: string): Promise<FreshnessOnChain | null> => {
    if (!isDeployed) return null;
    try {
      const provider = await getProvider();
      const freshness = getFreshness(provider);
      const r = await freshness.records(shipmentId);
      return {
        score: Number(r[0]), lastUpdatedAt: Number(r[1]),
        lastProofHash: r[2], updateCount: Number(r[3]), initialized: r[4],
      };
    } catch { return null; }
  }, [isDeployed]);

  // ─── FreshnessScore: Admin set score ────────────────────────────

  const adminSetScore = useCallback(async (
    shipmentId: string,
    newScore: number,
  ): Promise<TxResult | null> => {
    if (!isDeployed) { setError('Contracts not deployed'); return null; }
    setIsSubmitting(true); setError(null);
    try {
      const signer = await getSigner();
      const freshness = getFreshness(signer);
      const tx = await freshness.adminSetScore(shipmentId, newScore);
      const receipt = await tx.wait();
      const result: TxResult = { txHash: tx.hash, blockNumber: receipt.blockNumber, gasUsed: receipt.gasUsed.toString() };
      setLastTx(result);
      setIsSubmitting(false);
      return result;
    } catch (err: any) {
      setError(err?.reason || err?.message || 'adminSetScore failed');
      setIsSubmitting(false);
      return null;
    }
  }, [isDeployed]);

  return {
    isDeployed,
    isSubmitting,
    error,
    lastTx,
    // ShipmentRegistry
    registerShipment,
    getShipment,
    getShipmentCount,
    // DWHVerifier
    recordHandoff,
    contestHandoff,
    getLatestHandoff,
    // FreshnessScore
    initializeFreshness,
    getFreshnessScore,
    getFreshnessRecord,
    adminSetScore,
    // Utils
    clearError: () => setError(null),
    clearTx: () => setLastTx(null),
  };
}
