// solana/src/lib.rs

use anchor_lang::prelude::*;

// Replace with your actual program ID (anchor keys new -p <program-name>)
declare_id!("TTraVELaiTimeline11111111111111111111111111111");

#[program]
pub mod timetraveler_timeline {
    use super::*;

    /// Initialize the global archive (authority = signer who can log/resolve).
    pub fn initialize_archive(ctx: Context<InitializeArchive>) -> Result<()> {
        let archive = &mut ctx.accounts.archive;
        archive.authority = ctx.accounts.authority.key();
        archive.bump = *ctx.bumps.get("archive").unwrap();
        archive.total_predictions = 0;
        Ok(())
    }

    /// Create and log a new prediction record PDA.
    pub fn log_prediction(
        ctx: Context<LogPrediction>,
        prediction_id: u64,
        ai_model_version: String,  // max 32 bytes recommended
        signal: String,            // max 128 bytes recommended
        confidence: u16,           // 0..=100
        volatility_tier: String,   // "green","yellow","red" (max ~10)
        total_pool_tokens: u64,    // SPL token base units (e.g., 9 decimals)
        followers: u64,
        ipfs_hash: String,         // CID or hash (max ~64)
    ) -> Result<()> {
        require!(confidence <= 100, TimelineError::InvalidConfidence);

        let archive = &mut ctx.accounts.archive;
        let rec = &mut ctx.accounts.prediction;

        // Fill record
        rec.archive = archive.key();
        rec.prediction_id = prediction_id;
        rec.ai_model_version = ai_model_version;
        rec.timestamp = Clock::get()?.unix_timestamp;
        rec.signal = signal;
        rec.confidence = confidence;
        rec.volatility_tier = volatility_tier;
        rec.total_pool_tokens = total_pool_tokens;
        rec.followers = followers;
        rec.outcome = Outcome::Pending;
        rec.payout_ratio_bps = 0;
        rec.maturity_timestamp = 0;
        rec.ipfs_hash = ipfs_hash;
        rec.bump = *ctx.bumps.get("prediction").unwrap();

        archive.total_predictions = archive
            .total_predictions
            .checked_add(1)
            .ok_or(TimelineError::MathOverflow)?;

        emit!(PredictionLogged {
            prediction_id,
            ai_model_version: rec.ai_model_version.clone(),
            timestamp: rec.timestamp,
            signal: rec.signal.clone(),
            confidence: rec.confidence,
            volatility_tier: rec.volatility_tier.clone(),
            total_pool_tokens: rec.total_pool_tokens,
            followers: rec.followers,
        });

        Ok(())
    }

    /// Update mid-prediction stats (pool tokens / followers).
    pub fn update_prediction_stats(
        ctx: Context<UpdateStats>,
        total_pool_tokens: u64,
        followers: u64,
    ) -> Result<()> {
        let rec = &mut ctx.accounts.prediction;

        // Authority gate enforced by account validation
        rec.total_pool_tokens = total_pool_tokens;
        rec.followers = followers;

        Ok(())
    }

    /// Resolve prediction with final outcome and payout ratio.
    /// payout_ratio_bps is in basis points (e.g. 10000 = 100%, 2500 = 25%)
    pub fn resolve_prediction(
        ctx: Context<ResolvePrediction>,
        outcome: Outcome,
        payout_ratio_bps: u16,
    ) -> Result<()> {
        let rec = &mut ctx.accounts.prediction;
        require!(rec.outcome == Outcome::Pending, TimelineError::AlreadyResolved);

        rec.outcome = outcome;
        rec.payout_ratio_bps = payout_ratio_bps;
        rec.maturity_timestamp = Clock::get()?.unix_timestamp;

        emit!(PredictionResolved {
            prediction_id: rec.prediction_id,
            outcome: rec.outcome,
            payout_ratio_bps: rec.payout_ratio_bps,
            maturity_timestamp: rec.maturity_timestamp,
        });

        Ok(())
    }

    /// Optionally rotate archive authority (in case of key maintenance).
    pub fn set_archive_authority(ctx: Context<SetArchiveAuthority>, new_authority: Pubkey) -> Result<()> {
        let archive = &mut ctx.accounts.archive;
        archive.authority = new_authority;
        Ok(())
    }
}

/* ----------------------------
   Accounts & Validation
----------------------------- */

#[derive(Accounts)]
pub struct InitializeArchive<'info> {
    #[account(
        init,
        payer = authority,
        space = Archive::SPACE,
        seeds = [b"archive"],
        bump
    )]
    pub archive: Account<'info, Archive>,

    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK: System program
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(prediction_id: u64)]
pub struct LogPrediction<'info> {
    #[account(
        mut,
        seeds = [b"archive"],
        bump = archive.bump,
        has_one = authority
    )]
    pub archive: Account<'info, Archive>,

    /// PDA for a specific prediction: seeds = ["prediction", archive, prediction_id_le]
    #[account(
        init,
        payer = authority,
        space = PredictionRecord::SPACE,
        seeds = [
            b"prediction",
            archive.key().as_ref(),
            &prediction_id.to_le_bytes()
        ],
        bump
    )]
    pub prediction: Account<'info, PredictionRecord>,

    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK: System program
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateStats<'info> {
    #[account(
        seeds = [b"archive"],
        bump = archive.bump,
        has_one = authority
    )]
    pub archive: Account<'info, Archive>,

    #[account(
        mut,
        seeds = [
            b"prediction",
            archive.key().as_ref(),
            &prediction.prediction_id.to_le_bytes()
        ],
        bump = prediction.bump
    )]
    pub prediction: Account<'info, PredictionRecord>,

    #[account(mut)]
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct ResolvePrediction<'info> {
    #[account(
        seeds = [b"archive"],
        bump = archive.bump,
        has_one = authority
    )]
    pub archive: Account<'info, Archive>,

    #[account(
        mut,
        seeds = [
            b"prediction",
            archive.key().as_ref(),
            &prediction.prediction_id.to_le_bytes()
        ],
        bump = prediction.bump
    )]
    pub prediction: Account<'info, PredictionRecord>,

    #[account(mut)]
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct SetArchiveAuthority<'info> {
    #[account(
        mut,
        seeds = [b"archive"],
        bump = archive.bump,
        has_one = authority
    )]
    pub archive: Account<'info, Archive>,

    #[account(mut)]
    pub authority: Signer<'info>,
}

/* ----------------------------
   State
----------------------------- */

#[account]
pub struct Archive {
    pub authority: Pubkey,      // authority controlling logs/resolution
    pub bump: u8,
    pub total_predictions: u64, // count of predictions logged
}

impl Archive {
    // Discriminator (8) + Pubkey(32) + bump(1) + u64(8) + padding
    pub const SPACE: usize = 8 + 32 + 1 + 8;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum Outcome {
    Pending,
    Win,
    Loss,
    Neutral,
}

#[account]
pub struct PredictionRecord {
    pub archive: Pubkey,          // link to Archive PDA
    pub prediction_id: u64,
    pub ai_model_version: String, // max 32 (allocate with 4 + 32)
    pub timestamp: i64,
    pub signal: String,           // max 128 (4 + 128)
    pub confidence: u16,          // 0..=100
    pub volatility_tier: String,  // max 10 (4 + 10)
    pub total_pool_tokens: u64,   // SPL base units
    pub followers: u64,
    pub outcome: Outcome,         // 1 byte via enum repr (Anchor serializes)
    pub payout_ratio_bps: u16,    // 0..=10000
    pub maturity_timestamp: i64,  // when resolved
    pub ipfs_hash: String,        // max 64 (4 + 64)
    pub bump: u8,
}

// Calculate account size for Anchor allocation.
// Strings are serialized as: 4-byte length prefix + content bytes.
impl PredictionRecord {
    pub const AI_MODEL_MAX: usize = 32;
    pub const SIGNAL_MAX: usize = 128;
    pub const VOL_TIER_MAX: usize = 10;
    pub const IPFS_MAX: usize = 64;

    pub const SPACE: usize = 8  // discriminator
        + 32                    // archive pubkey
        + 8                     // prediction_id
        + 4 + Self::AI_MODEL_MAX // ai_model_version
        + 8                     // timestamp (i64)
        + 4 + Self::SIGNAL_MAX   // signal
        + 2                     // confidence (u16)
        + 4 + Self::VOL_TIER_MAX // volatility_tier
        + 8                     // total_pool_tokens
        + 8                     // followers
        + 1                     // outcome (enum)
        + 2                     // payout_ratio_bps
        + 8                     // maturity_timestamp (i64)
        + 4 + Self::IPFS_MAX     // ipfs_hash
        + 1;                    // bump
}

/* ----------------------------
   Events
----------------------------- */

#[event]
pub struct PredictionLogged {
    pub prediction_id: u64,
    pub ai_model_version: String,
    pub timestamp: i64,
    pub signal: String,
    pub confidence: u16,
    pub volatility_tier: String,
    pub total_pool_tokens: u64,
    pub followers: u64,
}

#[event]
pub struct PredictionResolved {
    pub prediction_id: u64,
    pub outcome: Outcome,
    pub payout_ratio_bps: u16,
    pub maturity_timestamp: i64,
}

/* ----------------------------
   Errors
----------------------------- */
#[error_code]
pub enum TimelineError {
    #[msg("Confidence must be between 0 and 100")]
    InvalidConfidence,
    #[msg("Prediction already resolved")]
    AlreadyResolved,
    #[msg("Math overflow")]
    MathOverflow,
}
