/**
 * Sender handoff signing logic
 */

import { HandoffBundle, SignedHandoff } from '@veritaschain/types';
import { signData } from '@veritaschain/crypto';
import { computeMerkleRoot } from '@veritaschain/crypto';

export async function signHandoff(
  bundle: HandoffBundle,
  senderPrivateKey: CryptoKey,
  receiverSignature: string
): Promise<SignedHandoff> {
  const bundleJson = JSON.stringify(bundle);
  const senderSig = await signData(bundleJson, senderPrivateKey);
  const merkleRoot = await computeMerkleRoot(bundle.documentHashes);

  return {
    bundle,
    senderSig,
    receiverSig: receiverSignature,
    merkleRoot,
    isContested: false,
  };
}

export async function contestHandoff(
  bundle: HandoffBundle,
  senderPrivateKey: CryptoKey,
  reason: string
): Promise<SignedHandoff> {
  const bundleJson = JSON.stringify(bundle);
  const senderSig = await signData(bundleJson, senderPrivateKey);
  const merkleRoot = await computeMerkleRoot(bundle.documentHashes);

  return {
    bundle,
    senderSig,
    receiverSig: '',
    merkleRoot,
    isContested: true,
    contestReason: reason,
  };
}
