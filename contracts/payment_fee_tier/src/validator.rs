use crate::types::{FeeTierError, FeeTierQuote};
use soroban_sdk::Vec;

pub const MAX_FEE_BPS: u32 = 10_000;

pub fn resolve_tier(
    cumulative_volume: i128,
    thresholds: &Vec<(i128, u32)>,
) -> Result<FeeTierQuote, FeeTierError> {
    if cumulative_volume < 0 {
        return Err(FeeTierError::NegativeVolume);
    }
    if thresholds.is_empty() {
        return Err(FeeTierError::EmptyThresholds);
    }

    let mut prev_min: Option<i128> = None;
    let mut matched_threshold: i128 = 0;
    let mut matched_bps: u32 = thresholds.get(0).unwrap().1;

    for (min_vol, fee_bps) in thresholds.iter() {
        if min_vol < 0 {
            return Err(FeeTierError::NegativeVolume);
        }
        if fee_bps > MAX_FEE_BPS {
            return Err(FeeTierError::FeeBpsTooHigh);
        }
        if let Some(prev) = prev_min {
            if min_vol <= prev {
                return Err(FeeTierError::UnsortedThresholds);
            }
        }
        prev_min = Some(min_vol);

        if cumulative_volume >= min_vol {
            matched_threshold = min_vol;
            matched_bps = fee_bps;
        }
    }

    Ok(FeeTierQuote {
        cumulative_volume,
        matched_threshold,
        fee_bps: matched_bps,
    })
}
