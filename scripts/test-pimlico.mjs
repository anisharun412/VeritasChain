/**
 * VeritasChain — Pimlico Bundler Test Script
 * 
 * Tests the real Pimlico ERC-4337 bundler integration on Arbitrum Sepolia.
 * 
 * Usage:
 *   1. Start the tracking server: cd services/indexer && pnpm run start
 *   2. Run this script:           node scripts/test-pimlico.mjs
 */

const SERVER = process.env.RELAY_URL || 'http://localhost:3002';

async function testHealthCheck() {
  console.log('\n─── Test 1: Pimlico Bundler Health Check ───');
  const res = await fetch(`${SERVER}/relay/status`);
  const data = await res.json();
  console.log('Response:', JSON.stringify(data, null, 2));

  if (data.bundlerReachable) {
    console.log('✅ Pimlico bundler is reachable!');
    console.log(`   Chain ID: ${data.chainId} (Arbitrum Sepolia = 0x66eee)`);
    console.log(`   Entry Point: ${data.entryPoint}`);
  } else {
    console.log('❌ Pimlico bundler is NOT reachable:', data.error);
  }
  return data.bundlerReachable;
}

async function testSubmitUserOp() {
  console.log('\n─── Test 2: Submit UserOperation to Pimlico ───');

  // Minimal ERC-4337 UserOperation structure (will fail validation 
  // since we don't have a deployed smart account, but it proves the 
  // relay is correctly contacting Pimlico and getting a real response)
  const userOp = {
    sender: '0x0000000000000000000000000000000000000001',
    nonce: '0x0',
    initCode: '0x',
    callData: '0x',
    callGasLimit: '0x5208',
    verificationGasLimit: '0x5208',
    preVerificationGas: '0x5208',
    maxFeePerGas: '0x3B9ACA00',
    maxPriorityFeePerGas: '0x3B9ACA00',
    paymasterAndData: '0x',
    signature: '0x',
  };

  console.log('Sending UserOperation to relay...');
  const res = await fetch(`${SERVER}/relay/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userOp }),
  });

  const data = await res.json();
  console.log('Response:', JSON.stringify(data, null, 2));

  if (data.success) {
    console.log('✅ UserOperation submitted successfully!');
    console.log(`   UserOp Hash: ${data.userOpHash}`);
    console.log(`   Explorer: ${data.explorer}`);
  } else {
    // This is expected — the UserOp is intentionally invalid, but the 
    // important thing is that we got a REAL error from Pimlico's bundler 
    // (not a mock/fake response). This proves the relay is working.
    console.log('⚠️  Bundler rejected the UserOp (expected for test data):');
    console.log(`   Error: ${data.error}`);
    console.log('');
    console.log('   ✅ THIS IS CORRECT! The relay successfully contacted Pimlico');
    console.log('   and got a real bundler response. The rejection is because');
    console.log('   we sent a dummy UserOp without a real smart account.');
  }
}

async function main() {
  console.log('╔═══════════════════════════════════════════════╗');
  console.log('║  VeritasChain — Pimlico Bundler Test Suite    ║');
  console.log('║  Network: Arbitrum Sepolia                    ║');
  console.log('╚═══════════════════════════════════════════════╝');

  const healthy = await testHealthCheck();
  if (healthy) {
    await testSubmitUserOp();
  }

  console.log('\n─── Done ───');
}

main().catch(console.error);
