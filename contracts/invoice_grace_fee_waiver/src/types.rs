//! Storage keys, waiver state, and error codes for the grace fee waiver.

use soroban_sdk::{contracterror, contracttype, Symbol};

/// Errors returned by the one-time late-fee waiver contract.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    /// The supplied admin address does not match the stored admin.
    NotAuthorised = 1,
}

/// Persistent-storage keys used by the contract.
#[contracttype]
pub(crate) enum DataKey {
    /// Instance key holding the admin address fixed at deployment.
    Admin,
    /// Per-invoice waiver state, keyed by invoice id.
    Waiver(Symbol),
}

/// Lifecycle state of one invoice's waiver.
///
/// The only legal transition is `Granted -> Consumed`, performed by
/// [`crate::InvoiceGraceFeeWaiver::consume_waiver`]. There is no transition
/// out of `Consumed`, which makes a waiver strictly one-time and
/// non-reversible.
#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub(crate) enum WaiverState {
    /// A waiver exists and has not been used yet.
    Granted,
    /// The waiver has been used; late fees apply again from now on.
    Consumed,
}
