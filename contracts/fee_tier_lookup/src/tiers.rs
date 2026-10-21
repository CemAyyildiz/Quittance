//! Pure, environment-free tier logic.
//!
//! Splitting the lookup/validation math out of the contract entry points keeps
//! it testable on the host target with no storage, and mirrors the
//! `src/lib.rs` / logic-module split used by other crates in this repo.

use crate::types::{Tier, TierError, MAX_BPS};
use soroban_sdk::Vec;

/// Validate a single tier in isolation.
///
/// Returns [`TierError::InvalidBound`] when `upto_amount` is not positive and
/// [`TierError::InvalidBps`] when `bps` exceeds [`MAX_BPS`].
pub fn validate_tier(tier: &Tier) -> Result<(), TierError> {
    if tier.upto_amount <= 0 {
        return Err(TierError::InvalidBound);
    }
    if tier.bps > MAX_BPS {
        return Err(TierError::InvalidBps);
    }
    Ok(())
}

/// Validate an entire ascending list of tiers.
///
/// Every tier must be individually valid and each `upto_amount` must be
/// strictly greater than the one before it, so the brackets never overlap and
/// always form a well-defined partition of `(previous_bound, upto_amount]`.
pub fn validate_tiers(tiers: &Vec<Tier>) -> Result<(), TierError> {
    let mut previous: Option<i128> = None;
    for tier in tiers.iter() {
        validate_tier(&tier)?;
        if let Some(prev) = previous {
            if tier.upto_amount <= prev {
                return Err(TierError::InvalidBound);
            }
        }
        previous = Some(tier.upto_amount);
    }
    Ok(())
}

/// Resolve the fee (in basis points) that applies to `amount`.
///
/// The first tier whose `upto_amount` is `>= amount` wins; a tier is "the first
/// bucket that fits". Returns [`TierError::NoTiersConfigured`] when the list is
/// empty and [`TierError::InvalidBound`] when `amount` is not positive.
///
/// Amounts above the largest configured bound resolve to the fee of the
/// **highest** configured tier (the open-ended top bracket), which is the
/// behaviour a caller wants for a "whatever is left" catch-all.
pub fn resolve_fee(tiers: &Vec<Tier>, amount: i128) -> Result<u32, TierError> {
    if tiers.is_empty() {
        return Err(TierError::NoTiersConfigured);
    }
    if amount <= 0 {
        return Err(TierError::InvalidBound);
    }

    let mut selected: Option<u32> = None;
    for tier in tiers.iter() {
        if amount <= tier.upto_amount {
            selected = Some(tier.bps);
            break;
        }
    }

    // Above every configured bound -> use the highest tier's fee.
    Ok(selected.unwrap_or_else(|| tiers.get_unchecked(tiers.len() - 1).bps))
}
