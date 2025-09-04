use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer, Mint};

use crate::state::*;

/// Contribute SPL tokens (e.g. $TRAVELAI) into an active prediction pool.
/// Funds are transferred from the contributor’s token account to the pool vault.
/// Pool’s total_contributed and contributor’s share are updated.
pub fn handler(ctx: Context<Contribute>, amount: u64) -> Result<()> {
    require!(amount > 0, TimeTravelerError::InvalidAmount);

    let pool = &mut ctx.accounts.pool;

    // Ensure pool is open
    require!(
        pool.status == PoolStatus::Open,
        TimeTravelerError::PoolClosed
    );

    // Transfer tokens from user -> pool vault
    let cpi_accounts = Transfer {
        from: ctx.accounts.user_token_account.to_account_info(),
        to: ctx.accounts.pool_vault.to_account_info(),
        authority: ctx.accounts.contributor.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
    token::transfer(cpi_ctx, amount)?;

    // Update pool totals
    pool.total_contributed = pool
        .total_contributed
        .checked_add(amount)
        .ok_or(TimeTravelerError::NumericalOverflow)?;

    // Record contributor stats
    let contrib = &mut ctx.accounts.contribution;
    contrib.pool = pool.key();
    contrib.user = ctx.accounts.contributor.key();
    contrib.amount = contrib
        .amount
        .checked_add(amount)
        .ok_or(TimeTravelerError::NumericalOverflow)?;

    Ok(())
}

#[derive(Accounts)]
pub struct Contribute<'info> {
    /// The contributor (payer of tx, signer)
    #[account(mut)]
    pub contributor: Signer<'info>,

    /// Pool state account (must be mutable, seeded PDA)
    #[account(
        mut,
        has_one = registry @ TimeTravelerError::InvalidRegistryReference,
        constraint = pool.status == PoolStatus::Open @ TimeTravelerError::PoolClosed
    )]
    pub pool: Account<'info, Pool>,

    /// Global registry (for reference & authority checks)
    pub registry: Account<'info, Registry>,

    /// Contributor’s PDA Contribution account
    #[account(
        init_if_needed,
        payer = contributor,
        space = 8 + Contribution::SIZE,
        seeds = [b"contrib", pool.key().as_ref(), contributor.key().as_ref()],
        bump
    )]
    pub contribution: Account<'info, Contribution>,

    /// Contributor’s token account (must be $TRAVELAI mint)
    #[account(
        mut,
        constraint = user_token_account.mint == pool.mint @ TimeTravelerError::InvalidMint
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    /// Pool vault (PDA-owned token account that holds all contributions)
    #[account(
        mut,
        constraint = pool_vault.mint == pool.mint @ TimeTravelerError::InvalidMint,
        constraint = pool_vault.owner == pool.key() @ TimeTravelerError::InvalidVaultOwner
    )]
    pub pool_vault: Account<'info, TokenAccount>,

    pub mint: Account<'info, Mint>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}
// contribute instruction
