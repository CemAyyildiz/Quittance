//! Pure validation logic for `invoice-currency-decimal-guard`.

use crate::types::{DecimalGuardError, MAX_TOKEN_DECIMALS};

/// Check whether a single decimals value is within `0..=MAX_TOKEN_DECIMALS`.
pub fn check_bounds(decimals: u32) -> bool {
    decimals <= MAX_TOKEN_DECIMALS
}

/// Validate both `token_decimals` and `expected_decimals` and ensure they match.
pub fn verify_decimals_match(
    token_decimals: u32,
    expected_decimals: u32,
) -> Result<(), DecimalGuardError> {
    if !check_bounds(token_decimals) {
        return Err(DecimalGuardError::TokenDecimalsOutOfRange);
    }
    if !check_bounds(expected_decimals) {
        return Err(DecimalGuardError::ExpectedDecimalsOutOfRange);
    }
    if token_decimals != expected_decimals {
        return Err(DecimalGuardError::DecimalsMismatch);
    }
    Ok(())
}

/// Boolean helper returning `true` iff both values are in bounds and equal.
pub fn is_matching_decimals(token_decimals: u32, expected_decimals: u32) -> bool {
    verify_decimals_match(token_decimals, expected_decimals).is_ok()
}
