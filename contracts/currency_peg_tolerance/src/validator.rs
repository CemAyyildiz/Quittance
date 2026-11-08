use crate::types::{PegBandEvaluation, PegToleranceError};

pub const BPS_DENOMINATOR: i128 = 10_000;
pub const MAX_TOLERANCE_BPS: u32 = 10_000;

pub fn compute_band(
    quoted_rate: i128,
    reference_rate: i128,
    tolerance_bps: u32,
) -> Result<PegBandEvaluation, PegToleranceError> {
    if reference_rate <= 0 {
        return Err(PegToleranceError::InvalidReferenceRate);
    }
    if quoted_rate <= 0 {
        return Err(PegToleranceError::InvalidQuotedRate);
    }
    if tolerance_bps > MAX_TOLERANCE_BPS {
        return Err(PegToleranceError::ToleranceTooHigh);
    }

    let delta = reference_rate
        .checked_mul(tolerance_bps as i128)
        .ok_or(PegToleranceError::ArithmeticOverflow)?
        / BPS_DENOMINATOR;

    let lower_bound = reference_rate
        .checked_sub(delta)
        .ok_or(PegToleranceError::ArithmeticOverflow)?;
    let upper_bound = reference_rate
        .checked_add(delta)
        .ok_or(PegToleranceError::ArithmeticOverflow)?;

    let within_band = quoted_rate >= lower_bound && quoted_rate <= upper_bound;

    Ok(PegBandEvaluation {
        quoted_rate,
        reference_rate,
        tolerance_bps,
        lower_bound,
        upper_bound,
        within_band,
    })
}
