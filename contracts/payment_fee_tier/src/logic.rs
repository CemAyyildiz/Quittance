//! Pure fee-tier lookup and fee calculation helpers for `payment-fee-tier`.

use soroban_sdk::Vec;

use crate::tiers::validate_thresholds;
use crate::types::{FeeTierError, MAX_FEE_BPS};

/// Resolve the fee in basis points for `cumulative_volume` against `thresholds`.
///
/// Each entry `(min_volume, fee_bps)` defines the fee once `cumulative_volume >= min_volume`.
/// The highest `min_volume` satisfied by `cumulative_volume` wins (even if the
/// caller passes thresholds out of order). If `cumulative_volume` is below the
/// smallest `min_volume` in `thresholds`, falls back to the lowest `min_volume`
/// tier's fee (or `0` when `thresholds` is empty).
#[must_use]
pub fn resolve_fee_bps(cumulative_volume: i128, thresholds: &Vec<(i128, u32)>) -> u32 {
    if thresholds.is_empty() {
        return 0;
    }

    let mut best_matched: Option<(i128, u32)> = None;
    let mut lowest_tier: Option<(i128, u32)> = None;

    for (min_vol, bps) in thresholds.iter() {
        let clamped_bps = bps.min(MAX_FEE_BPS);
        match lowest_tier {
            None => lowest_tier = Some((min_vol, clamped_bps)),
            Some((low_v, _)) if min_vol < low_v => lowest_tier = Some((min_vol, clamped_bps)),
            _ => {}
        }
        if cumulative_volume >= min_vol {
            match best_matched {
                None => best_matched = Some((min_vol, clamped_bps)),
                Some((best_v, _)) if min_vol >= best_v => {
                    best_matched = Some((min_vol, clamped_bps));
                }
                _ => {}
            }
        }
    }

    best_matched
        .or(lowest_tier)
        .map(|(_, bps)| bps)
        .unwrap_or(0)
}

/// Validated lookup that verifies `cumulative_volume >= 0` and `thresholds` integrity.
pub fn resolve_fee_bps_checked(
    cumulative_volume: i128,
    thresholds: &Vec<(i128, u32)>,
) -> Result<u32, FeeTierError> {
    if cumulative_volume < 0 {
        return Err(FeeTierError::NegativeAmount);
    }
    validate_thresholds(thresholds)?;
    Ok(resolve_fee_bps(cumulative_volume, thresholds))
}

/// Compute the fee amount `(payment_amount * fee_bps) / 10_000` for the
/// resolved volume tier.
pub fn compute_fee_for_payment(
    payment_amount: i128,
    cumulative_volume: i128,
    thresholds: &Vec<(i128, u32)>,
) -> Result<i128, FeeTierError> {
    if payment_amount < 0 {
        return Err(FeeTierError::NegativeAmount);
    }
    let bps = resolve_fee_bps_checked(cumulative_volume, thresholds)?;
    payment_amount
        .checked_mul(i128::from(bps))
        .map(|prod| prod / i128::from(MAX_FEE_BPS))
        .ok_or(FeeTierError::MathOverflow)
}
