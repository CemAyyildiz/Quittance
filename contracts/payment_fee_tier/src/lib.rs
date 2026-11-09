//! `payment-fee-tier` — standalone Soroban contract: cumulative-volume fee
//! tier calculator.

#![no_std]
#![deny(unsafe_code)]

mod logic;
mod tiers;
mod types;

#[cfg(test)]
mod tests;

pub use crate::logic::{compute_fee_for_payment, resolve_fee_bps, resolve_fee_bps_checked};
pub use crate::tiers::validate_thresholds;
pub use crate::types::{FeeTierError, VolumeTier, MAX_FEE_BPS};

use soroban_sdk::{contract, contractimpl, Env, Vec};

/// Pure cumulative-volume fee tier calculator contract.
#[contract]
pub struct PaymentFeeTier;

#[contractimpl]
impl PaymentFeeTier {
    /// Look up the fee in basis points for `cumulative_volume` against
    /// `thresholds` (`Vec<(min_volume, fee_bps)>`).
    pub fn fee_bps_for_volume(
        _env: Env,
        cumulative_volume: i128,
        thresholds: Vec<(i128, u32)>,
    ) -> u32 {
        logic::resolve_fee_bps(cumulative_volume, &thresholds)
    }

    /// Validated lookup that rejects negative volumes, empty/unsorted
    /// thresholds, or basis points above `10_000`.
    pub fn fee_bps_for_volume_checked(
        _env: Env,
        cumulative_volume: i128,
        thresholds: Vec<(i128, u32)>,
    ) -> Result<u32, FeeTierError> {
        logic::resolve_fee_bps_checked(cumulative_volume, &thresholds)
    }

    /// Calculate the fee amount for `payment_amount` at the seller's
    /// `cumulative_volume` tier.
    pub fn calculate_fee_amount(
        _env: Env,
        payment_amount: i128,
        cumulative_volume: i128,
        thresholds: Vec<(i128, u32)>,
    ) -> Result<i128, FeeTierError> {
        logic::compute_fee_for_payment(payment_amount, cumulative_volume, &thresholds)
    }
}
