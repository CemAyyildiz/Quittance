#![no_std]
#![deny(unsafe_code)]

mod freshness;

use soroban_sdk::{contract, contractimpl, Env};

/// Stateless price timestamp freshness validator.
#[contract]
pub struct StalePriceRejector;

#[contractimpl]
impl StalePriceRejector {
    /// Return whether a price timestamp is fresh under the inclusive age limit.
    pub fn assert_fresh(_env: Env, price_at: u64, now: u64, max_age_secs: u64) -> bool {
        freshness::is_fresh(price_at, now, max_age_secs)
    }
}
