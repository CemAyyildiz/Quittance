//! Type definitions for `invoice-amount-range`.

use soroban_sdk::{contracterror, contracttype, Address};

/// Storage keys used by the contract.
#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    /// The configured `[min, max]` range for a given seller.
    Range(Address),
}

/// Error codes returned by the contract entry points.
///
/// Each variant carries a stable `#[repr(u32)]` discriminant so off-chain
/// tooling can match on the numeric code without depending on the Rust
/// identifier.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum RangeError {
    /// `min > max`, or either bound is negative.
    ///
    /// A valid range requires `0 <= min <= max`. Amounts are denominated in
    /// stroops; a negative bound makes no sense in that context.
    InvalidRange = 1,
}

impl RangeError {
    /// Return a stable English message describing the error.
    pub fn message(&self) -> &'static str {
        match self {
            RangeError::InvalidRange => {
                "Range is invalid: min must be <= max and both must be non-negative."
            }
        }
    }
}

/// A validated inclusive amount range `[min, max]`.
///
/// Constructed only through [`AmountRange::new`], which enforces the
/// non-negativity and ordering constraints.
#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct AmountRange {
    pub min: i128,
    pub max: i128,
}
