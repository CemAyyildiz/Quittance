//! Storage helpers for the grace fee waiver contract.

use crate::types::{DataKey, WaiverState};
use soroban_sdk::{Address, Env, Symbol};

/// Read the admin stored at deployment, if any.
pub(crate) fn admin(env: &Env) -> Option<Address> {
    env.storage().instance().get(&DataKey::Admin)
}

/// Persist the admin address in instance storage.
pub(crate) fn set_admin(env: &Env, admin: &Address) {
    env.storage().instance().set(&DataKey::Admin, admin);
}

/// Read the waiver state for `invoice_id`, or `None` if never granted.
pub(crate) fn waiver_state(env: &Env, invoice_id: &Symbol) -> Option<WaiverState> {
    env.storage()
        .persistent()
        .get(&DataKey::Waiver(invoice_id.clone()))
}

/// Persist the waiver state for `invoice_id`.
pub(crate) fn set_waiver_state(env: &Env, invoice_id: &Symbol, state: &WaiverState) {
    env.storage()
        .persistent()
        .set(&DataKey::Waiver(invoice_id.clone()), state);
}
