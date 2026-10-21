use soroban_sdk::{panic_with_error, Address, Env, Symbol};

use crate::types::{ApprovalError, DataKey};

pub(crate) fn is_approved(env: &Env, action_id: &Symbol) -> bool {
    env.storage()
        .persistent()
        .get(&DataKey::Approved(action_id.clone()))
        .unwrap_or(false)
}

pub(crate) fn approval_count(env: &Env, action_id: &Symbol) -> u32 {
    env.storage()
        .persistent()
        .get(&DataKey::Count(action_id.clone()))
        .unwrap_or(0)
}

pub(crate) fn has_approved(env: &Env, action_id: &Symbol, approver: &Address) -> bool {
    env.storage()
        .persistent()
        .has(&DataKey::HasApproved(action_id.clone(), approver.clone()))
}

pub(crate) fn approve(
    env: &Env,
    action_id: &Symbol,
    approver: &Address,
    required: u32,
) -> bool {
    approver.require_auth();

    if required == 0 {
        panic_with_error!(env, ApprovalError::ZeroThreshold);
    }

    if is_approved(env, action_id) {
        return true;
    }

    // Repeated approvals from same address do not count twice
    if has_approved(env, action_id, approver) {
        return false;
    }

    env.storage()
        .persistent()
        .set(&DataKey::HasApproved(action_id.clone(), approver.clone()), &true);

    let current = approval_count(env, action_id);
    let next = current.saturating_add(1);
    env.storage()
        .persistent()
        .set(&DataKey::Count(action_id.clone()), &next);

    if next >= required {
        env.storage()
            .persistent()
            .set(&DataKey::Approved(action_id.clone()), &true);
        true
    } else {
        false
    }
}
