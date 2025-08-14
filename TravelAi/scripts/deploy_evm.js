/**
 * scripts/deploy_evm.js
 *
 * Deploys the TRAVELAI ecosystem on an EVM network using Hardhat.
 *
 * Contracts:
 *  - TRAVELAI (ERC20 token)
 *  - TimeCapsuleNFT (ERC721 for prediction capsules)
 *  - TimelineArchive (on-chain prediction log)
 *  - PredictionPool (pooling + payout logic)
 *
 * Features:
 *  - Saves deployed addresses in deployments.json
 *  - Auto-verifies contracts if ETHERSCAN_API_KEY is set
 *  - Handles gas logging and network metadata
 */

const fs = require("fs");
const path = require("path");
const { ethers, run, network } = require("hardhat");

// Path to store addresses
const deploymentsFile = path.join(__dirname, "..", "deployments.json");

// Write addresses to file
function saveDeployment(name, address, chainId) {
  let deployments = {};
  if (fs.existsSync(deploymentsFile)) {
    deployments = JSON.parse(fs.readFileSync(deploymentsFile, "utf8"));
  }
  if (!deployments[chainId]) deployments[chainId] = {};
  deployments[chainId][name] = address;
  fs.writeFileSync(deploymentsFile, JSON.stringify(deployments, null, 2));
  console.log(`📄 Saved ${name} at ${address} for chain ${chainId}`);
}

// Try Etherscan verification
async function verify(address, args = []) {
  if (!process.env.ETHERSCAN_API_KEY) {
    console.log(`⚠️  Skipping verification (no ETHERSCAN_API_KEY set).`);
    return;
  }
  try {
    await run("verify:verify", {
      address,
      constructorArguments: args,
    });
    console.log(`✅ Verified ${address}`);
  } catch (err) {
    console.log(`⚠️  Verification skipped for ${address}: ${err.message}`);
  }
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const { chainId, name: netName } = network.config;

  console.log("-------------------------------------------------");
  console.log(`🚀 Deploying TRAVELAI contracts...`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Network: ${netName} (chainId=${chainId})`);
  console.log("-------------------------------------------------");

  // Deploy TRAVELAI token
  const TravelAI = await ethers.getContractFactory("TRAVELAI");
  const travelai = await TravelAI.deploy();
  await travelai.deployed();
  console.log(`🪙 TRAVELAI deployed at: ${travelai.address}`);
  saveDeployment("TRAVELAI", travelai.address, chainId);
  await verify(travelai.address, []);

  // Deploy TimeCapsuleNFT
  const TimeCapsuleNFT = await ethers.getContractFactory("TimeCapsuleNFT");
  const capsule = await TimeCapsuleNFT.deploy();
  await capsule.deployed();
  console.log(`📦 TimeCapsuleNFT deployed at: ${capsule.address}`);
  saveDeployment("TimeCapsuleNFT", capsule.address, chainId);
  await verify(capsule.address, []);

  // Deploy TimelineArchive
  const TimelineArchive = await ethers.getContractFactory("TimelineArchive");
  const archive = await TimelineArchive.deploy();
  await archive.deployed();
  console.log(`📜 TimelineArchive deployed at: ${archive.address}`);
  saveDeployment("TimelineArchive", archive.address, chainId);
  await verify(archive.address, []);

  // Deploy PredictionPool
  const PredictionPool = await ethers.getContractFactory("PredictionPool");
  const pool = await PredictionPool.deploy(
    travelai.address, // Token address
    archive.address   // Archive address
  );
  await pool.deployed();
  console.log(`🏊 PredictionPool deployed at: ${pool.address}`);
  saveDeployment("PredictionPool", pool.address, chainId);
  await verify(pool.address, [travelai.address, archive.address]);

  console.log("-------------------------------------------------");
  console.log("✅ All contracts deployed successfully.");
  console.log("-------------------------------------------------");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
// Deploy EVM contracts
