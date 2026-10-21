//! Instance-storage accessors for `fee-tier-lookup`.

use crate::types::{DataKey, Tier};
use soroban_sdk::{Address, Env, Vec};

/// Persist the fee admin.
pub fn set_admin(env: &Env, admin: &Address) {
    env.storage().instance().set(&DataKey::Admin, admin);
}

/// Read the stored admin, if the contract has been initialised.
pub fn admin(env: &Env) -> Option<Address> {
    env.storage().instance().get(&DataKey::Admin)
}

/// Persist the full tier list.
pub fn set_tiers(env: &Env, tiers: &Vec<Tier>) {
    env.storage().instance().set(&DataKey::Tiers, tiers);
}

/// Read the stored tier list (empty when nothing has been configured).
pub fn tiers(env: &Env) -> Vec<Tier> {
    env.storage()
        .instance()
        .get(&DataKey::Tiers)
        .unwrap_or_else(|| Vec::new(env))
}
