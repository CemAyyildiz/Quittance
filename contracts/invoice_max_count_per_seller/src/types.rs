//! Type definitions for `invoice-max-count-per-seller`.

use soroban_sdk::{contracterror, contracttype, Address};

/// Storage keys used by the contract.
#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    /// The configured per-seller lifetime cap (set at construction, never changed).
    Cap,
    /// The current invoice count for a given seller.
    Count(Address),
}

/// Error codes returned by the contract entry points.
///
/// Each variant carries a stable `#[repr(u32)]` discriminant so off-chain
/// tooling can match on the numeric code without depending on the Rust
/// identifier.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum InvoiceCapError {
    /// The seller has already reached the configured lifetime invoice cap.
    CapExceeded = 1,
    /// The contract was initialised with a cap of zero, which would immediately
    /// block every seller.
    ZeroCap = 2,
}

impl InvoiceCapError {
    /// Return a stable English message describing the error.
    pub fn message(&self) -> &'static str {
        match self {
            InvoiceCapError::CapExceeded => "Seller has reached the lifetime invoice cap.",
            InvoiceCapError::ZeroCap => "Invoice cap must be greater than zero.",
        }
    }
}
