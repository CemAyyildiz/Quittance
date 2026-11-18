use soroban_sdk::{Address, Env};
use crate::types::{DataKey, RegistryError, Tier};

pub fn init_admin(env: &Env, admin: &Address) -> Result<(), RegistryError> {
    if env.storage().instance().has(&DataKey::Admin) {
        return Err(RegistryError::AlreadyInitialized);
    }
    env.storage().instance().set(&DataKey::Admin, admin);
    Ok(())
}

pub fn update_tier(env: &Env, seller: &Address, tier: Tier) -> Result<(), RegistryError> {
    let admin: Address = env
        .storage()
        .instance()
        .get(&DataKey::Admin)
        .ok_or(RegistryError::NotInitialized)?;
    admin.require_auth();

    env.storage().persistent().set(&DataKey::SellerTier(seller.clone()), &tier);
    Ok(())
}

pub fn query_tier(env: &Env, seller: &Address) -> Option<Tier> {
    env.storage().persistent().get(&DataKey::SellerTier(seller.clone()))
}

pub fn check_has_tier(env: &Env, seller: &Address) -> bool {
    env.storage().persistent().has(&DataKey::SellerTier(seller.clone()))
}

pub fn delete_tier(env: &Env, seller: &Address) -> Result<(), RegistryError> {
    let admin: Address = env
        .storage()
        .instance()
        .get(&DataKey::Admin)
        .ok_or(RegistryError::NotInitialized)?;
    admin.require_auth();

    let key = DataKey::SellerTier(seller.clone());
    if !env.storage().persistent().has(&key) {
        return Err(RegistryError::TierNotFound);
    }

    env.storage().persistent().remove(&key);
    Ok(())
}

pub fn query_admin(env: &Env) -> Result<Address, RegistryError> {
    env.storage()
        .instance()
        .get(&DataKey::Admin)
        .ok_or(RegistryError::NotInitialized)
}
