#![no_std]
use soroban_sdk::{contract, contractimpl, Address, Env};

pub mod registry;
pub mod types;

#[cfg(test)]
mod tests;

use types::{RegistryError, Tier};

#[contract]
pub struct SellerTierRegistry;

#[contractimpl]
impl SellerTierRegistry {
    pub fn initialize(env: Env, admin: Address) -> Result<(), RegistryError> {
        registry::init_admin(&env, &admin)
    }

    pub fn set_tier(env: Env, seller: Address, tier: Tier) -> Result<(), RegistryError> {
        registry::update_tier(&env, &seller, tier)
    }

    pub fn tier_of(env: Env, seller: Address) -> Option<Tier> {
        registry::query_tier(&env, &seller)
    }

    pub fn has_tier(env: Env, seller: Address) -> bool {
        registry::check_has_tier(&env, &seller)
    }

    pub fn remove_tier(env: Env, seller: Address) -> Result<(), RegistryError> {
        registry::delete_tier(&env, &seller)
    }

    pub fn get_admin(env: Env) -> Result<Address, RegistryError> {
        registry::query_admin(&env)
    }
}
