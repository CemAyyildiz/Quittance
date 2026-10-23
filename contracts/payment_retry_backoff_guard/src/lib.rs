#![no_std]

//! Minimum-ledger-gap retry guard for payment references.

mod backoff;
mod storage;
mod types;

pub use types::{DataKey, Error};

use soroban_sdk::{contract, contractimpl, Env, Symbol};

#[contract]
pub struct PaymentRetryBackoffGuard;

#[contractimpl]
impl PaymentRetryBackoffGuard {
    /// Record an attempt if at least `min_gap` ledgers have elapsed.
    pub fn record_attempt(
        env: Env,
        reference: Symbol,
        ledger: u32,
        min_gap: u32,
    ) -> Result<(), Error> {
        if let Some(previous) = storage::last_attempt(&env, &reference) {
            backoff::validate(previous, ledger, min_gap)?;
        }
        storage::set_last_attempt(&env, &reference, ledger);
        Ok(())
    }

    /// Return the most recently accepted ledger for `reference`.
    pub fn last_attempt(env: Env, reference: Symbol) -> Option<u32> {
        storage::last_attempt(&env, &reference)
    }

    /// Return whether an attempt would be accepted without changing state.
    pub fn can_attempt(env: Env, reference: Symbol, ledger: u32, min_gap: u32) -> bool {
        match storage::last_attempt(&env, &reference) {
            None => true,
            Some(previous) => backoff::validate(previous, ledger, min_gap).is_ok(),
        }
    }
}
