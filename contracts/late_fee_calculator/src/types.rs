//! Error type and the basis-point scale used by the late-fee formula.

use std::fmt;

/// Denominator for basis-point rates. `10_000` bps is 100%.
pub const BPS_DENOMINATOR: u32 = 10_000;

/// Why [`crate::late_fee`] refused to return a fee.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LateFeeError {
    /// `amount` was zero or negative. An invoice principal has to be positive.
    NonPositiveAmount,
    /// `max_fee_bps` was greater than [`BPS_DENOMINATOR`] (more than 100%).
    MaxFeeBpsTooLarge,
    /// The uncapped fee does not fit in `i128`.
    Overflow,
}

impl fmt::Display for LateFeeError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::NonPositiveAmount => write!(f, "amount must be greater than zero"),
            Self::MaxFeeBpsTooLarge => write!(f, "max_fee_bps must be at most 10000"),
            Self::Overflow => write!(f, "late fee overflowed i128"),
        }
    }
}

impl std::error::Error for LateFeeError {}
