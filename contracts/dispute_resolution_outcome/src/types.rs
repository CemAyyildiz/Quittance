use soroban_sdk::{contracterror, contracttype, Symbol};

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Outcome {
    FavorPayer = 1,
    FavorSeller = 2,
    Split = 3,
}

#[contracterror]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum DisputeError {
    AlreadyResolved = 1,
    NotResolved = 2,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    DisputeOutcome(Symbol),
}
