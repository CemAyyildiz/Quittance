//! Type definitions for `seller-tier-registry`.

use soroban_sdk::{contracterror, contracttype, Address};

/// Seller loyalty/volume tiers.
#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum Tier {
    Bronze,
    Silver,
    Gold,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    SellerTier(Address),
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    NotAssigned = 1,
}
