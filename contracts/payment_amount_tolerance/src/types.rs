use soroban_sdk::{contracterror, contracttype};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AmountToleranceEvaluation {
    pub expected: i128,
    pub received: i128,
    pub tolerance: i128,
    pub abs_difference: i128,
    pub within_tolerance: bool,
}

#[contracterror]
#[derive(Clone, Copy, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum AmountToleranceError {
    InvalidExpectedAmount = 1,
    InvalidReceivedAmount = 2,
    NegativeTolerance = 3,
    ToleranceExceedsExpected = 4,
    OutsideTolerance = 5,
}
