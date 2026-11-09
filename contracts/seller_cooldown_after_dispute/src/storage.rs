//! Persistent storage helpers for `seller-cooldown-after-dispute`.

use soroban_sdk::{Address, Env};

use crate::types::DataKey;

/// Read the last recorded dispute ledger for `seller`, if any.
pub(crate) fn get_dispute_ledger(env: &Env, seller: &Address) -> Option<u32> {
    env.storage()
        .persistent()
        .get(&DataKey::LastDisputeLedger(seller.clone()))
}

/// Store `ledger` as the latest dispute ledger for `seller`.
pub(crate) fn set_dispute_ledger(env: &Env, seller: &Address, ledger: u32) {
    env.storage()
        .persistent()
        .set(&DataKey::LastDisputeLedger(seller.clone()), &ledger);
}

/// Record a dispute at `ledger` monotonically: if a later dispute ledger is
/// already stored for `seller`, keep the later one so an out-of-order call
/// never shortens an active cooldown.
pub(crate) fn record_dispute_monotonic(env: &Env, seller: &Address, ledger: u32) -> u32 {
    match get_dispute_ledger(env, seller) {
        Some(existing) if existing > ledger => existing,
        _ => {
            set_dispute_ledger(env, seller, ledger);
            ledger
        }
    }
}
