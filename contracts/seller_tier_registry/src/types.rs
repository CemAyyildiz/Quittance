use soroban_sdk::{contracterror, contracttype, Address};

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Tier {
    Bronze = 1,
    Silver = 2,
    Gold = 3,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Admin,
    SellerTier(Address),
}

#[contracterror]
#[derive(Clone, Copy, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum SellerTierError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    SellerNotRegistered = 3,
}
