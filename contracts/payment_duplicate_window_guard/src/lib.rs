#![no_std]

//! Sliding-window duplicate detection for payment references.

mod storage;
mod types;

pub use types::DataKey;

use soroban_sdk::{contract, contractimpl, Env, Symbol};

#[contract]
pub struct PaymentDuplicateWindowGuard;

#[contractimpl]
impl PaymentDuplicateWindowGuard {
    /// Record `reference` at `ledger`.
    ///
    /// New references and observations at or after the stored ledger are
    /// accepted. An older ledger is rejected without mutating storage.
    pub fn record_reference(env: Env, reference: Symbol, ledger: u32) -> bool {
        if let Some(previous) = storage::last_seen(&env, &reference) {
            if ledger < previous {
                return false;
            }
        }
        storage::set_last_seen(&env, &reference, ledger);
        true
    }

    /// Return whether `reference` falls in its inclusive duplicate window.
    ///
    /// An unknown reference is never a duplicate. A current ledger before
    /// the stored ledger is treated conservatively as a duplicate.
    pub fn is_duplicate(env: Env, reference: Symbol, current_ledger: u32, window: u32) -> bool {
        match storage::last_seen(&env, &reference) {
            None => false,
            Some(recorded) if current_ledger < recorded => true,
            Some(recorded) => current_ledger - recorded <= window,
        }
    }

    /// Return the most recently recorded ledger for `reference`.
    pub fn last_seen(env: Env, reference: Symbol) -> Option<u32> {
        storage::last_seen(&env, &reference)
    }
}
