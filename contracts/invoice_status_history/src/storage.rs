use soroban_sdk::{Env, Symbol, Vec};

use crate::types::{DataKey, Transition};

// Bump both the per-invoice history and instance entries while the log is used.
// Persistent entries can be restored if they later become archived.
const BUMP_THRESHOLD: u32 = 30 * 17_280;
const BUMP_TO: u32 = 90 * 17_280;

pub(crate) fn load(env: &Env, invoice_id: &Symbol) -> Vec<Transition> {
    let key = DataKey::History(invoice_id.clone());
    let history = env
        .storage()
        .persistent()
        .get(&key)
        .unwrap_or_else(|| Vec::new(env));
    if env.storage().persistent().has(&key) {
        env.storage()
            .persistent()
            .extend_ttl(&key, BUMP_THRESHOLD, BUMP_TO);
    }
    history
}

pub(crate) fn append(
    env: &Env,
    invoice_id: &Symbol,
    entry: Transition,
    mut history: Vec<Transition>,
) {
    let key = DataKey::History(invoice_id.clone());
    history.push_back(entry);
    env.storage().persistent().set(&key, &history);
    env.storage()
        .persistent()
        .extend_ttl(&key, BUMP_THRESHOLD, BUMP_TO);
    env.storage().instance().extend_ttl(BUMP_THRESHOLD, BUMP_TO);
}
