use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum PegError {
    /// Quoted or reference rate is negative or zero.
    NonPositiveRate = 1,
    /// Tolerance exceeds maximum allowed basis points (10_000 bps = 100%).
    ToleranceExceedsMax = 2,
    /// Rate falls outside the acceptable tolerance band.
    OutsideToleranceBand = 3,
}
