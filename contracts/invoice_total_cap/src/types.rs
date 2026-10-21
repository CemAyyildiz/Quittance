//! Storage keys and contract errors for `invoice-total-cap`.

use soroban_sdk::{contracterror, contractevent, contracttype, Address};

/// Keys used by the contract's instance and persistent storage.
///
/// The admin address and the current cap are global and therefore live in
/// instance storage. Running totals are per seller and live in persistent
/// storage so that they survive instance rollovers.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    /// Address allowed to change the cap.
    Admin,
    /// Current per-seller invoice total cap, in the smallest unit of the
    /// invoice asset.
    Cap,
    /// Running total invoiced for a single seller.
    SellerTotal(Address),
}

/// Errors returned by [`crate::InvoiceTotalCap`].
///
/// Every variant has a stable `u32` discriminant so off-chain tooling can
/// match on the numeric code without depending on the Rust identifier.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum CapError {
    /// A method that needs configuration was called before `initialize`.
    NotInitialized = 1,
    /// `initialize` was called on an already-configured contract.
    AlreadyInitialized = 2,
    /// The supplied cap was negative. Caps are amounts and must be `>= 0`.
    InvalidCap = 3,
    /// The invoice amount was zero or negative.
    InvalidAmount = 4,
    /// Recording the invoice would push the seller's total above the cap.
    CapExceeded = 5,
    /// Adding the amount to the running total overflowed `i128`.
    Overflow = 6,
    /// The caller is not the configured admin.
    Unauthorized = 7,
}

/// Emitted once, when the contract is initialized.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct InitializedEvent {
    /// Address that may change the cap.
    #[topic]
    pub admin: Address,
    /// Cap that was installed.
    pub cap: i128,
}

/// Emitted whenever the admin changes the cap.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CapUpdatedEvent {
    /// Address that performed the update.
    #[topic]
    pub admin: Address,
    /// Cap that is now in force.
    pub cap: i128,
}

/// Emitted for every accepted invoice.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct InvoiceRecordedEvent {
    /// Seller whose running total changed.
    #[topic]
    pub seller: Address,
    /// Amount of the invoice that was recorded.
    pub amount: i128,
    /// The seller's running total after the invoice.
    pub new_total: i128,
}
