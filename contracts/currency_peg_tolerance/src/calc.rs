use crate::types::PegError;

pub const BPS_DENOMINATOR: i128 = 10_000;

pub(crate) fn is_within_band(
    quoted_rate: i128,
    reference_rate: i128,
    tolerance_bps: u32,
) -> bool {
    if quoted_rate <= 0 || reference_rate <= 0 || tolerance_bps > 10_000 {
        return false;
    }

    let tol = tolerance_bps as i128;
    let diff = (quoted_rate - reference_rate).abs();

    // diff / reference_rate <= tol / 10_000
    // => diff * 10_000 <= reference_rate * tol
    match diff.checked_mul(BPS_DENOMINATOR) {
        Some(diff_scaled) => match reference_rate.checked_mul(tol) {
            Some(max_allowed) => diff_scaled <= max_allowed,
            None => false,
        },
        None => false,
    }
}

pub(crate) fn check_rate(
    quoted_rate: i128,
    reference_rate: i128,
    tolerance_bps: u32,
) -> Result<(), PegError> {
    if quoted_rate <= 0 || reference_rate <= 0 {
        return Err(PegError::NonPositiveRate);
    }
    if tolerance_bps > 10_000 {
        return Err(PegError::ToleranceExceedsMax);
    }

    if is_within_band(quoted_rate, reference_rate, tolerance_bps) {
        Ok(())
    } else {
        Err(PegError::OutsideToleranceBand)
    }
}
