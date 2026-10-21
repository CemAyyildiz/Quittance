use soroban_sdk::contracterror;

/// Failures produced while checking or applying a basis-point split.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum SplitError {
    /// The payee list is empty.
    Empty = 1,
    /// More payees were supplied than [`crate::MAX_PAYEES`].
    TooManyPayees = 2,
    /// Shares do not add up to exactly 10_000 basis points.
    SumNotExact = 3,
    /// The payment amount is negative.
    NegativeAmount = 4,
    /// A share multiplication overflowed `i128`.
    Overflow = 5,
}
