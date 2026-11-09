//! Threshold validation helpers for `payment-fee-tier`.

use soroban_sdk::Vec;

use crate::types::{FeeTierError, MAX_FEE_BPS};

/// Validate a schedule of `(min_volume, fee_bps)` thresholds.
///
/// Thresholds must be non-empty, have non-negative `min_volume`, be strictly
/// ascending by `min_volume`, and have `fee_bps <= 10_000`.
pub fn validate_thresholds(thresholds: &Vec<(i128, u32)>) -> Result<(), FeeTierError> {
    if thresholds.is_empty() {
        return Err(FeeTierError::EmptyThresholds);
    }
    let mut prev_vol: Option<i128> = None;
    for (min_vol, bps) in thresholds.iter() {
        if min_vol < 0 {
            return Err(FeeTierError::InvalidThresholdOrder);
        }
        if bps > MAX_FEE_BPS {
            return Err(FeeTierError::InvalidFeeBps);
        }
        if let Some(prev) = prev_vol {
            if min_vol <= prev {
                return Err(FeeTierError::InvalidThresholdOrder);
            }
        }
        prev_vol = Some(min_vol);
    }
    Ok(())
}
