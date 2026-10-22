use soroban_sdk::{Address, Env};

use crate::DataKey;

pub(crate) fn set_admin(env: &Env, admin: &Address) {
    env.storage().instance().set(&DataKey::Admin, admin);
}

pub(crate) fn admin(env: &Env) -> Address {
    env.storage()
        .instance()
        .get(&DataKey::Admin)
        .expect("contract constructor must set an admin")
}

pub(crate) fn set_suspended(env: &Env, seller: &Address, suspended: bool) {
    let key = DataKey::Seller(seller.clone());
    if suspended {
        env.storage().persistent().set(&key, &true);
    } else {
        env.storage().persistent().remove(&key);
    }
}

pub(crate) fn is_suspended(env: &Env, seller: &Address) -> bool {
    env.storage()
        .persistent()
        .get(&DataKey::Seller(seller.clone()))
        .unwrap_or(false)
}
