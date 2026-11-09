//! Storage helpers for `seller-blacklist-registry`.

use soroban_sdk::{Address, Env};

use crate::types::DataKey;

pub(crate) fn get_admin(env: &Env) -> Option<Address> {
    env.storage().instance().get(&DataKey::Admin)
}

pub(crate) fn set_admin(env: &Env, admin: &Address) {
    env.storage().instance().set(&DataKey::Admin, admin);
}

pub(crate) fn is_blacklisted(env: &Env, seller: &Address) -> bool {
    env.storage()
        .persistent()
        .get(&DataKey::Blacklisted(seller.clone()))
        .unwrap_or(false)
}

pub(crate) fn set_blacklisted(env: &Env, seller: &Address, blacklisted: bool) {
    let key = DataKey::Blacklisted(seller.clone());
    if blacklisted {
        env.storage().persistent().set(&key, &true);
    } else {
        env.storage().persistent().remove(&key);
    }
}
