//! Type definitions for `multi-sig-approval-counter`.

use soroban_sdk::{contracterror, contracttype, Address, Symbol, Vec};

/// Persistent storage keys for per-action approval records.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    /// Stores the [`ActionRecord`] for a given `action_id`.
    Action(Symbol),
}

/// Stored state for a single `action_id`.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ActionRecord {
    /// The required number of distinct approvals locked on the first call.
    pub required: u32,
    /// Ordered list of distinct addresses that have approved this action.
    pub approvers: Vec<Address>,
    /// Whether the threshold has been reached.
    pub approved: bool,
}

/// Errors returned by [`crate::MultiSigApprovalCounter::approve_checked`].
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum ApprovalError {
    /// `required` must be at least 1.
    InvalidThreshold = 1,
    /// Subsequent approval attempted to change the locked `required` count for this `action_id`.
    ThresholdMismatch = 2,
}

impl ApprovalError {
    /// Return a stable human-readable description of the error.
    #[must_use]
    pub const fn message(self) -> &'static str {
        match self {
            ApprovalError::InvalidThreshold => "Required approval threshold must be at least 1.",
            ApprovalError::ThresholdMismatch => {
                "Required approval threshold does not match the threshold locked for this action."
            }
        }
    }
}
