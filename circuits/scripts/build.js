const { execSync } = require("child_process");
const { mkdirSync } = require("fs");
const { join } = require("path");

const circuits = ["temp_range", "doc_match", "freshness_model"];
const rootDir = join(__dirname, "..", "..");
const buildDir = join(__dirname, "..", "build");

mkdirSync(buildDir, { recursive: true });

for (const name of circuits) {
  
const cmd = `circom ${name}.circom -l node_modules --r1cs --wasm --sym -o 
${buildDir}`;
  
  execSync(cmd, { stdio: "inherit", cwd: join(__dirname, "..") });
}

console.log("Circuits built to:", buildDir);
