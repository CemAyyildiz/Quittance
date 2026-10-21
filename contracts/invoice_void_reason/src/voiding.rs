use soroban_sdk::{Env, Symbol};

use crate::types::{DataKey, VoidRecord};

const BUMP_THRESHOLD: u32 = 30 * 17_280;
const BUMP_TO: u32 = 90 * 17_280;

pub(crate) fn record_of(env: &Env, invoice_id: &Symbol) -> Option<VoidRecord> {
    let key = DataKey::Void(invoice_id.clone());
    let record = env.storage().persistent().get(&key);
    if record.is_some() {
        env.storage()
            .persistent()
            .extend_ttl(&key, BUMP_THRESHOLD, BUMP_TO);
    }
    record
}

/// Stores the first void. A later call leaves the original record in place.
pub(crate) fn void(env: &Env, invoice_id: &Symbol, record: VoidRecord) -> bool {
    if record_of(env, invoice_id).is_some() {
        return false;
    }
    let key = DataKey::Void(invoice_id.clone());
    env.storage().persistent().set(&key, &record);
    env.storage()
        .persistent()
        .extend_ttl(&key, BUMP_THRESHOLD, BUMP_TO);
    true
}
