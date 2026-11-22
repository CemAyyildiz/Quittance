use soroban_sdk::{Address, Env};

use crate::types::DataKey;

// Bump both the per-seller flag and instance entries while the flag is used.
// Persistent entries can be restored if they later become archived.
const BUMP_THRESHOLD: u32 = 30 * 17_280;
const BUMP_TO: u32 = 90 * 17_280;

pub(crate) fn set_verified(env: &Env, seller: &Address, verified: bool) {
    let key = DataKey::Verified(seller.clone());
    env.storage().persistent().set(&key, &verified);
    env.storage()
        .persistent()
        .extend_ttl(&key, BUMP_THRESHOLD, BUMP_TO);
    env.storage().instance().extend_ttl(BUMP_THRESHOLD, BUMP_TO);
}

pub(crate) fn is_verified(env: &Env, seller: &Address) -> bool {
    let key = DataKey::Verified(seller.clone());
    let verified = env.storage().persistent().get(&key).unwrap_or(false);
    if env.storage().persistent().has(&key) {
        env.storage()
            .persistent()
            .extend_ttl(&key, BUMP_THRESHOLD, BUMP_TO);
    }
    verified
}
