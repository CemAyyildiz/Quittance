//! Persistent storage helpers for `dispute-resolution-outcome`.

use soroban_sdk::{Env, Symbol};

use crate::types::{DataKey, Outcome};

pub(crate) fn get_outcome(env: &Env, dispute_id: &Symbol) -> Option<Outcome> {
    env.storage()
        .persistent()
        .get(&DataKey::Outcome(dispute_id.clone()))
}

pub(crate) fn set_outcome(env: &Env, dispute_id: &Symbol, outcome: Outcome) {
    env.storage()
        .persistent()
        .set(&DataKey::Outcome(dispute_id.clone()), &outcome);
}
