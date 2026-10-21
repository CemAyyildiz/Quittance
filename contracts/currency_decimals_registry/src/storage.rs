use soroban_sdk::{Address, Env, Symbol};

use crate::types::DataKey;

pub fn set_admin(env: &Env, admin: &Address) {
    env.storage().instance().set(&DataKey::Admin, admin);
}

pub fn admin(env: &Env) -> Address {
    env.storage()
        .instance()
        .get(&DataKey::Admin)
        .expect("registry admin must be initialized")
}

pub fn set_decimals(env: &Env, code: &Symbol, decimals: u32) {
    env.storage()
        .persistent()
        .set(&DataKey::Decimals(code.clone()), &decimals);
}

pub fn decimals_of(env: &Env, code: &Symbol) -> Option<u32> {
    env.storage()
        .persistent()
        .get(&DataKey::Decimals(code.clone()))
}
