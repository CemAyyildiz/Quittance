//! Persistent storage helpers for `payment-receipt-counter`.

use soroban_sdk::{Address, Env};

use crate::types::DataKey;

pub(crate) fn get_count(env: &Env, payer: &Address) -> u32 {
    env.storage()
        .persistent()
        .get(&DataKey::Count(payer.clone()))
        .unwrap_or(0)
}

pub(crate) fn set_count(env: &Env, payer: &Address, count: u32) {
    env.storage()
        .persistent()
        .set(&DataKey::Count(payer.clone()), &count);
}
