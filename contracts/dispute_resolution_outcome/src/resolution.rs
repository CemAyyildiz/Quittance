use soroban_sdk::{Env, Symbol};
use crate::types::{DataKey, DisputeError, Outcome};

pub fn record_outcome(
    env: &Env,
    dispute_id: &Symbol,
    outcome: Outcome,
) -> Result<(), DisputeError> {
    let key = DataKey::DisputeOutcome(dispute_id.clone());
    if env.storage().persistent().has(&key) {
        return Err(DisputeError::AlreadyResolved);
    }
    env.storage().persistent().set(&key, &outcome);
    Ok(())
}

pub fn get_outcome(env: &Env, dispute_id: &Symbol) -> Option<Outcome> {
    let key = DataKey::DisputeOutcome(dispute_id.clone());
    env.storage().persistent().get(&key)
}

pub fn has_outcome(env: &Env, dispute_id: &Symbol) -> bool {
    let key = DataKey::DisputeOutcome(dispute_id.clone());
    env.storage().persistent().has(&key)
}
