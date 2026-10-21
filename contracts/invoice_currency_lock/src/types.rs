//! Type definitions for the `invoice-currency-lock` crate.
//!
//! An invoice lock maps an invoice identifier to the single asset code that
//! invoice is denominated in. Once the mapping exists it never changes.

use soroban_sdk::{contracterror, contracttype, Symbol};

/// Storage keys for the contract's instance state.
#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    /// The asset code an invoice is locked to.
    LockedCurrency(Symbol),
}

/// Error codes returned by the contract entry points.
///
/// Each variant carries a stable `#[repr(u32)]` discriminant so off-chain
/// tooling can match on the numeric code without depending on the Rust
/// identifier.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum CurrencyLockError {
    /// The supplied asset code is not a valid Stellar asset code.
    InvalidAssetCode = 1,
    /// The invoice is already locked to a different asset code and its
    /// currency cannot be changed.
    CurrencyMismatch = 2,
    /// The invoice has no currency lock yet.
    InvoiceNotLocked = 3,
}

impl CurrencyLockError {
    /// Return a stable English message describing the error.
    pub fn message(&self) -> &'static str {
        match self {
            CurrencyLockError::InvalidAssetCode => {
                "Asset code must be 1-12 alphanumeric characters."
            }
            CurrencyLockError::CurrencyMismatch => {
                "Invoice is already locked to a different asset code."
            }
            CurrencyLockError::InvoiceNotLocked => "Invoice has no currency lock.",
        }
    }
}
