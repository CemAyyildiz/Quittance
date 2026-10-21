//! Storage keys, contract errors, and events for
//! `payment-reference-uniqueness`.

use soroban_sdk::{contracterror, contractevent, contracttype, Symbol};

/// Keys used by the contract's storage.
///
/// Claims are keyed by the reference string, so the registry is global: the
/// same reference cannot be claimed twice, no matter who claims it.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    /// A reference that has already been claimed.
    Claim(Symbol),
    /// Number of claimed references.
    Count,
}

/// Errors returned by [`crate::PaymentReferenceUniqueness`].
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    /// The reference was already claimed by an earlier call.
    AlreadyClaimed = 1,
}

/// Emitted whenever a reference is claimed for the first time.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ReferenceClaimedEvent {
    /// The reference that was claimed.
    #[topic]
    pub reference: Symbol,
}
