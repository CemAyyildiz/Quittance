//! Pure currency-lock logic, kept free of `Env` so it can be unit-tested on
//! the host target without a contract instance.

use crate::types::CurrencyLockError;
use soroban_sdk::Symbol;

/// The maximum length of a Stellar asset code.
pub const MAX_ASSET_CODE_LEN: usize = 12;

/// Validate an asset code.
///
/// A Stellar asset code is 1–12 characters long and may only contain ASCII
/// letters and digits. Anything else is rejected before a lock is written, so
/// an invoice can never end up locked to a code no asset could ever have.
pub fn validate_asset_code(code: &str) -> Result<(), CurrencyLockError> {
    if code.is_empty() || code.chars().count() > MAX_ASSET_CODE_LEN {
        return Err(CurrencyLockError::InvalidAssetCode);
    }
    if !code.chars().all(|c| c.is_ascii_alphanumeric()) {
        return Err(CurrencyLockError::InvalidAssetCode);
    }
    Ok(())
}

/// Whether the requested asset code matches the invoice's lock.
///
/// An invoice with no lock at all never matches: there is nothing to compare
/// against, so the requested code cannot be confirmed.
pub fn matches(locked: Option<&Symbol>, requested: &Symbol) -> bool {
    match locked {
        Some(locked_code) => locked_code == requested,
        None => false,
    }
}
