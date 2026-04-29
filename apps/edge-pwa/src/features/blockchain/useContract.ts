import { useState, useCallback } from 'react';
import { BrowserProvider, Contract, ethers } from 'ethers';
import { HANDOFF_REGISTRY_ABI, CONTRACT_ADDRESS } from './contractABI';

export interface ChainHandoff {
  sender: string;
  receiver: string;
  merkleRoot: string;
  zkProofHash: string;
  timestamp: number;
  contested: boolean;
  contestReason: string;
}

export interface TxResult {
  txHash: string;
  blockNumber: number;
  gasUsed: string;
}

function getContract(signerOrProvider: any) {
  return new Contract(CONTRACT_ADDRESS, HANDOFF_REGISTRY_ABI, signerOrProvider);
}

export function useContract() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastTx, setLastTx] = useState<TxResult | null>(null);

  const isDeployed = CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000';

  // ─── Record handoff on-chain ──────────────────────────────────────

  const recordHandoff = useCallback(async (
    shipmentId: string,
    receiverAddress: string,
    merkleRootHex: string,
    zkProofHash: string,
  ): Promise<TxResult | null> => {
    if (!window.ethereum) {
      setError('MetaMask not installed');
      return null;
    }
    if (!isDeployed) {
      setError('Contract not deployed. Run: pnpm hardhat deploy --network ganache');
      return null;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = getContract(signer);

      // Ensure merkleRoot is exactly 32 bytes
      const merkleRoot = merkleRootHex.startsWith('0x')
        ? merkleRootHex.padEnd(66, '0') as `0x${string}`
        : ('0x' + merkleRootHex.padEnd(64, '0')) as `0x${string}`;

      console.log('[Chain] Sending recordHandoff tx…', { shipmentId, receiverAddress, merkleRoot, zkProofHash });

      const tx = await contract.recordHandoff(shipmentId, receiverAddress, merkleRoot, zkProofHash);
      console.log('[Chain] Tx sent:', tx.hash);

      const receipt = await tx.wait();
      console.log('[Chain] Confirmed in block:', receipt.blockNumber);

      const result: TxResult = {
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
      };

      setLastTx(result);
      setIsSubmitting(false);
      return result;
    } catch (err: any) {
      const msg = err?.reason || err?.message || 'Transaction failed';
      setError(msg);
      setIsSubmitting(false);
      return null;
    }
  }, [isDeployed]);

  // ─── Contest handoff on-chain ─────────────────────────────────────

  const contestHandoff = useCallback(async (
    shipmentId: string,
    reason: string,
  ): Promise<TxResult | null> => {
    if (!window.ethereum) { setError('MetaMask not installed'); return null; }
    if (!isDeployed) { setError('Contract not deployed'); return null; }

    setIsSubmitting(true);
    setError(null);

    try {
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = getContract(signer);

      const tx = await contract.contestHandoff(shipmentId, reason);
      const receipt = await tx.wait();

      const result: TxResult = {
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
      };

      setLastTx(result);
      setIsSubmitting(false);
      return result;
    } catch (err: any) {
      setError(err?.reason || err?.message || 'Transaction failed');
      setIsSubmitting(false);
      return null;
    }
  }, [isDeployed]);

  // ─── Read handoff history ─────────────────────────────────────────

  const getHandoffHistory = useCallback(async (shipmentId: string): Promise<ChainHandoff[]> => {
    if (!window.ethereum || !isDeployed) return [];

    try {
      const provider = new BrowserProvider(window.ethereum);
      const contract = getContract(provider);
      const count: bigint = await contract.getHandoffCount(shipmentId);
      const records: ChainHandoff[] = [];

      for (let i = 0n; i < count; i++) {
        const r = await contract.getHandoff(shipmentId, i);
        records.push({
          sender:        r[0],
          receiver:      r[1],
          merkleRoot:    r[2],
          zkProofHash:   r[3],
          timestamp:     Number(r[4]),
          contested:     r[5],
          contestReason: r[6],
        });
      }

      return records;
    } catch {
      return [];
    }
  }, [isDeployed]);

  return {
    isDeployed,
    isSubmitting,
    error,
    lastTx,
    recordHandoff,
    contestHandoff,
    getHandoffHistory,
    clearError: () => setError(null),
    clearTx: () => setLastTx(null),
  };
}
