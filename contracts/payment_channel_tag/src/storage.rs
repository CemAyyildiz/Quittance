use soroban_sdk::{Env, Symbol};

use crate::types::{Channel, DataKey};

// Bump both the per-payment channel and instance entries while the tag is used.
// Persistent entries can be restored if they later become archived.
const BUMP_THRESHOLD: u32 = 30 * 17_280;
const BUMP_TO: u32 = 90 * 17_280;

pub(crate) fn load(env: &Env, payment_id: &Symbol) -> Option<Channel> {
    let key = DataKey::Channel(payment_id.clone());
    let channel = env.storage().persistent().get(&key);
    if env.storage().persistent().has(&key) {
        env.storage()
            .persistent()
            .extend_ttl(&key, BUMP_THRESHOLD, BUMP_TO);
    }
    channel
}

pub(crate) fn store(env: &Env, payment_id: &Symbol, channel: Channel) {
    let key = DataKey::Channel(payment_id.clone());
    env.storage().persistent().set(&key, &channel);
    env.storage()
        .persistent()
        .extend_ttl(&key, BUMP_THRESHOLD, BUMP_TO);
    env.storage().instance().extend_ttl(BUMP_THRESHOLD, BUMP_TO);
}
