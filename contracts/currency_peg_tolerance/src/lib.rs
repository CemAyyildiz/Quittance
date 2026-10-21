//! Peg-rate tolerance band checker.
//!
//! Standalone Soroban contract crate. Pure calculator checking whether a quoted peg
//! or conversion rate falls within an admin-configured tolerance band around a reference rate,
//! flagging anything outside the band as invalid.

#![no_std]

mod calc;
mod types;

pub use types::PegError;

use soroban_sdk::{contract, contractimpl, Env};

#[cfg(test)]
mod tests;

#[contract]
pub struct CurrencyPegTolerance;

#[contractimpl]
impl CurrencyPegTolerance {
    /// Returns true if `quoted_rate` falls within `tolerance_bps` basis points of `reference_rate`.
    pub fn is_within_band(
        _env: Env,
        quoted_rate: i128,
        reference_rate: i128,
        tolerance_bps: u32,
    ) -> bool {
        calc::is_within_band(quoted_rate, reference_rate, tolerance_bps)
    }

    /// Verifies that `quoted_rate` is strictly positive and within the tolerance band,
    /// returning a descriptive error otherwise.
    pub fn check_rate(
        _env: Env,
        quoted_rate: i128,
        reference_rate: i128,
        tolerance_bps: u32,
    ) -> Result<(), PegError> {
        calc::check_rate(quoted_rate, reference_rate, tolerance_bps)
    }
}
