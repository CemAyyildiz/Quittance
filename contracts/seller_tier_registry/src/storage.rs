//! Storage helpers for `seller-tier-registry`.

use soroban_sdk::{Address, Env};

use crate::types::{DataKey, Tier};

pub(crate) fn get_tier(env: &Env, seller: &Address) -> Option<Tier> {
    env.storage()
        .persistent()
        .get(&DataKey::SellerTier(seller.clone()))
}

pub(crate) fn set_tier(env: &Env, seller: &Address, tier: &Tier) {
    env.storage()
        .persistent()
        .set(&DataKey::SellerTier(seller.clone()), tier);
}

pub(crate) fn remove_tier(env: &Env, seller: &Address) {
    env.storage()
        .persistent()
        .remove(&DataKey::SellerTier(seller.clone()));
}
