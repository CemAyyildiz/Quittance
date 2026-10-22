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

pub(crate) fn set_max(env: &Env, max: u32) {
    env.storage().instance().set(&DataKey::MaxBatchSize, &max);
}

pub(crate) fn max(env: &Env) -> u32 {
    env.storage()
        .instance()
        .get(&DataKey::MaxBatchSize)
        .expect("contract constructor must set a batch cap")
}
