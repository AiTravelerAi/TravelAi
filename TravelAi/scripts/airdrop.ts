/**
 * scripts/airdrop.ts
 *
 * A robust ERC-20 airdrop script (Hardhat + ethers).
 * - Reads recipients from CSV or JSON
 * - Auto-detects token decimals
 * - Dry-run mode to preview totals
 * - Batching + resume support (--start, --end)
 * - Gas estimation + per-tx logging
 *
 * CSV format (headers optional):
 *   address,amount
 *   0xabc...,12345.67
 *
 * JSON format (array of { address, amount }):
 *   [
 *     {"address": "0xabc...", "amount": "12345.67"},
 *     {"address": "0xdef...", "amount": 42}
 *   ]
 *
 * Run:
 *   npx hardhat run scripts/airdrop.ts --network <network> \
 *     --token 0xYourTRAVELAIAddress \
 *     --file ./recipients.csv \
 *     --batch 50 \
 *     --dry-run
 *
 * Environment:
 *   Uses the signer configured by Hardhat network (e.g. PRIVATE_KEY in hardhat config).
 */

import fs from "fs";
import path from "path";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";

// ---- CLI ARG PARSER (simple) ----
type CliArgs = {
  token: string;
  file: string;
  batch?: number;
  start?: number;
  end?: number;
  dryRun?: boolean;
  decimals?: number; // optional override
};

function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && process.argv[idx + 1] && !process.argv[idx + 1].startsWith("--")) {
    return process.argv[idx + 1];
  }
  return undefined;
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function parseArgs(): CliArgs {
  const token = getArg("--token");
  const file = getArg("--file");
  const batchStr = getArg("--batch");
  const startStr = getArg("--start");
  const endStr = getArg("--end");
  const dryRun = hasFlag("--dry-run") || hasFlag("--dryrun") || hasFlag("--dry");
  const decimalsStr = getArg("--decimals");

  if (!token) throw new Error("Missing --token <ERC20 address>");
  if (!file) throw new Error("Missing --file <path to CSV/JSON>");

  return {
    token,
    file,
    batch: batchStr ? parseInt(batchStr, 10) : 50,
    start: startStr ? parseInt(startStr, 10) : 0,
    end: endStr ? parseInt(endStr, 10) : undefined,
    dryRun,
    decimals: decimalsStr ? parseInt(decimalsStr, 10) : undefined,
  };
}

// ---- ERC20 MINIMAL ABI ----
const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
];

// ---- TYPES ----
type Recipient = {
  address: string;
  amount: string | number; // human units
};

// ---- FILE LOADERS ----
function loadRecipients(filePath: string): Recipient[] {
  const ext = path.extname(filePath).toLowerCase();
  const raw = fs.readFileSync(filePath, "utf8").trim();

  if (ext === ".json") {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) throw new Error("JSON must be an array of {address,amount}");
    return arr;
  }

  // Very small CSV parser (address,amount)
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  // drop header if present
  const startIdx =
    lines[0].toLowerCase().includes("address") && lines[0].toLowerCase().includes("amount")
      ? 1
      : 0;

  const recipients: Recipient[] = [];
  for (let i = startIdx; i < lines.length; i++) {
    const parts = lines[i].split(",").map((s) => s.trim());
    if (parts.length < 2) continue;
    const [address, amount] = parts;
    recipients.push({ address, amount });
  }
  return recipients;
}

// ---- VALIDATION ----
function isValidAddress(addr: string): boolean {
  try {
    ethers.utils.getAddress(addr);
    return true;
  } catch {
    return false;
  }
}

// ---- MAIN ----
async function main() {
  const args = parseArgs();

  const [signer] = await ethers.getSigners();
  const signerAddr = await signer.getAddress();
  const network = await ethers.provider.getNetwork();

  console.log("--------------------------------------------------");
  console.log("Airdrop starting...");
  console.log("Network:        ", network.name, `(${network.chainId})`);
  console.log("Signer:         ", signerAddr);
  console.log("Token:          ", args.token);
  console.log("Recipients file:", args.file);
  console.log("Batch size:     ", args.batch);
  console.log("Start index:    ", args.start);
  if (args.end !== undefined) console.log("End index:      ", args.end);
  console.log("Dry run:        ", args.dryRun ? "YES" : "NO");
  console.log("Decimals ovrd.: ", args.decimals ?? "(auto)");
  console.log("--------------------------------------------------");

  // Load token
  const token = new ethers.Contract(args.token, ERC20_ABI, signer);
  const [name, symbol] = await Promise.all([token.name(), token.symbol()]);
  const decimals: number =
    args.decimals !== undefined ? args.decimals : (await token.decimals());

  const signerBal = await token.balanceOf(signerAddr);
  console.log(`Token info: ${name} (${symbol}), decimals=${decimals}`);
  console.log(`Signer token balance: ${ethers.utils.formatUnits(signerBal, decimals)} ${symbol}`);

  // Load recipients
  const allRecipients = loadRecipients(args.file)
    .map((r, idx) => ({
      index: idx,
      address: r.address,
      amount: r.amount,
    }))
    .filter((r) => isValidAddress(r.address));

  const start = Math.max(0, args.start || 0);
  const end = args.end !== undefined ? Math.min(args.end, allRecipients.length) : allRecipients.length;
  const recipients = allRecipients.slice(start, end);

  if (recipients.length === 0) {
    console.log("No recipients to process in the selected range.");
    return;
  }

  // Compute total amount
  let totalHuman = "0";
  let totalWei = BigNumber.from(0);
  for (const r of recipients) {
    const human = typeof r.amount === "number" ? r.amount.toString() : r.amount;
    const wei = ethers.utils.parseUnits(human, decimals);
    totalWei = totalWei.add(wei);
    totalHuman = (Number(totalHuman) + Number(human)).toString();
  }

  console.log(`Recipients in scope: ${recipients.length}`);
  console.log(`Total to send:       ${ethers.utils.formatUnits(totalWei, decimals)} ${symbol}`);
  if (totalWei.gt(signerBal)) {
    throw new Error("Insufficient token balance on signer to cover total airdrop.");
  }

  if (args.dryRun) {
    console.log("Dry run complete. No transactions sent.");
    return;
  }

  // Send in batches
  const batchSize = Math.max(1, args.batch || 50);
  let sentCount = 0;
  let txCount = 0;

  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);

    console.log(
      `\nProcessing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(
        recipients.length / batchSize
      )} (${batch.length} recipients)...`
    );

    // Send sequentially (safer for RPC / nonces; adjust to parallel if needed)
    for (const r of batch) {
      const human = typeof r.amount === "number" ? r.amount.toString() : r.amount;
      const amountWei = ethers.utils.parseUnits(human, decimals);

      // Estimate gas (optional)
      try {
        const gas = await token.estimateGas.transfer(r.address, amountWei);
        // You can add a margin if you like:
        // const tx = await token.transfer(r.address, amountWei, { gasLimit: gas.mul(12).div(10) });
        const tx = await token.transfer(r.address, amountWei);
        txCount++;
        console.log(
          `#${r.index} -> ${r.address} : ${human} ${symbol} | tx: ${tx.hash} | estGas: ${gas.toString()}`
        );
        await tx.wait(1);
        sentCount++;
      } catch (err: any) {
        console.error(
          `ERROR sending to ${r.address} amount=${human} ${symbol} (idx ${r.index}):`,
          err?.message || err
        );
        // Continue; do not stop entire airdrop
      }
    }
  }

  console.log("\n--------------------------------------------------");
  console.log("Airdrop finished.");
  console.log(`Recipients attempted: ${recipients.length}`);
  console.log(`Successful transfers: ${sentCount}`);
  console.log(`Transactions sent:    ${txCount}`);
  console.log("--------------------------------------------------");
}

// Execute
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
