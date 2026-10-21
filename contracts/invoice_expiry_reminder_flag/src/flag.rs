use soroban_sdk::{Env, Symbol};

use crate::types::DataKey;

pub(crate) fn was_reminded(env: &Env, invoice_id: &Symbol) -> bool {
    env.storage()
        .persistent()
        .get(&DataKey::Reminded(invoice_id.clone()))
        .unwrap_or(false)
}

pub(crate) fn mark_reminded(env: &Env, invoice_id: &Symbol) -> bool {
    if was_reminded(env, invoice_id) {
        return false;
    }

    env.storage()
        .persistent()
        .set(&DataKey::Reminded(invoice_id.clone()), &true);
    true
}
