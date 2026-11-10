#![no_std]

pub mod types;
pub mod validator;

use soroban_sdk::{contract, contractimpl, Address, Env};
pub use types::{BlacklistError, DataKey};
pub use validator::check_seller_allowed;

#[contract]
pub struct SellerBlacklistRegistryContract;

#[contractimpl]
impl SellerBlacklistRegistryContract {
    /// Initializes an optional admin address for the blacklist registry.
    pub fn initialize(env: Env, admin: Address) -> Result<(), BlacklistError> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(BlacklistError::AlreadyInitialized);
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        Ok(())
    }

    /// Adds `seller` to the blacklist. If an admin is configured, requires admin auth.
    pub fn blacklist(env: Env, seller: Address) {
        if let Some(admin) = env.storage().instance().get::<DataKey, Address>(&DataKey::Admin) {
            admin.require_auth();
        }
        let key = DataKey::Blacklisted(seller);
        if !env.storage().persistent().has(&key) {
            env.storage().persistent().set(&key, &true);
            let count: u32 = env
                .storage()
                .instance()
                .get(&DataKey::BlacklistedCount)
                .unwrap_or(0);
            env.storage()
                .instance()
                .set(&DataKey::BlacklistedCount, &count.saturating_add(1));
        }
    }

    /// Removes `seller` from the blacklist. If an admin is configured, requires admin auth.
    pub fn unblacklist(env: Env, seller: Address) {
        if let Some(admin) = env.storage().instance().get::<DataKey, Address>(&DataKey::Admin) {
            admin.require_auth();
        }
        let key = DataKey::Blacklisted(seller);
        if env.storage().persistent().has(&key) {
            env.storage().persistent().remove(&key);
            let count: u32 = env
                .storage()
                .instance()
                .get(&DataKey::BlacklistedCount)
                .unwrap_or(0);
            env.storage()
                .instance()
                .set(&DataKey::BlacklistedCount, &count.saturating_sub(1));
        }
    }

    /// Returns `true` if `seller` is NOT blacklisted.
    pub fn is_allowed(env: Env, seller: Address) -> bool {
        !env.storage()
            .persistent()
            .has(&DataKey::Blacklisted(seller))
    }

    /// Returns `Ok(())` if `seller` is allowed, or `Err(SellerBlacklisted)` if blacklisted.
    pub fn require_allowed(env: Env, seller: Address) -> Result<(), BlacklistError> {
        let is_blacklisted = env
            .storage()
            .persistent()
            .has(&DataKey::Blacklisted(seller));
        check_seller_allowed(is_blacklisted)
    }

    /// Returns the number of currently blacklisted sellers.
    pub fn blacklisted_count(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::BlacklistedCount)
            .unwrap_or(0)
    }
}
