use anchor_lang::prelude::*;

use crate::state::*;
use crate::errors::*;

/// Update configurable parameters of the global Registry.
/// Only callable by the current authority.
pub fn handler(ctx: Context<SetConfig>, new_config: ConfigParams) -> Result<()> {
    let registry = &mut ctx.accounts.registry;

    // Basic validation of parameters
    require!(
        new_config.fee_bps <= 10_000,
        TimeTravelerError::InvalidConfig
    );

    registry.fee_bps = new_config.fee_bps;
    registry.oracle = new_config.oracle;
    registry.config_version = registry
        .config_version
        .checked_add(1)
        .ok_or(TimeTravelerError::NumericalOverflow)?;

    Ok(())
}

#[derive(Accounts)]
pub struct SetConfig<'info> {
    /// Current authority of the program
    pub authority: Signer<'info>,

    /// Registry account (must match authority)
    #[account(
        mut,
        has_one = authority @ TimeTravelerError::Unauthorized
    )]
    pub registry: Account<'info, Registry>,
}

/// Parameters that can be updated by authority
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ConfigParams {
    /// Fee in basis points (max 10000 = 100%)
    pub fee_bps: u16,
    /// Oracle public key (e.g. Pyth price account)
    pub oracle: Pubkey,
}
// set_config instruction
