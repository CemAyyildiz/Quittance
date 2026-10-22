//! Error codes for the invoice id format validator contract.

use soroban_sdk::contracterror;

/// Errors returned by the contract wrapper.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    /// The input contained a byte outside the ASCII `0`-`9` range.
    NonDigitChars = 1,
    /// The input exceeded the contract's maximum accepted length.
    TooLong = 2,
}
