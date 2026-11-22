//! Type definitions for the `seller-currency-allowlist` crate.
//!
//! A per-seller allowlist maps one seller address to the set of asset codes
//! that seller accepts for new invoices. Each seller's list is independent.

use soroban_sdk::{contracterror, contracttype, Address};

/// Storage keys for the contract's state.
#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    /// The asset codes a seller has allowed, in insertion order.
    Allowed(Address),
}

/// Error codes returned by the contract entry points.
///
/// Each variant carries a stable `#[repr(u32)]` discriminant so off-chain
/// tooling can match on the numeric code without depending on the Rust
/// identifier.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum AllowlistError {
    /// The supplied asset code is not a valid Stellar asset code: it must
    /// be 1–12 ASCII alphanumeric characters.
    InvalidAssetCode = 1,
}

impl AllowlistError {
    /// Return a stable English message describing the error.
    #[must_use]
    pub fn message(&self) -> &'static str {
        match self {
            AllowlistError::InvalidAssetCode => {
                "Asset code must be 1-12 ASCII alphanumeric characters."
            }
        }
    }
}
