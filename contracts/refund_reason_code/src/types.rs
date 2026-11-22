//! Types for the `refund-reason-code` crate.
//!
//! A refund record maps a refund identifier to the single reason code that
//! refund was issued for. Once the mapping exists it never changes.

use soroban_sdk::{contracterror, contracttype, Symbol};

/// The fixed set of reasons a refund can be recorded against.
///
/// The set is part of the contract's public ABI. Variants are never reordered
/// and never removed, because a code stored on-chain must keep its meaning
/// forever.
#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ReasonCode {
    /// The customer asked for the money back.
    CustomerRequest,
    /// The same charge was applied more than once.
    DuplicateCharge,
    /// The paid good or service was never delivered.
    ServiceNotDelivered,
    /// The payment was reported as fraudulent.
    Fraudulent,
    /// A reason outside the named cases.
    Other,
}

impl ReasonCode {
    /// Return a stable English label for the reason.
    ///
    /// The label is intended for off-chain display only. It is never stored
    /// on-chain, so changing it cannot change what a stored code means.
    pub fn label(&self) -> &'static str {
        match self {
            ReasonCode::CustomerRequest => "customer_request",
            ReasonCode::DuplicateCharge => "duplicate_charge",
            ReasonCode::ServiceNotDelivered => "service_not_delivered",
            ReasonCode::Fraudulent => "fraudulent",
            ReasonCode::Other => "other",
        }
    }
}

/// Storage keys used by this contract.
#[contracttype]
#[derive(Clone)]
pub(crate) enum DataKey {
    /// The immutable reason recorded for a refund id.
    Reason(Symbol),
}

/// Errors returned by [`crate::RefundReasonCode::record_reason`].
///
/// Each variant carries a stable `#[repr(u32)]` discriminant so off-chain
/// tooling can match on the numeric code without depending on the Rust
/// identifier.
#[contracterror]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    /// A reason is already stored for this refund id and cannot be replaced.
    AlreadyRecorded = 1,
}

impl Error {
    /// Return a stable English message describing the error.
    pub fn message(&self) -> &'static str {
        match self {
            Error::AlreadyRecorded => "A reason is already recorded for this refund id.",
        }
    }
}
