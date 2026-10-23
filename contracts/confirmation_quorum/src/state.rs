use soroban_sdk::{Address, Env, Symbol, Vec};

use crate::types::DataKey;

/// Return whether the quorum has already been configured.
pub fn is_initialized(env: &Env) -> bool {
    env.storage()
        .persistent()
        .get(&DataKey::Initialized)
        .unwrap_or(false)
}

/// Mark the quorum as configured.
pub fn set_initialized(env: &Env) {
    env.storage().persistent().set(&DataKey::Initialized, &true);
}

/// Return the admin address, or `None` when the quorum is not configured.
pub fn admin(env: &Env) -> Option<Address> {
    env.storage().persistent().get(&DataKey::Admin)
}

/// Store the admin address.
pub fn set_admin(env: &Env, admin: &Address) {
    env.storage().persistent().set(&DataKey::Admin, admin);
}

/// Return the configured observer set, or an empty set when not configured.
pub fn observers(env: &Env) -> Vec<Address> {
    env.storage()
        .persistent()
        .get(&DataKey::Observers)
        .unwrap_or_else(|| Vec::new(env))
}

/// Store the configured observer set.
pub fn set_observers(env: &Env, observers: &Vec<Address>) {
    env.storage()
        .persistent()
        .set(&DataKey::Observers, observers);
}

/// Return whether `observer` already confirmed `reference`.
pub fn has_confirmed(env: &Env, reference: &Symbol, observer: &Address) -> bool {
    env.storage()
        .persistent()
        .get(&DataKey::Confirmation(reference.clone(), observer.clone()))
        .unwrap_or(false)
}

/// Record one confirmation and bump the per-reference confirmation count.
pub fn record_confirmation(env: &Env, reference: &Symbol, observer: &Address) {
    env.storage().persistent().set(
        &DataKey::Confirmation(reference.clone(), observer.clone()),
        &true,
    );
    let count = confirmation_count(env, reference);
    env.storage().persistent().set(
        &DataKey::ConfirmationCount(reference.clone()),
        &count.saturating_add(1),
    );
}

/// Return how many distinct observers confirmed `reference`.
pub fn confirmation_count(env: &Env, reference: &Symbol) -> u32 {
    env.storage()
        .persistent()
        .get(&DataKey::ConfirmationCount(reference.clone()))
        .unwrap_or(0)
}
