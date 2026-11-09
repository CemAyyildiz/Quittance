//! Type definitions for `seller-payout-address-binding`.

use soroban_sdk::{contracterror, contracttype, Address};

/// Default number of ledgers required between payout address rebinds.
pub const DEFAULT_REBIND_COOLDOWN_LEDGERS: u32 = 100;

/// Storage keys for payout bindings and configuration.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    /// Stores the [`PayoutBinding`] for a seller.
    Binding(Address),
    /// Optional custom cooldown duration in ledgers.
    CooldownLedgers,
}

/// Stored payout binding metadata for a seller.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PayoutBinding {
    /// Destination address that receives payouts for the seller.
    pub payout_address: Address,
    /// Ledger number when this binding was last set.
    pub bound_at_ledger: u32,
}

/// Errors returned by `seller-payout-address-binding`.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    /// A rebind was attempted before the cooldown elapsed since `bound_at_ledger`.
    CooldownActive = 1,
    /// `ledger` is strictly earlier than `bound_at_ledger`.
    LedgerRegression = 2,
    /// `bound_at_ledger + cooldown` overflowed `u32::MAX`.
    CooldownOverflow = 3,
}

impl Error {
    /// Human-readable error message.
    #[must_use]
    pub const fn message(self) -> &'static str {
        match self {
            Error::CooldownActive => "Rebind cooldown period has not elapsed yet.",
            Error::LedgerRegression => "Rebind ledger cannot precede the previous bind ledger.",
            Error::CooldownOverflow => "Cooldown unlock calculation overflowed u32::MAX.",
        }
    }
}
