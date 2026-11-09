//! `seller-tier-registry` — standalone Soroban seller tier registry.

#![no_std]
#![deny(unsafe_code)]

mod logic;
mod storage;
mod types;

#[cfg(test)]
mod tests;

pub use crate::logic::tier_rank;
pub use crate::types::{DataKey, Error, Tier};

use soroban_sdk::{contract, contractimpl, Address, Env};

#[contract]
pub struct SellerTierRegistry;

#[contractimpl]
impl SellerTierRegistry {
    /// Assign `tier` to `seller`.
    pub fn set_tier(env: Env, seller: Address, tier: Tier) {
        storage::set_tier(&env, &seller, &tier);
    }

    /// Return the assigned [`Tier`] for `seller`, defaulting to [`Tier::Bronze`].
    pub fn tier_of(env: Env, seller: Address) -> Tier {
        storage::get_tier(&env, &seller).unwrap_or(Tier::Bronze)
    }

    /// Fallible lookup returning [`Error::NotAssigned`] when `seller` has no explicit record.
    pub fn assigned_tier_of(env: Env, seller: Address) -> Result<Tier, Error> {
        storage::get_tier(&env, &seller).ok_or(Error::NotAssigned)
    }

    /// Return `true` if `seller` has an explicitly stored tier.
    pub fn has_assigned_tier(env: Env, seller: Address) -> bool {
        storage::get_tier(&env, &seller).is_some()
    }

    /// Remove any explicit tier assignment for `seller`.
    pub fn clear_tier(env: Env, seller: Address) {
        storage::remove_tier(&env, &seller);
    }
}
