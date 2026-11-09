//! Pure peg-band math for `currency-peg-tolerance`.

use crate::types::{Error, BPS_DENOMINATOR, MAX_TOLERANCE_BPS};

pub fn compute_bounds(reference_rate: i128, tolerance_bps: u32) -> Result<(i128, i128), Error> {
    if reference_rate <= 0 {
        return Err(Error::InvalidReferenceRate);
    }
    if tolerance_bps > MAX_TOLERANCE_BPS {
        return Err(Error::InvalidToleranceBps);
    }
    let delta = reference_rate
        .checked_mul(i128::from(tolerance_bps))
        .ok_or(Error::ArithmeticOverflow)?
        / BPS_DENOMINATOR;
    let low = reference_rate
        .checked_sub(delta)
        .ok_or(Error::ArithmeticOverflow)?;
    let high = reference_rate
        .checked_add(delta)
        .ok_or(Error::ArithmeticOverflow)?;
    Ok((low, high))
}

pub fn check_band(
    quoted_rate: i128,
    reference_rate: i128,
    tolerance_bps: u32,
) -> Result<(), Error> {
    if quoted_rate <= 0 {
        return Err(Error::InvalidQuotedRate);
    }
    let (low, high) = compute_bounds(reference_rate, tolerance_bps)?;
    if quoted_rate < low || quoted_rate > high {
        return Err(Error::OutOfBand);
    }
    Ok(())
}
