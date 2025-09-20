import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, Keypair } from "@solana/web3.js";
import { assert } from "chai";

import { TimeTraveler } from "../target/types/time_traveler";

describe("time_traveler program", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.TimeTraveler as Program<TimeTraveler>;

  let registryPda: PublicKey;
  let poolPda: PublicKey;
  let poolVault: PublicKey;
  let contributor = Keypair.generate();
  let mint: PublicKey;

  const signalId = new Uint8Array(32).fill(1); // fake signal id

  it("Initializes the registry", async () => {
    [registryPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("registry")],
      program.programId
    );

    await program.methods
      .initRegistry(provider.wallet.publicKey)
      .accounts({
        payer: provider.wallet.publicKey,
        registry: registryPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const registry = await program.account.registry.fetch(registryPda);
    assert.ok(registry.authority.equals(provider.wallet.publicKey));
  });

  it("Creates a pool", async () => {
    // Use anchor’s built-in Mint helper or airdrop
    mint = await createMint(provider); // helper defined below

    [poolPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("pool"), Buffer.from(signalId)],
      program.programId
    );

    [poolVault] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), poolPda.toBuffer()],
      program.programId
    );

    const now = Math.floor(Date.now() / 1000);
    const openTs = now;
    const closeTs = now + 60; // closes in 1 minute

    await program.methods
      .createPool([...signalId], new anchor.BN(openTs), new anchor.BN(closeTs))
      .accounts({
        authority: provider.wallet.publicKey,
        registry: registryPda,
        pool: poolPda,
        mint,
        poolVault,
        systemProgram: SystemProgram.programId,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    const pool = await program.account.pool.fetch(poolPda);
    assert.equal(pool.status.open, {}.open); // PoolStatus::Open
  });

  it("Contributes to a pool", async () => {
    const userTokenAccount = await createTokenAccount(
      provider,
      mint,
      contributor.publicKey
    );

    // Mint some tokens to contributor
    await mintTo(
      provider,
      mint,
      userTokenAccount,
      1000,
      provider.wallet.publicKey
    );

    const [contribPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("contrib"), poolPda.toBuffer(), contributor.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .contribute(new anchor.BN(100))
      .accounts({
        contributor: contributor.publicKey,
        pool: poolPda,
        registry: registryPda,
        contribution: contribPda,
        userTokenAccount,
        poolVault,
        mint,
        systemProgram: SystemProgram.programId,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([contributor])
      .rpc();

    const pool = await program.accoun
// Anchor Mocha/ts-node tests
