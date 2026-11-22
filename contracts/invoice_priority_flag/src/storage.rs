use soroban_sdk::{Env, Symbol};

use crate::types::{DataKey, Priority};

// Bump both the per-invoice priority and instance entries while the flag is
// used. Persistent entries can be restored if they later become archived.
const BUMP_THRESHOLD: u32 = 30 * 17_280;
const BUMP_TO: u32 = 90 * 17_280;

pub(crate) fn load(env: &Env, invoice_id: &Symbol) -> Option<Priority> {
    let key = DataKey::Priority(invoice_id.clone());
    let priority = env.storage().persistent().get(&key);
    if env.storage().persistent().has(&key) {
        env.storage()
            .persistent()
            .extend_ttl(&key, BUMP_THRESHOLD, BUMP_TO);
    }
    priority
}

pub(crate) fn is_set(env: &Env, invoice_id: &Symbol) -> bool {
    env.storage()
        .persistent()
        .has(&DataKey::Priority(invoice_id.clone()))
}

pub(crate) fn store(env: &Env, invoice_id: &Symbol, priority: Priority) {
    let key = DataKey::Priority(invoice_id.clone());
    env.storage().persistent().set(&key, &priority);
    env.storage()
        .persistent()
        .extend_ttl(&key, BUMP_THRESHOLD, BUMP_TO);
    env.storage().instance().extend_ttl(BUMP_THRESHOLD, BUMP_TO);
}
