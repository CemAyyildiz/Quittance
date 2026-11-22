//! Persistent-storage accessors for `invoice-amount-range`.

use crate::types::{AmountRange, DataKey};
use soroban_sdk::{Address, Env};

/// Read the configured range for `seller`, or `None` when none has been set.
pub fn get_range(env: &Env, seller: &Address) -> Option<AmountRange> {
    env.storage()
        .persistent()
        .get(&DataKey::Range(seller.clone()))
}

/// Persist the amount range for `seller`.
pub fn set_range(env: &Env, seller: &Address, range: &AmountRange) {
    env.storage()
        .persistent()
        .set(&DataKey::Range(seller.clone()), range);
}

/// Return `true` when `seller` has a configured range.
#[allow(dead_code)]
pub fn has_range(env: &Env, seller: &Address) -> bool {
    env.storage()
        .persistent()
        .has(&DataKey::Range(seller.clone()))
}
