//! `payment-amount-tolerance` — standalone Soroban contract: rounding-tolerance
//! payment amount check.

#![no_std]
#![deny(unsafe_code)]

mod logic;
mod tolerance;
mod types;

#[cfg(test)]
mod tests;

pub use crate::logic::{build_report, check_within_tolerance, verify_tolerance};
pub use crate::tolerance::abs_diff_non_negative;
pub use crate::types::{ToleranceError, ToleranceReport};

use soroban_sdk::{contract, contractimpl, Env};

/// Pure rounding-tolerance payment amount predicate contract.
#[contract]
pub struct PaymentAmountTolerance;

#[contractimpl]
impl PaymentAmountTolerance {
    /// Return `true` when `received` is within `tolerance` of `expected`
    /// (`|expected - received| <= tolerance`), with `expected > 0`,
    /// `received >= 0`, and `tolerance >= 0`.
    pub fn is_within_tolerance(_env: Env, expected: i128, received: i128, tolerance: i128) -> bool {
        logic::check_within_tolerance(expected, received, tolerance)
    }

    /// Validated check returning the signed delta `received - expected` or a
    /// specific [`ToleranceError`].
    pub fn verify_within_tolerance(
        _env: Env,
        expected: i128,
        received: i128,
        tolerance: i128,
    ) -> Result<i128, ToleranceError> {
        logic::verify_tolerance(expected, received, tolerance)
    }

    /// Return a [`ToleranceReport`] pairing `accepted` and `abs_diff`.
    pub fn evaluate(_env: Env, expected: i128, received: i128, tolerance: i128) -> ToleranceReport {
        logic::build_report(expected, received, tolerance)
    }
}
