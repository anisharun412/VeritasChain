/**
 * ZK proof verification logic
 */

import { TemperatureProof } from '@veritaschain/types';

// Mock verification key - in production, this would be the actual Groth16 verification key
const MOCK_VERIFICATION_KEY = {
  vk_alpha_1: [1, 2],
  vk_beta_2: [[1, 2], [3, 4]],
  vk_gamma_2: [[1, 2], [3, 4]],
  vk_delta_2: [[1, 2], [3, 4]],
  vk_alphabeta_12: [[[1, 2], [3, 4]], [[5, 6], [7, 8]]],
  IC: [[1, 2], [3, 4], [5, 6]],
};

export async function verifyTemperatureProof(proof: TemperatureProof): Promise<boolean> {
  try {
    // In production, use snarkjs library to verify the proof
    // For MVP, mock verification based on proof format
    
    if (!proof.proof || !proof.publicInputs) {
      return false;
    }

    // Check if all readings are within range
    const minTemp = proof.publicInputs.minTemp;
    const maxTemp = proof.publicInputs.maxTemp;
    const allInRange = proof.readings.every(r => r >= minTemp && r <= maxTemp);

    if (allInRange !== proof.publicInputs.allInRange) {
      return false;
    }

    // Mock Groth16 verification
    return proof.proof.length >= 100 && allInRange;
  } catch (error) {
    console.error('Proof verification error:', error);
    return false;
  }
}

export async function verifyTemperatureCompliance(
  readings: number[],
  minTemp: number = 2,
  maxTemp: number = 8
): Promise<boolean> {
  return readings.every(r => r >= minTemp && r <= maxTemp);
}

export interface ProofVerificationResult {
  isValid: boolean;
  compliant: boolean;
  minTemp: number;
  maxTemp: number;
  outOfRangeReadings: number[];
  message: string;
}

export async function analyzeProof(proof: TemperatureProof): Promise<ProofVerificationResult> {
  const minTemp = proof.publicInputs.minTemp;
  const maxTemp = proof.publicInputs.maxTemp;
  const outOfRangeReadings = proof.readings.filter(r => r < minTemp || r > maxTemp);
  const isValid = await verifyTemperatureProof(proof);
  const compliant = outOfRangeReadings.length === 0;

  let message = '';
  if (isValid && compliant) {
    message = `✓ All ${proof.readings.length} readings within range (${minTemp}°C - ${maxTemp}°C)`;
  } else if (isValid && !compliant) {
    message = `✕ ${outOfRangeReadings.length} out-of-range readings detected`;
  } else {
    message = '✕ Proof verification failed';
  }

  return {
    isValid,
    compliant,
    minTemp,
    maxTemp,
    outOfRangeReadings,
    message,
  };
}
