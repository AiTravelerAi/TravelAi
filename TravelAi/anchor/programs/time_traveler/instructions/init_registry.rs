use anchor_lang::prelude::*;

use crate::state::*;
use crate::errors::*;

/// Initialize the global Registry account for TimeTravelerAI.
/// Can only be called once (PDA must be uninitialized).
pub fn handler(ctx: Context<InitRegistry>, authority: Pubkey) -> Result<()> {
    let registry = &mut ctx.accounts.registry;

    registry.authority = authority;
    registry.version = 1;
    registry.bump = *ctx.bumps.get("registry").unwrap();

    Ok(())
}

#[derive(Accounts)]
#[instruction(authority: Pubkey)]
pub struct InitRegistry<'info> {
    /// Payer who funds account rent
    #[account(mut)]
    pub payer: Signer<'info>,

    /// The Registry PDA account, created once
    #[account(
        init,
        payer = payer,
        space = 8 + Registry::SIZE,
        seeds = [b"registry"],
        bump
    )]
    pub registry: Account<'info, Registry>,

    pub system_program: Program<'info, System>,
}
// init_registry instruction
