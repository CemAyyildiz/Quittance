#![no_std]

pub mod types;
pub mod validator;

use soroban_sdk::{contract, contractimpl, Address, Env};
pub use types::{DataKey, SellerTierError, Tier};
pub use validator::{meets_minimum_tier, tier_fee_discount_bps, tier_rank};

#[contract]
pub struct SellerTierRegistryContract;

#[contractimpl]
impl SellerTierRegistryContract {
    /// Initializes the contract with an administrator address.
    pub fn initialize(env: Env, admin: Address) -> Result<(), SellerTierError> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(SellerTierError::AlreadyInitialized);
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        Ok(())
    }

    /// Assigns a fixed tier (Bronze, Silver, or Gold) to `seller`.
    /// If an admin has been initialized, requires admin authorization.
    pub fn set_tier(env: Env, seller: Address, tier: Tier) -> Result<(), SellerTierError> {
        if let Some(admin) = env.storage().instance().get::<DataKey, Address>(&DataKey::Admin) {
            admin.require_auth();
        }
        env.storage()
            .persistent()
            .set(&DataKey::SellerTier(seller), &tier);
        Ok(())
    }

    /// Returns the assigned tier for `seller`, defaulting to `Tier::Bronze` if unassigned.
    pub fn tier_of(env: Env, seller: Address) -> Tier {
        env.storage()
            .persistent()
            .get(&DataKey::SellerTier(seller))
            .unwrap_or(Tier::Bronze)
    }

    /// Returns `true` if `seller` has an explicitly assigned tier in storage.
    pub fn has_explicit_tier(env: Env, seller: Address) -> bool {
        env.storage().persistent().has(&DataKey::SellerTier(seller))
    }

    /// Removes the explicitly assigned tier for `seller`.
    pub fn remove_tier(env: Env, seller: Address) -> Result<(), SellerTierError> {
        if let Some(admin) = env.storage().instance().get::<DataKey, Address>(&DataKey::Admin) {
            admin.require_auth();
        }
        let key = DataKey::SellerTier(seller);
        if !env.storage().persistent().has(&key) {
            return Err(SellerTierError::SellerNotRegistered);
        }
        env.storage().persistent().remove(&key);
        Ok(())
    }

    /// Checks whether `seller` meets or exceeds `minimum` tier.
    pub fn seller_meets_tier(env: Env, seller: Address, minimum: Tier) -> bool {
        let actual = Self::tier_of(env, seller);
        meets_minimum_tier(actual, minimum)
    }

    /// Returns the configured admin address if initialized.
    pub fn admin(env: Env) -> Result<Address, SellerTierError> {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(SellerTierError::NotInitialized)
    }
}
