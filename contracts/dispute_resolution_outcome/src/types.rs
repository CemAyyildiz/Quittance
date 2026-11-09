//! Type definitions for `dispute-resolution-outcome`.

use soroban_sdk::{contracterror, contracttype, Symbol};

/// Persistent storage keys for dispute outcomes.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    /// Stores the immutable [`Outcome`] for a `dispute_id`.
    Outcome(Symbol),
}

/// Fixed enum of possible dispute resolution outcomes.
#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Outcome {
    /// Full refund to the payer (`100%` payer, `0%` seller).
    FavorPayer = 1,
    /// Full release to the seller (`0%` payer, `100%` seller).
    FavorSeller = 2,
    /// Even 50/50 split between payer and seller (`5_000` bps each).
    Split = 3,
}

/// Errors returned by `dispute-resolution-outcome`.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    /// The dispute id already has a recorded outcome and cannot be overwritten.
    AlreadyResolved = 1,
}

impl Error {
    /// Human-readable message for off-chain diagnostics.
    #[must_use]
    pub const fn message(self) -> &'static str {
        match self {
            Error::AlreadyResolved => "Dispute has already been resolved and is immutable.",
        }
    }
}
