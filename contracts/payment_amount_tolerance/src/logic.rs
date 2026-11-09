//! Core tolerance verification logic for `payment-amount-tolerance`.

use crate::tolerance::abs_diff_non_negative;
use crate::types::{ToleranceError, ToleranceReport};

/// Check whether `received` is within `tolerance` of `expected`.
///
/// Requires `expected > 0`, `received >= 0`, and `tolerance >= 0`.
#[must_use]
pub const fn check_within_tolerance(expected: i128, received: i128, tolerance: i128) -> bool {
    if expected <= 0 || received < 0 || tolerance < 0 {
        return false;
    }
    let diff = abs_diff_non_negative(expected, received);
    diff <= tolerance
}

/// Verify `received` against `expected` and `tolerance`, returning the signed
/// delta `received - expected` when accepted or a [`ToleranceError`] otherwise.
pub const fn verify_tolerance(
    expected: i128,
    received: i128,
    tolerance: i128,
) -> Result<i128, ToleranceError> {
    if expected <= 0 {
        return Err(ToleranceError::InvalidExpectedAmount);
    }
    if received < 0 {
        return Err(ToleranceError::NegativeReceivedAmount);
    }
    if tolerance < 0 {
        return Err(ToleranceError::NegativeTolerance);
    }
    let diff = abs_diff_non_negative(expected, received);
    if diff > tolerance {
        return Err(ToleranceError::OutsideTolerance);
    }
    Ok(received - expected)
}

/// Build a [`ToleranceReport`] for `(expected, received, tolerance)`.
#[must_use]
pub const fn build_report(expected: i128, received: i128, tolerance: i128) -> ToleranceReport {
    if expected <= 0 || received < 0 || tolerance < 0 {
        return ToleranceReport {
            accepted: false,
            abs_diff: i128::MAX,
        };
    }
    let abs_diff = abs_diff_non_negative(expected, received);
    ToleranceReport {
        accepted: abs_diff <= tolerance,
        abs_diff,
    }
}
