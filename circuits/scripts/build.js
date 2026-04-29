const { execSync } = require("child_process");
const { mkdirSync } = require("fs");
const { join } = require("path");

const circuits = ["temp_range", "doc_match", "freshness_model"];
const rootDir = join(__dirname, "..", "..");
const buildDir = join(__dirname, "..", "build");

mkdirSync(buildDir, { recursive: true });

for (const name of circuits) {
  const cmd = `circom ${name}.circom -l node_modules --r1cs --wasm --sym -o "${buildDir}"`;
  execSync(cmd, { stdio: "inherit", cwd: join(__dirname, "..") });

  // Generate a dummy zkey for the circuit
  try {
    console.log(`Generating zkey for ${name}...`);
    // ptau needs to be downloaded or generated. For testing, we can generate a small one.
    // If pot12_final.ptau doesn't exist, we create it once.
    const ptauFile = join(buildDir, "pot12_final.ptau");
    if (!require("fs").existsSync(ptauFile)) {
      execSync(`npx snarkjs powersoftau new bn128 12 pot12_0000.ptau -v`, { stdio: "inherit", cwd: buildDir });
      execSync(`npx snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau --name="First contribution" -v -e="some random text"`, { stdio: "inherit", cwd: buildDir });
      execSync(`npx snarkjs powersoftau prepare phase2 pot12_0001.ptau pot12_final.ptau -v`, { stdio: "inherit", cwd: buildDir });
    }
    
    // Generate zkey
    const r1csFile = join(buildDir, `${name}.r1cs`);
    const zkeyFile = join(buildDir, `${name}_final.zkey`);
    execSync(`npx snarkjs groth16 setup "${r1csFile}" "pot12_final.ptau" "${zkeyFile}"`, { stdio: "inherit", cwd: buildDir });
    
    // Copy wasm to root of buildDir to match what vite-plugin-static-copy expects
    const wasmSource = join(buildDir, `${name}_js`, `${name}.wasm`);
    const wasmDest = join(buildDir, `${name}.wasm`);
    require("fs").copyFileSync(wasmSource, wasmDest);
    
  } catch(e) {
    console.error(`Failed to generate zkey for ${name}:`, e.message);
  }
}

console.log("Circuits built to:", buildDir);
