use soroban_sdk::{Env, Symbol};

use crate::types::DataKey;

const DAY_IN_LEDGERS: u32 = 17_280;
const BUMP_THRESHOLD: u32 = 30 * DAY_IN_LEDGERS;
const BUMP_TO: u32 = 120 * DAY_IN_LEDGERS;

pub(crate) fn attempts(env: &Env, reference: &Symbol) -> u32 {
    env.storage()
        .persistent()
        .get(&DataKey::Attempts(reference.clone()))
        .unwrap_or(0)
}

pub(crate) fn set_attempts(env: &Env, reference: &Symbol, count: u32) {
    let key = DataKey::Attempts(reference.clone());
    let storage = env.storage().persistent();
    storage.set(&key, &count);
    storage.extend_ttl(&key, BUMP_THRESHOLD, BUMP_TO);
}
