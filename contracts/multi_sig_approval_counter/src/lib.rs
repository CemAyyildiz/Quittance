#![no_std]

pub mod types;
pub mod validator;

use soroban_sdk::{contract, contractimpl, Address, Env, Symbol};
pub use types::{ApprovalError, DataKey};
pub use validator::{validate_required, MAX_REQUIRED_APPROVERS};

#[contract]
pub struct MultiSigApprovalCounterContract;

#[contractimpl]
impl MultiSigApprovalCounterContract {
    /// Records an approval from `approver` for `action_id` requiring `required` distinct
    /// approvers. Duplicate approvals from the same address do not increment the count.
    /// Returns `Ok(true)` once the required threshold is reached.
    pub fn approve(
        env: Env,
        action_id: Symbol,
        approver: Address,
        required: u32,
    ) -> Result<bool, ApprovalError> {
        approver.require_auth();
        let req_key = DataKey::ActionRequired(action_id.clone());
        let existing_req = env.storage().persistent().get::<DataKey, u32>(&req_key);
        let validated_req = validate_required(existing_req, required)?;
        if existing_req.is_none() {
            env.storage().persistent().set(&req_key, &validated_req);
        }

        let voter_key = DataKey::HasApproved(action_id.clone(), approver);
        let count_key = DataKey::ActionCount(action_id.clone());
        let mut count: u32 = env.storage().persistent().get(&count_key).unwrap_or(0);

        if !env.storage().persistent().has(&voter_key) {
            env.storage().persistent().set(&voter_key, &true);
            count = count.saturating_add(1);
            env.storage().persistent().set(&count_key, &count);
        }

        let approved = count >= validated_req;
        if approved {
            env.storage()
                .persistent()
                .set(&DataKey::ActionApproved(action_id), &true);
        }
        Ok(approved)
    }

    /// Returns `true` if `action_id` has met its required distinct-approval threshold.
    pub fn is_approved(env: Env, action_id: Symbol) -> bool {
        env.storage()
            .persistent()
            .get(&DataKey::ActionApproved(action_id))
            .unwrap_or(false)
    }

    /// Returns the current number of distinct approvals recorded for `action_id`.
    pub fn approval_count(env: Env, action_id: Symbol) -> u32 {
        env.storage()
            .persistent()
            .get(&DataKey::ActionCount(action_id))
            .unwrap_or(0)
    }

    /// Returns `true` if `approver` has already approved `action_id`.
    pub fn has_approved(env: Env, action_id: Symbol, approver: Address) -> bool {
        env.storage()
            .persistent()
            .has(&DataKey::HasApproved(action_id, approver))
    }
}
