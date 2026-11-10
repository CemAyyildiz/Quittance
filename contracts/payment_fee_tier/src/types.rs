use soroban_sdk::{contracterror, contracttype};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct FeeTierQuote {
    pub cumulative_volume: i128,
    pub matched_threshold: i128,
    pub fee_bps: u32,
}

#[contracterror]
#[derive(Clone, Copy, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum FeeTierError {
    NegativeVolume = 1,
    EmptyThresholds = 2,
    UnsortedThresholds = 3,
    FeeBpsTooHigh = 4,
    InvalidPaymentAmount = 5,
}
