//! Storage helpers for `seller-payout-address-binding`.

use soroban_sdk::{Address, Env};

use crate::types::{DataKey, PayoutBinding, DEFAULT_REBIND_COOLDOWN_LEDGERS};

pub(crate) fn get_binding(env: &Env, seller: &Address) -> Option<PayoutBinding> {
    env.storage()
        .persistent()
        .get(&DataKey::Binding(seller.clone()))
}

pub(crate) fn set_binding(env: &Env, seller: &Address, binding: &PayoutBinding) {
    env.storage()
        .persistent()
        .set(&DataKey::Binding(seller.clone()), binding);
}

pub(crate) fn get_cooldown(env: &Env) -> u32 {
    env.storage()
        .instance()
        .get(&DataKey::CooldownLedgers)
        .unwrap_or(DEFAULT_REBIND_COOLDOWN_LEDGERS)
}

pub(crate) fn set_cooldown(env: &Env, cooldown_ledgers: u32) {
    env.storage()
        .instance()
        .set(&DataKey::CooldownLedgers, &cooldown_ledgers);
}
