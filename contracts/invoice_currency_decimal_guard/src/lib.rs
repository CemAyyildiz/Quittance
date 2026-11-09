//! `invoice-currency-decimal-guard` — standalone Soroban expected-decimals guard.

#![no_std]
#![deny(unsafe_code)]

mod logic;
mod types;

#[cfg(test)]
mod tests;

pub use crate::logic::{abs_diff, check_decimals};
pub use crate::types::{Error, MAX_DECIMALS, STELLAR_DEFAULT_DECIMALS};

use soroban_sdk::{contract, contractimpl, Env};

#[contract]
pub struct InvoiceCurrencyDecimalGuard;

#[contractimpl]
impl InvoiceCurrencyDecimalGuard {
    /// Return `true` iff `token_decimals` equals `expected_decimals` and lies within `[0, MAX_DECIMALS]`.
    pub fn matches_expected_decimals(
        _env: Env,
        token_decimals: u32,
        expected_decimals: u32,
    ) -> bool {
        logic::check_decimals(token_decimals, expected_decimals).is_ok()
    }

    /// Fallible validator returning `Ok(expected_decimals)` or a typed [`Error`].
    pub fn validate_decimals(
        _env: Env,
        token_decimals: u32,
        expected_decimals: u32,
    ) -> Result<u32, Error> {
        logic::check_decimals(token_decimals, expected_decimals)
    }

    /// Return the absolute difference between `token_decimals` and `expected_decimals`.
    pub fn decimal_delta(_env: Env, token_decimals: u32, expected_decimals: u32) -> u32 {
        logic::abs_diff(token_decimals, expected_decimals)
    }
}
