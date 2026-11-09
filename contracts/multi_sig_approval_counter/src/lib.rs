//! `multi-sig-approval-counter` — standalone Soroban contract: M-of-N
//! distinct-address approval counter.

#![no_std]
#![deny(unsafe_code)]

mod logic;
mod storage;
mod types;

#[cfg(test)]
mod tests;

pub use crate::logic::{threshold_met, validate_threshold};
pub use crate::types::{ActionRecord, ApprovalError, DataKey};

use soroban_sdk::{contract, contractimpl, Address, Env, Symbol};

/// M-of-N distinct-address approval counter contract.
#[contract]
pub struct MultiSigApprovalCounter;

#[contractimpl]
impl MultiSigApprovalCounter {
    /// Record `approver`'s approval for `action_id` with threshold `required`
    /// and return whether `action_id` is now approved.
    pub fn approve(env: Env, action_id: Symbol, approver: Address, required: u32) -> bool {
        approver.require_auth();
        logic::record_approval(&env, &action_id, &approver, required)
    }

    /// Record `approver`'s approval for `action_id`, returning an explicit
    /// [`ApprovalError`] if `required == 0` or if `required` differs from the
    /// threshold already locked for `action_id`.
    pub fn approve_checked(
        env: Env,
        action_id: Symbol,
        approver: Address,
        required: u32,
    ) -> Result<bool, ApprovalError> {
        approver.require_auth();
        logic::record_approval_checked(&env, &action_id, &approver, required)
    }

    /// Return `true` if `action_id` has reached its required number of
    /// distinct approvals.
    pub fn is_approved(env: Env, action_id: Symbol) -> bool {
        storage::get_action(&env, &action_id)
            .map(|r| r.approved)
            .unwrap_or(false)
    }

    /// Return the current number of distinct approvals recorded for `action_id`.
    pub fn approval_count(env: Env, action_id: Symbol) -> u32 {
        storage::get_action(&env, &action_id)
            .map(|r| r.approvers.len())
            .unwrap_or(0)
    }

    /// Return whether `approver` has already approved `action_id`.
    pub fn has_approved(env: Env, action_id: Symbol, approver: Address) -> bool {
        storage::get_action(&env, &action_id)
            .map(|r| r.approvers.iter().any(|a| a == approver))
            .unwrap_or(false)
    }

    /// Return the locked `required` threshold for `action_id`, or `None` if
    /// no approval has been recorded yet.
    pub fn required_for(env: Env, action_id: Symbol) -> Option<u32> {
        storage::get_action(&env, &action_id).map(|r| r.required)
    }
}
