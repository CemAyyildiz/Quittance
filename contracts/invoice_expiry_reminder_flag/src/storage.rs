//! Persistent storage helpers for `invoice-expiry-reminder-flag`.

use soroban_sdk::{Env, Symbol};

use crate::types::DataKey;

pub(crate) fn is_reminded(env: &Env, invoice_id: &Symbol) -> bool {
    env.storage()
        .persistent()
        .get(&DataKey::Reminded(invoice_id.clone()))
        .unwrap_or(false)
}

pub(crate) fn set_reminded(env: &Env, invoice_id: &Symbol) {
    env.storage()
        .persistent()
        .set(&DataKey::Reminded(invoice_id.clone()), &true);
}
