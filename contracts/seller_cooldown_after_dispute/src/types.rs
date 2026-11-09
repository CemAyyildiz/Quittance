//! Type definitions for `seller-cooldown-after-dispute`.

use soroban_sdk::{contracterror, contracttype, Address};

/// Persistent storage keys for seller dispute records.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    /// Stores the most recent dispute ledger (`u32`) for a given seller.
    LastDisputeLedger(Address),
}

/// Snapshot of a seller's cooldown evaluation at a specific ledger.
#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct CooldownStatus {
    /// Whether the seller is currently allowed to create a new invoice.
    pub can_create: bool,
    /// Number of ledgers remaining until the cooldown expires (`0` if allowed).
    pub remaining_ledgers: u32,
}

/// Error codes returned by checked cooldown operations.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum CooldownError {
    /// The supplied dispute ledger is strictly earlier than the seller's
    /// already-recorded dispute ledger.
    LedgerRegression = 1,
    /// Computing the unlock ledger (`dispute_ledger + cooldown`) overflowed `u32::MAX`.
    UnlockOverflow = 2,
}

impl CooldownError {
    /// Stable human-readable message for off-chain diagnostics.
    #[must_use]
    pub const fn message(self) -> &'static str {
        match self {
            CooldownError::LedgerRegression => {
                "New dispute ledger cannot be earlier than the existing dispute ledger."
            }
            CooldownError::UnlockOverflow => {
                "Dispute ledger plus cooldown period overflows u32::MAX."
            }
        }
    }
}
