import { execSync } from "child_process";
import { mkdirSync } from "fs";
import { join, resolve } from "path";

const circuitName = process.env.CIRCUIT_NAME || "temperature_range";
const circuitDir = resolve(process.env.CIRCUIT_DIR || "./circuits");
const artifactsDir = resolve(process.env.ARTIFACTS_DIR || "./artifacts");
const ptauPath = resolve(process.env.PTAU_PATH || join(artifactsDir, "pot12_final.ptau"));

mkdirSync(artifactsDir, { recursive: true });

const circuitFile = join(circuitDir, `${circuitName}.circom`);
const wasmPath = join(artifactsDir, `${circuitName}_js`, `${circuitName}.wasm`);
const r1csPath = join(artifactsDir, `${circuitName}.r1cs`);
const zkeyPath = join(artifactsDir, `${circuitName}.zkey`);
const zkeyFinalPath = join(artifactsDir, `${circuitName}_final.zkey`);
const vkeyPath = join(artifactsDir, "verification_key.json");
const ptauSeedPath = join(artifactsDir, "pot12_0000.ptau");
const ptauContribPath = join(artifactsDir, "pot12_0001.ptau");


const run = (cmd) => {
  execSync(cmd, { stdio: "inherit" });
};

const ensureCircom2 = () => {
  const versionRaw = execSync("circom --version", { encoding: "utf8" }).trim();
  const match = versionRaw.match(/(\d+)\.(\d+)\.(\d+)/);
  const major = match ? Number(match[1]) : NaN;
  if (!Number.isFinite(major) || major < 2) {
    throw new Error(
      `Circom 2.x is required for this prover (found ${versionRaw}). Install Circom 2.x and retry.`
    );
  }
};

ensureCircom2();

run(`circom "${circuitFile}" --r1cs --wasm --sym -o "${artifactsDir}"`);

if (!ptauPath) {
  throw new Error("PTAU_PATH must be set");
}

run(`snarkjs powersoftau new bn128 12 "${ptauSeedPath}" -v`);
run(`snarkjs powersoftau contribute "${ptauSeedPath}" "${ptauContribPath}" --name="dev" -e="dev" -v`);
run(`snarkjs powersoftau prepare phase2 "${ptauContribPath}" "${ptauPath}" -v`);
run(`snarkjs groth16 setup "${r1csPath}" "${ptauPath}" "${zkeyPath}"`);
run(`snarkjs zkey contribute "${zkeyPath}" "${zkeyFinalPath}" --name="dev" -e="dev" -v`);
run(`snarkjs zkey export verificationkey "${zkeyFinalPath}" "${vkeyPath}"`);

console.log("Artifacts generated:");
console.log(`  WASM: ${wasmPath}`);
console.log(`  ZKEY: ${zkeyFinalPath}`);
console.log(`  VKEY: ${vkeyPath}`);
