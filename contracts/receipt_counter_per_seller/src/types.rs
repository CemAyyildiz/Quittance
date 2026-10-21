//! Type definitions for the `receipt-counter-per-seller` crate.
//!
//! A receipt counter is a monotonically increasing sequence number scoped to a
//! single seller. Sellers are fully independent: advancing one seller's counter
//! never touches another's.

use soroban_sdk::{contracterror, contracttype};

/// Storage keys for the contract's instance state.
#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    /// The last receipt number issued for a given seller.
    Counter(soroban_sdk::Address),
}

/// Error codes returned by the contract entry points.
///
/// Each variant carries a stable `#[repr(u32)]` discriminant so off-chain
/// tooling can match on the numeric code without depending on the Rust
/// identifier.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum CounterError {
    /// The counter for this seller has reached `u64::MAX` and cannot be
    /// advanced any further.
    CounterOverflow = 1,
    /// The counter was asked to start from a value other than zero.
    InvalidSeed = 2,
}

impl CounterError {
    /// Return a stable English message describing the error.
    pub fn message(&self) -> &'static str {
        match self {
            CounterError::CounterOverflow => "Receipt counter has reached its maximum value.",
            CounterError::InvalidSeed => "A receipt counter must start at zero.",
        }
    }
}

/// The first receipt number a seller's counter can issue.
///
/// Receipt numbers are 1-based so that `0` is never a valid receipt number and
/// can be used as "no receipt issued yet" in off-chain bookkeeping.
pub const FIRST_RECEIPT_NO: u64 = 1;
