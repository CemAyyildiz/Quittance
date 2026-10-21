//! Instance-storage accessors for `receipt-counter-per-seller`.

use crate::types::DataKey;
use soroban_sdk::{Address, Env};

/// Read the last receipt number issued for `seller` (0 when none yet).
pub fn last_issued(env: &Env, seller: &Address) -> u64 {
    env.storage()
        .instance()
        .get(&DataKey::Counter(seller.clone()))
        .unwrap_or(0)
}

/// Persist the last receipt number issued for `seller`.
pub fn set_last_issued(env: &Env, seller: &Address, value: u64) {
    env.storage()
        .instance()
        .set(&DataKey::Counter(seller.clone()), &value);
}
