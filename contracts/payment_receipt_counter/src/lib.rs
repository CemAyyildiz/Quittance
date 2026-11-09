//! `payment-receipt-counter` — standalone Soroban per-payer successful-payment counter.

#![no_std]
#![deny(unsafe_code)]

mod logic;
mod storage;
mod types;

#[cfg(test)]
mod tests;

pub use crate::logic::checked_increment;
pub use crate::types::{DataKey, Error};

use soroban_sdk::{contract, contractimpl, Address, Env};

#[contract]
pub struct PaymentReceiptCounter;

#[contractimpl]
impl PaymentReceiptCounter {
    /// Increment and return the successful-payment count for `payer`.
    pub fn record_payment(env: Env, payer: Address) -> u32 {
        Self::increment_payment(env, payer).expect("payment counter overflow")
    }

    /// Return the current successful-payment count for `payer` (`0` if none).
    pub fn count_for(env: Env, payer: Address) -> u32 {
        storage::get_count(&env, &payer)
    }

    /// Checked increment returning [`Error::CounterOverflow`] if already at `u32::MAX`.
    pub fn increment_payment(env: Env, payer: Address) -> Result<u32, Error> {
        let current = storage::get_count(&env, &payer);
        let next = logic::checked_increment(current)?;
        storage::set_count(&env, &payer, next);
        Ok(next)
    }
}
