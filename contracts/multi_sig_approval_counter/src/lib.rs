//! M-of-N distinct-address approval counter.
//!
//! Standalone Soroban contract crate. Requires a configurable number of distinct
//! addresses to approve an action id before a boolean flag flips to true; a repeated
//! approval from the same address does not count twice.

#![no_std]

mod counter;
mod types;

pub use types::ApprovalError;

use soroban_sdk::{contract, contractimpl, Address, Env, Symbol};

#[cfg(test)]
mod tests;

#[contract]
pub struct MultiSigApprovalCounter;

#[contractimpl]
impl MultiSigApprovalCounter {
    /// Records an approval from `approver` for `action_id`.
    /// Returns true if the action is approved (meets or exceeds `required`).
    pub fn approve(
        env: Env,
        action_id: Symbol,
        approver: Address,
        required: u32,
    ) -> bool {
        counter::approve(&env, &action_id, &approver, required)
    }

    /// Returns true if `action_id` has gathered enough distinct approvals.
    pub fn is_approved(env: Env, action_id: Symbol) -> bool {
        counter::is_approved(&env, &action_id)
    }

    /// Returns the number of distinct approvals gathered so far for `action_id`.
    pub fn approval_count(env: Env, action_id: Symbol) -> u32 {
        counter::approval_count(&env, &action_id)
    }

    /// Returns true if `approver` has already approved `action_id`.
    pub fn has_approved(env: Env, action_id: Symbol, approver: Address) -> bool {
        counter::has_approved(&env, &action_id, &approver)
    }
}
