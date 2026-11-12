//! Error and constant types for `invoice-currency-decimal-guard`.

use soroban_sdk::contracterror;

/// Maximum supported token decimal places (covers Stellar's 7 decimals and 18-decimal bridged tokens).
pub const MAX_TOKEN_DECIMALS: u32 = 18;

/// Canonical Stellar classic/Soroban SAC decimal places.
pub const STELLAR_DEFAULT_DECIMALS: u32 = 7;

/// Errors returned by the decimal guard validator.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum DecimalGuardError {
    /// The token's on-chain decimals do not match the invoice's expected decimals.
    DecimalsMismatch = 1,
    /// The supplied token decimals value exceeds `MAX_TOKEN_DECIMALS` (`18`).
    TokenDecimalsOutOfRange = 2,
    /// The supplied expected decimals value exceeds `MAX_TOKEN_DECIMALS` (`18`).
    ExpectedDecimalsOutOfRange = 3,
}
