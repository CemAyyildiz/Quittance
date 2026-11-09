//! Persistent storage helpers for `multi-sig-approval-counter`.

use soroban_sdk::{Env, Symbol};

use crate::types::{ActionRecord, DataKey};

/// Load the [`ActionRecord`] for `action_id`, if any.
pub(crate) fn get_action(env: &Env, action_id: &Symbol) -> Option<ActionRecord> {
    env.storage()
        .persistent()
        .get(&DataKey::Action(action_id.clone()))
}

/// Persist the [`ActionRecord`] for `action_id`.
pub(crate) fn set_action(env: &Env, action_id: &Symbol, record: &ActionRecord) {
    env.storage()
        .persistent()
        .set(&DataKey::Action(action_id.clone()), record);
}
