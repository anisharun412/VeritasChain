// scripts/deploy.cjs
// Run with: pnpm hardhat run scripts/deploy.cjs --network ganache

const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("\n─────────────────────────────────────────────");
  console.log("  VeritasChain — HandoffRegistry Deployment");
  console.log("─────────────────────────────────────────────");
  console.log("  Deployer:", deployer.address);
  console.log("  Balance: ", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  console.log("─────────────────────────────────────────────\n");

  const HandoffRegistry = await ethers.getContractFactory("HandoffRegistry");
  console.log("  Deploying HandoffRegistry...");
  const registry = await HandoffRegistry.deploy();
  await registry.waitForDeployment();

  const address = await registry.getAddress();
  console.log("\n  ✅ HandoffRegistry deployed to:", address);
  console.log("\n─────────────────────────────────────────────");
  console.log("  Next step:");
  console.log(`  Add this to apps/edge-pwa/.env.local:`);
  console.log(`  VITE_CONTRACT_ADDRESS=${address}`);
  console.log("─────────────────────────────────────────────\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
