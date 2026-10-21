//! Per-payer successful-payment counter.
//!
//! Standalone Soroban contract. Tracks the number of successful payments a given
//! payer address has made across all invoices, intended as an input for loyalty logic.

#![no_std]

mod tracker;
mod types;

pub use types::CounterError;

use soroban_sdk::{contract, contractimpl, Address, Env};

#[cfg(test)]
mod tests;

#[contract]
pub struct PaymentReceiptCounter;

#[contractimpl]
impl PaymentReceiptCounter {
    /// Records a successful payment for `payer` and returns their new total count.
    pub fn record_payment(env: Env, payer: Address) -> u32 {
        tracker::record_payment(&env, &payer)
    }

    /// Returns the number of recorded successful payments for `payer`.
    pub fn count_for(env: Env, payer: Address) -> u32 {
        tracker::count_for(&env, &payer)
    }

    /// Returns the global total number of payments recorded by this counter.
    pub fn total_payments(env: Env) -> u32 {
        tracker::total_payments(&env)
    }
}
