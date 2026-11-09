//! Type definitions for `payment-fee-tier`.

use soroban_sdk::{contracterror, contracttype};

/// Maximum valid basis-points value (100.00%).
pub const MAX_FEE_BPS: u32 = 10_000;

/// Represents a single volume threshold and its associated fee in basis points.
#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct VolumeTier {
    /// Minimum cumulative volume required to unlock this tier (`cumulative_volume >= min_volume`).
    pub min_volume: i128,
    /// Fee in basis points (`0..=10_000`).
    pub fee_bps: u32,
}

/// Validation errors returned by checked fee-tier calculations.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum FeeTierError {
    /// `thresholds` was empty.
    EmptyThresholds = 1,
    /// `cumulative_volume` or `payment_amount` was negative.
    NegativeAmount = 2,
    /// A threshold had a negative `min_volume` or thresholds were not strictly increasing.
    InvalidThresholdOrder = 3,
    /// A threshold specified `fee_bps > 10_000`.
    InvalidFeeBps = 4,
    /// Multiplying `payment_amount * fee_bps` overflowed `i128`.
    MathOverflow = 5,
}

impl FeeTierError {
    /// Human-readable description of the error.
    #[must_use]
    pub const fn message(self) -> &'static str {
        match self {
            FeeTierError::EmptyThresholds => "At least one volume threshold is required.",
            FeeTierError::NegativeAmount => "Volume and payment amounts must be non-negative.",
            FeeTierError::InvalidThresholdOrder => {
                "Thresholds must have non-negative, strictly increasing volume bounds."
            }
            FeeTierError::InvalidFeeBps => "Fee basis points must not exceed 10_000.",
            FeeTierError::MathOverflow => "Fee calculation overflowed i128.",
        }
    }
}
