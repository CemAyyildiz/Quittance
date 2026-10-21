#![no_std]

//! Standalone Soroban payment retry counter.
//! A caller supplies the maximum allowed attempts for each invocation.

mod storage;
mod types;

pub use types::Error;

use soroban_sdk::{contract, contractimpl, Env, Symbol};

#[contract]
pub struct PaymentRetryCounter;

#[contractimpl]
impl PaymentRetryCounter {
    /// Record one attempt for `reference`, up to `max_retries` total attempts.
    /// Returns the new count, or an error without changing the count.
    pub fn record_attempt(env: Env, reference: Symbol, max_retries: u32) -> Result<u32, Error> {
        let count = storage::attempts(&env, &reference);
        if count >= max_retries {
            return Err(Error::RetryLimitReached);
        }

        // count < max_retries guarantees that adding one cannot overflow u32.
        let next = count + 1;
        storage::set_attempts(&env, &reference, next);
        Ok(next)
    }

    /// Whether another attempt can be recorded under `max_retries`.
    pub fn can_retry(env: Env, reference: Symbol, max_retries: u32) -> bool {
        storage::attempts(&env, &reference) < max_retries
    }

    /// Read the recorded attempt count; unseen references return zero.
    pub fn get_attempts(env: Env, reference: Symbol) -> u32 {
        storage::attempts(&env, &reference)
    }
}
