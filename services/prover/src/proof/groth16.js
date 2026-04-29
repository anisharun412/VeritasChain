import { existsSync } from "fs";
import { join, resolve } from "path";
import { groth16 } from "snarkjs";

const defaultCircuitDir = process.env.CIRCUIT_DIR || "./circuits";
const defaultArtifactsDir = process.env.ARTIFACTS_DIR || "./artifacts";
const circuitName = process.env.CIRCUIT_NAME || "temperature_range";

const getArtifacts = () => {
  const circuitDir = resolve(defaultCircuitDir);
  const artifactsDir = resolve(defaultArtifactsDir);
  const wasmPath = join(artifactsDir, `${circuitName}_js`, `${circuitName}.wasm`);
  const zkeyPath = join(artifactsDir, `${circuitName}_final.zkey`);

  return { circuitDir, artifactsDir, wasmPath, zkeyPath };
};

const assertArtifacts = () => {
  const { wasmPath, zkeyPath } = getArtifacts();

  if (!existsSync(wasmPath)) {
    throw new Error(`Missing WASM artifact: ${wasmPath}`);
  }
  if (!existsSync(zkeyPath)) {
    throw new Error(`Missing zkey artifact: ${zkeyPath}`);
  }
};

export const generateProof = async ({ temperatures, min, max }) => {
  assertArtifacts();
  const { wasmPath, zkeyPath } = getArtifacts();

  const input = {
    temperatures,
    min,
    max,
  };

  const { proof, publicSignals } = await groth16.fullProve(input, wasmPath, zkeyPath);

  return {
    proof,
    publicInputs: publicSignals,
  };
};
