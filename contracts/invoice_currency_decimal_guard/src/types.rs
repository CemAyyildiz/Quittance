//! Type definitions for `invoice-currency-decimal-guard`.

use soroban_sdk::contracterror;

/// Maximum supported token decimals (18, matching standard ERC-20 / Soroban upper bound).
pub const MAX_DECIMALS: u32 = 18;

/// Standard Stellar Classic / Soroban SAC decimal places (7).
pub const STELLAR_DEFAULT_DECIMALS: u32 = 7;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    DecimalsMismatch = 1,
    DecimalsOutOfRange = 2,
}
