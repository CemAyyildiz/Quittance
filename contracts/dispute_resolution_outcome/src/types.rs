use soroban_sdk::{contracterror, contracttype, Symbol};

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Outcome {
    FavorPayer = 1,
    FavorSeller = 2,
    Split = 3,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Outcome(Symbol),
}

#[contracterror]
#[derive(Clone, Copy, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum DisputeOutcomeError {
    AlreadyResolved = 1,
    NotResolved = 2,
}
