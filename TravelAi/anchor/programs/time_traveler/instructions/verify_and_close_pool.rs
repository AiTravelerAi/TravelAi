use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount};

use crate::state::*;
use crate::errors::*;

/// Verify the outcome of a pool via oracle and close it.
/// Only callable by registry authority.
pub fn handler(ctx: Context<VerifyAndClosePool>, outcome: PoolOutcome) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    let registry = &ctx.accounts.registry;

    // Ensure pool is open and ready to close
    require!(
        pool.status == PoolStatus::Open,
        TimeTravelerError::PoolAlreadyClosed
    );

    let now = Clock::get()?.unix_timestamp;
    require!(
        now >= pool.close_ts,
        TimeTravelerError::PoolStillActive
    );

    // TODO: extend here with oracle verification logic (e.g., read Pyth price from ctx.accounts.oracle_feed)

    // Record verified outcome
    pool.outcome = Some(outcome.clone());
    pool.status = PoolStatus::Closed;

    // Emit event for off-chain indexers
    emit!(PoolClosed {
        pool: pool.key(),
        signal_id: pool.signal_id,
        outcome,
        total_contributed: pool.total_contributed,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct VerifyAndClosePool<'info> {
    /// Authority who is allowed to verify (must match registry authority)
    pub authority: Signer<'info>,

    #[account(
        has_one = authority @ TimeTravelerError::Unauthorized
    )]
    pub registry: Account<'info, Registry>,

    /// The pool being verified and closed
    #[account(
        mut,
        has_one = registry @ TimeTravelerError::InvalidRegistryReference,
        constraint = pool.status == PoolStatus::Open @ TimeTravelerError::PoolAlreadyClosed
    )]
    pub pool: Account<'info, Pool>,

    /// Vault holding all contributions (remains locked until settlement)
    #[account(
        mut,
        constraint = pool_vault.owner == pool.key() @ TimeTravelerError::InvalidVaultOwner,
        constraint = pool_vault.mint == pool.mint @ TimeTravelerError::InvalidMint
    )]
    pub pool_vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

/// Event emitted when a pool is closed
#[event]
pub struct PoolClosed {
    pub pool: Pubkey,
    pub signal_id: [u8; 32],
    pub outcome: PoolOutcome,
    pub total_contributed: u64,
}
// verify_and_close_pool instruction
