//! Error type and basis-point scale for the payment split calculator.

use soroban_sdk::contracterror;

/// Denominator for basis-point rates. `10_000` bps is 100%.
pub const BPS_DENOMINATOR: u32 = 10_000;

/// Errors returned by the fixed-point payment split calculator.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum SplitError {
    /// The split total was negative; amounts must be non-negative.
    NegativeTotal = 1,
    /// The shares list was empty; at least one recipient is required.
    EmptyShares = 2,
    /// The sum of the basis-point shares exceeded the whole amount (10_000 bps).
    SharesExceedWhole = 3,
    /// The remainder recipient index was out of bounds for the shares list.
    InvalidRemainderIndex = 4,
    /// A split step overflowed the `i128` amount range.
    Overflow = 5,
}
