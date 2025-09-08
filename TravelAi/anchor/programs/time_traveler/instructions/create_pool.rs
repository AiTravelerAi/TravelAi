use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, TokenAccount};

use crate::state::*;
use crate::errors::*;

/// Create a new prediction pool for a given signal.
/// Only the program authority (from Registry) may call this.
pub fn handler(ctx: Context<CreatePool>, signal_id: [u8; 32], open_ts: i64, close_ts: i64) -> Result<()> {
    // Validate timestamps
    require!(open_ts < close_ts, TimeTravelerError::InvalidTimestamps);
    require!(close_ts > Clock::get()?.unix_timestamp, TimeTravelerError::PoolCloseInPast);

    let pool = &mut ctx.accounts.pool;

    pool.registry = ctx.accounts.registry.key();
    pool.authority = ctx.accounts.authority.key();
    pool.mint = ctx.accounts.mint.key();
    pool.signal_id = signal_id;
    pool.status = PoolStatus::Open;
    pool.open_ts = open_ts;
    pool.close_ts = close_ts;
    pool.total_contributed = 0;
    pool.bump = *ctx.bumps.get("pool").unwrap();

    Ok(())
}

#[derive(Accounts)]
#[instruction(signal_id: [u8; 32], open_ts: i64, close_ts: i64)]
pub struct CreatePool<'info> {
    /// Authority creating the pool (must match registry authority)
    pub authority: Signer<'info>,

    /// Global registry storing program authority and config
    #[account(
        has_one = authority @ TimeTravelerError::Unauthorized,
    )]
    pub registry: Account<'info, Registry>,

    /// Pool state account (PDA)
    #[account(
        init,
        payer = authority,
        space = 8 + Pool::SIZE,
        seeds = [b"pool", signal_id.as_ref()],
        bump
    )]
    pub pool: Account<'info, Pool>,

    /// Token mint ($TRAVELAI) used for this pool
    pub mint: Account<'info, Mint>,

    /// Vault PDA token account where contributions are stored
    #[account(
        init,
        payer = authority,
        token::mint = mint,
        token::authority = pool,
        seeds = [b"vault", pool.key().as_ref()],
        bump
    )]
    pub pool_vault: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, anchor_spl::token::Token>,
    pub rent: Sysvar<'info, Rent>,
}
// create_pool instruction
