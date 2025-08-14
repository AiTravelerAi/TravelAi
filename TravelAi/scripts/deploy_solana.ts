/**
 * scripts/deploy_solana.ts
 *
 * Deploys the TRAVELAI ecosystem on Solana:
 *  - SPL Token (TRAVELAI)
 *  - NFT Mint for TimeCapsules
 *  - Program Accounts for Timeline Archive
 *
 * Requirements:
 *  - `@solana/web3.js`
 *  - `@solana/spl-token`
 *  - Wallet keypair file (.json)
 */

import {
  Connection,
  Keypair,
  PublicKey,
  clusterApiUrl,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
  Transaction,
  SystemProgram,
} from "@solana/web3.js";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import fs from "fs";
import path from "path";

// Deployments file shared with EVM
const deploymentsFile = path.join(__dirname, "..", "deployments.json");

function saveDeployment(name: string, address: string, network: string) {
  let deployments: any = {};
  if (fs.existsSync(deploymentsFile)) {
    deployments = JSON.parse(fs.readFileSync(deploymentsFile, "utf8"));
  }
  if (!deployments[network]) deployments[network] = {};
  deployments[network][name] = address;
  fs.writeFileSync(deploymentsFile, JSON.stringify(deployments, null, 2));
  console.log(`📄 Saved ${name} at ${address} for ${network}`);
}

async function main() {
  // Choose cluster
  const network = process.env.SOLANA_NETWORK || "devnet";
  const connection = new Connection(clusterApiUrl(network), "confirmed");

  // Load wallet
  const keypairPath = process.env.SOLANA_KEYPAIR || path.join(process.env.HOME || ".", ".config", "solana", "id.json");
  const secret = JSON.parse(fs.readFileSync(keypairPath, "utf8"));
  const payer = Keypair.fromSecretKey(new Uint8Array(secret));

  console.log("-------------------------------------------------");
  console.log(`🚀 Deploying TRAVELAI contracts on Solana (${network})`);
  console.log(`Deployer: ${payer.publicKey.toBase58()}`);
  console.log("-------------------------------------------------");

  // Airdrop for devnet
  if (network === "devnet") {
    const airdropSig = await connection.requestAirdrop(payer.publicKey, 2 * LAMPORTS_PER_SOL);
    await connection.confirmTransaction(airdropSig);
    console.log("💸 Airdropped 2 SOL to deployer (devnet).");
  }

  // 1. Create SPL Token (TRAVELAI)
  const mint = await createMint(
    connection,
    payer,
    payer.publicKey,  // mint authority
    null,             // freeze authority disabled
    9                 // decimals
  );
  console.log(`🪙 TRAVELAI SPL Token created: ${mint.toBase58()}`);
  saveDeployment("TRAVELAI_SPL", mint.toBase58(), network);

  // Create an ATA (Associated Token Account) for deployer
  const tokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    payer.publicKey
  );

  // Mint initial supply (50% of total)
  const totalSupply = BigInt(420_000_000_000) * BigInt(1e9); // with decimals
  const presaleSupply = totalSupply / BigInt(2);
  await mintTo(
    connection,
    payer,
    mint,
    tokenAccount.address,
    payer.publicKey,
    Number(presaleSupply)
  );
  console.log(`💰 Minted presale supply: ${presaleSupply.toString()} tokens`);
  saveDeployment("TRAVELAI_PresaleVault", tokenAccount.address.toBase58(), network);

  // 2. Initialize TimeCapsuleNFT (Placeholder Mint Account)
  const capsuleNFT = await createMint(
    connection,
    payer,
    payer.publicKey,
    null,
    0 // NFT, no decimals
  );
  console.log(`📦 TimeCapsuleNFT Mint created: ${capsuleNFT.toBase58()}`);
  saveDeployment("TimeCapsuleNFT_Mint", capsuleNFT.toBase58(), network);

  // 3. Create Timeline Archive PDA (simplified mock)
  const archiveAccount = Keypair.generate();
  const lamports = await connection.getMinimumBalanceForRentExemption(512);
  const createAccountIx = SystemProgram.createAccount({
    fromPubkey: payer.publicKey,
    newAccountPubkey: archiveAccount.publicKey,
    lamports,
    space: 512,
    programId: payer.publicKey, // placeholder program ownership
  });
  const tx = new Transaction().add(createAccountIx);
  await sendAndConfirmTransaction(connection, tx, [payer, archiveAccount]);
  console.log(`📜 TimelineArchive Account created: ${archiveAccount.publicKey.toBase58()}`);
  saveDeployment("TimelineArchive_Account", archiveAccount.publicKey.toBase58(), network);

  console.log("-------------------------------------------------");
  console.log("✅ Solana deployment completed.");
  console.log("-------------------------------------------------");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
// Deploy Solana contracts
