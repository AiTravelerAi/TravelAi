use anchor_lang::prelude::*;

use crate::state::*;
use crate::errors::*;

/// Allows the current authority to update the Registry authority.
pub fn handler(ctx: Context<SetAuthority>, new_authority: Pubkey) -> Result<()> {
    let registry = &mut ctx.accounts.registry;

    // Ensure the new authority isn't the same as current
    require!(
        registry.authority != new_authority,
        TimeTravelerError::NoAuthorityChange
    );

    registry.authority = new_authority;

    Ok(())
}

#[derive(Accounts)]
pub struct SetAuthority<'info> {
    /// The current authority of the registry
    pub current_authority: Signer<'info>,

    /// Global registry (authority must match current_authority)
    #[account(
        mut,
        has_one = authority @ TimeTravelerError::Unauthorized
    )]
    pub registry: Account<'info, Registry>,
}
// set_authority instruction
