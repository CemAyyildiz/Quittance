//! Persistent-storage accessors for `invoice-max-count-per-seller`.

use crate::types::DataKey;
use soroban_sdk::{Address, Env};

// ── cap ─────────────────────────────────────────────────────────────────────

/// Persist the per-seller invoice cap (called once from the constructor).
pub fn set_cap(env: &Env, cap: u32) {
    env.storage().instance().set(&DataKey::Cap, &cap);
}

/// Read the configured per-seller invoice cap.
///
/// # Panics
///
/// Panics if the contract was never initialised (i.e. the constructor was
/// never called). In normal usage this cannot happen.
pub fn get_cap(env: &Env) -> u32 {
    env.storage()
        .instance()
        .get(&DataKey::Cap)
        .expect("contract not initialised: cap missing")
}

// ── per-seller count ─────────────────────────────────────────────────────────

/// Read the current invoice count for `seller` (returns `0` when no invoice
/// has been recorded yet).
pub fn get_count(env: &Env, seller: &Address) -> u32 {
    env.storage()
        .persistent()
        .get(&DataKey::Count(seller.clone()))
        .unwrap_or(0)
}

/// Persist the updated invoice count for `seller`.
pub fn set_count(env: &Env, seller: &Address, count: u32) {
    env.storage()
        .persistent()
        .set(&DataKey::Count(seller.clone()), &count);
}
