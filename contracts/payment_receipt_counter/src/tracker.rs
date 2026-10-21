use soroban_sdk::{panic_with_error, Address, Env};

use crate::types::{CounterError, DataKey};

pub(crate) fn count_for(env: &Env, payer: &Address) -> u32 {
    env.storage()
        .persistent()
        .get(&DataKey::PayerCount(payer.clone()))
        .unwrap_or(0)
}

pub(crate) fn total_payments(env: &Env) -> u32 {
    env.storage()
        .instance()
        .get(&DataKey::TotalPayments)
        .unwrap_or(0)
}

pub(crate) fn record_payment(env: &Env, payer: &Address) -> u32 {
    payer.require_auth();

    let current = count_for(env, payer);
    let next = match current.checked_add(1) {
        Some(v) => v,
        None => panic_with_error!(env, CounterError::Overflow),
    };

    env.storage()
        .persistent()
        .set(&DataKey::PayerCount(payer.clone()), &next);

    let current_total = total_payments(env);
    let next_total = current_total.saturating_add(1);
    env.storage()
        .instance()
        .set(&DataKey::TotalPayments, &next_total);

    next
}
