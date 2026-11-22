use soroban_sdk::{Address, Env, Symbol, Vec};

use crate::types::DataKey;

/// Stores the allowlist for a given invoice.
pub(crate) fn set_allowlist(env: &Env, invoice_id: &Symbol, payers: &Vec<Address>) {
    if payers.is_empty() {
        // Empty vector means clear the allowlist
        env.storage()
            .persistent()
            .remove(&DataKey::Allowlist(invoice_id.clone()));
    } else {
        env.storage()
            .persistent()
            .set(&DataKey::Allowlist(invoice_id.clone()), payers);
    }
}

/// Retrieves the allowlist for a given invoice, if it exists.
pub(crate) fn get_allowlist(env: &Env, invoice_id: &Symbol) -> Option<Vec<Address>> {
    env.storage()
        .persistent()
        .get(&DataKey::Allowlist(invoice_id.clone()))
}
