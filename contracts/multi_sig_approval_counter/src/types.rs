use soroban_sdk::{contracterror, contracttype, Address, Symbol};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    ActionRequired(Symbol),
    ActionCount(Symbol),
    ActionApproved(Symbol),
    HasApproved(Symbol, Address),
}

#[contracterror]
#[derive(Clone, Copy, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum ApprovalError {
    InvalidRequiredThreshold = 1,
    ThresholdMismatch = 2,
}
