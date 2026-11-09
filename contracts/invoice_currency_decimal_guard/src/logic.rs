//! Pure decimal comparison helpers for `invoice-currency-decimal-guard`.

use crate::types::{Error, MAX_DECIMALS};

pub fn check_decimals(token_decimals: u32, expected_decimals: u32) -> Result<u32, Error> {
    if token_decimals > MAX_DECIMALS || expected_decimals > MAX_DECIMALS {
        return Err(Error::DecimalsOutOfRange);
    }
    if token_decimals != expected_decimals {
        return Err(Error::DecimalsMismatch);
    }
    Ok(expected_decimals)
}

#[must_use]
pub const fn abs_diff(a: u32, b: u32) -> u32 {
    a.abs_diff(b)
}
