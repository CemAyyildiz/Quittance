#![no_std]

//! `sliding-window-counter` — a standalone Soroban primitive that counts
//! events inside a sliding ledger window.
//!
//! The contract records the ledger of every event and answers the question
//! "how many of those events are inside the last `window` ledgers?". It is
//! deliberately generic: the same counter can back any "N events per
//! window" rule (rate limits, burst allowances, per-seller invoice pacing).
//!
//! The crate is intentionally standalone: it is not a member of the root
//! workspace, performs no cross-contract calls, and is not wired into the
//! Quittance frontend or backend.

use soroban_sdk::{contract, contractimpl, Env, Vec};

mod types;
mod window;

pub use crate::types::{ClearedEvent, DataKey, PrunedEvent, RecordedEvent};
pub use crate::window::{count_in_window, is_in_window, is_prunable, window_start};

/// Load the recorded ledgers, or an empty list when nothing was recorded yet.
fn load_records(env: &Env) -> Vec<u32> {
    env.storage()
        .instance()
        .get(&DataKey::Records)
        .unwrap_or_else(|| Vec::new(env))
}

/// Generic sliding ledger-window event counter.
#[contract]
pub struct SlidingWindowCounter;

#[contractimpl]
impl SlidingWindowCounter {
    /// Record an event that happened in `ledger`.
    ///
    /// Returns the total number of events recorded so far. Recording the
    /// same ledger twice records two events — each call is a separate event.
    pub fn record(env: Env, ledger: u32) -> u32 {
        let mut records = load_records(&env);
        records.push_back(ledger);
        let total = records.len();

        env.storage().instance().set(&DataKey::Records, &records);
        env.events().publish_event(&RecordedEvent { ledger, total });

        total
    }

    /// Count the recorded events that fall inside the window ending at
    /// `current_ledger`.
    ///
    /// The window spans `window` ledgers and is inclusive on both ends:
    /// `window == 1` contains only `current_ledger`, `window == 10` contains
    /// `current_ledger - 9 ..= current_ledger`. A window of `0` ledgers is
    /// empty and always counts `0`. Events recorded above `current_ledger`
    /// are never counted.
    pub fn count_in_window(env: Env, current_ledger: u32, window: u32) -> u32 {
        let records = load_records(&env);
        window::count_in_window(records.iter(), current_ledger, window)
    }

    /// Return the total number of recorded events, in every window.
    pub fn total(env: Env) -> u32 {
        load_records(&env).len()
    }

    /// Drop the events that fell out of the window and return how many
    /// events are left.
    ///
    /// Events recorded in the future are kept, because they may still become
    /// part of a later window.
    pub fn prune(env: Env, current_ledger: u32, window: u32) -> u32 {
        let records = load_records(&env);
        let mut kept = Vec::new(&env);
        let mut removed = 0_u32;

        for ledger in records.iter() {
            if window::is_prunable(ledger, current_ledger, window) {
                removed = removed.saturating_add(1);
            } else {
                kept.push_back(ledger);
            }
        }

        let remaining = kept.len();
        env.storage().instance().set(&DataKey::Records, &kept);
        env.events()
            .publish_event(&PrunedEvent { removed, remaining });

        remaining
    }

    /// Remove every recorded event and return how many were removed.
    pub fn clear(env: Env) -> u32 {
        let records = load_records(&env);
        let removed = records.len();

        env.storage()
            .instance()
            .set(&DataKey::Records, &Vec::<u32>::new(&env));
        env.events().publish_event(&ClearedEvent { removed });

        removed
    }
}

#[cfg(test)]
mod test;
