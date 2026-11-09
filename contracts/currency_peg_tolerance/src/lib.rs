//! `currency-peg-tolerance` — standalone Soroban peg-rate tolerance band checker.

#![no_std]
#![deny(unsafe_code)]

mod logic;
mod types;

#[cfg(test)]
mod tests;

pub use crate::logic::{check_band, compute_bounds};
pub use crate::types::{Error, BPS_DENOMINATOR, MAX_TOLERANCE_BPS};

use soroban_sdk::{contract, contractimpl, Env};

#[contract]
pub struct CurrencyPegTolerance;

#[contractimpl]
impl CurrencyPegTolerance {
    /// Return `true` iff `quoted_rate` falls within `tolerance_bps` of `reference_rate`.
    pub fn is_within_band(
        _env: Env,
        quoted_rate: i128,
        reference_rate: i128,
        tolerance_bps: u32,
    ) -> bool {
        logic::check_band(quoted_rate, reference_rate, tolerance_bps).is_ok()
    }

    /// Validate `quoted_rate` against `reference_rate` and `tolerance_bps`.
    pub fn validate_rate(
        _env: Env,
        quoted_rate: i128,
        reference_rate: i128,
        tolerance_bps: u32,
    ) -> Result<(), Error> {
        logic::check_band(quoted_rate, reference_rate, tolerance_bps)
    }

    /// Compute the inclusive `(min_rate, max_rate)` band bounds.
    pub fn band_bounds(
        _env: Env,
        reference_rate: i128,
        tolerance_bps: u32,
    ) -> Result<(i128, i128), Error> {
        logic::compute_bounds(reference_rate, tolerance_bps)
    }
}
