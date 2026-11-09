//! Type definitions for `payment-amount-tolerance`.

use soroban_sdk::{contracterror, contracttype};

/// Summary returned by [`crate::PaymentAmountTolerance::evaluate`].
#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct ToleranceReport {
    /// Whether the payment passed the tolerance predicate.
    pub accepted: bool,
    /// Absolute difference `|expected - received|` (or `i128::MAX` on invalid inputs).
    pub abs_diff: i128,
}

/// Detailed error reasons returned by [`crate::PaymentAmountTolerance::verify_within_tolerance`].
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum ToleranceError {
    /// `expected` must be strictly positive (`> 0`).
    InvalidExpectedAmount = 1,
    /// `received` must be non-negative (`>= 0`).
    NegativeReceivedAmount = 2,
    /// `tolerance` must be non-negative (`>= 0`).
    NegativeTolerance = 3,
    /// `|expected - received| > tolerance`.
    OutsideTolerance = 4,
}

impl ToleranceError {
    /// Human-readable description of the error.
    #[must_use]
    pub const fn message(self) -> &'static str {
        match self {
            ToleranceError::InvalidExpectedAmount => "Expected invoice amount must be positive.",
            ToleranceError::NegativeReceivedAmount => "Received payment amount cannot be negative.",
            ToleranceError::NegativeTolerance => "Tolerance cannot be negative.",
            ToleranceError::OutsideTolerance => "Payment difference exceeds allowed tolerance.",
        }
    }
}
