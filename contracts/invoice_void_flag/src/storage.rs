//! Persistent storage helpers for `invoice-void-flag`.

use soroban_sdk::{Address, Env, Symbol};

use crate::types::{DataKey, InvoiceState};

pub(crate) fn get_state(env: &Env, invoice_id: &Symbol) -> InvoiceState {
    env.storage()
        .persistent()
        .get(&DataKey::State(invoice_id.clone()))
        .unwrap_or(InvoiceState::Open)
}

pub(crate) fn set_state(env: &Env, invoice_id: &Symbol, state: InvoiceState) {
    env.storage()
        .persistent()
        .set(&DataKey::State(invoice_id.clone()), &state);
}

pub(crate) fn get_owner(env: &Env, invoice_id: &Symbol) -> Option<Address> {
    env.storage()
        .persistent()
        .get(&DataKey::Owner(invoice_id.clone()))
}

pub(crate) fn set_owner(env: &Env, invoice_id: &Symbol, seller: &Address) {
    env.storage()
        .persistent()
        .set(&DataKey::Owner(invoice_id.clone()), seller);
}
