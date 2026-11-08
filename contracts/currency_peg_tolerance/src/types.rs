use soroban_sdk::{contracterror, contracttype, Address};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PegBandEvaluation {
    pub quoted_rate: i128,
    pub reference_rate: i128,
    pub tolerance_bps: u32,
    pub lower_bound: i128,
    pub upper_bound: i128,
    pub within_band: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Admin,
    DefaultToleranceBps,
}

#[contracterror]
#[derive(Clone, Copy, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum PegToleranceError {
    InvalidReferenceRate = 1,
    InvalidQuotedRate = 2,
    ToleranceTooHigh = 3,
    ArithmeticOverflow = 4,
    OutOfBand = 5,
}
