/**
 * scripts/deploy_all.js
 *
 * Unified deployment runner for:
 *   - EVM Contracts (Hardhat)
 *   - Solana Contracts (web3.js)
 *
 * Usage:
 *   node scripts/deploy_all.js
 *
 * Options:
 *   NETWORK=mainnet node scripts/deploy_all.js
 *   NETWORK=devnet node scripts/deploy_all.js
 */

const { execSync } = require("child_process");
const path = require("path");

function run(cmd, cwd = process.cwd()) {
  console.log(`\n▶ Running: ${cmd}`);
  try {
    execSync(cmd, { stdio: "inherit", cwd });
  } catch (err) {
    console.error(`❌ Failed: ${cmd}`);
    process.exit(1);
  }
}

async function main() {
  console.log("=================================================");
  console.log("🚀 TRAVELAI — Unified Deployment Script");
  console.log("=================================================\n");

  // Select network from ENV or default to dev/test
  const network = process.env.NETWORK || "devnet";
  console.log(`🌍 Target Network: ${network}\n`);

  // --- 1. Deploy EVM Contracts (Hardhat) ---
  console.log("⚡ Deploying EVM contracts...");
  run("npx hardhat run scripts/deploy_evm.js --network localhost");

  // --- 2. Deploy Solana Contracts ---
  console.log("\n⚡ Deploying Solana contracts...");
  const solanaScript = path.join(__dirname, "deploy_solana.ts");
  run(`ts-node ${solanaScript}`, process.cwd());

  console.log("\n=================================================");
  console.log("✅ Deployment Complete for TRAVELAI Ecosystem");
  console.log("=================================================\n");
}

main();
