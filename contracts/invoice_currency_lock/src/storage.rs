//! Instance-storage accessors for `invoice-currency-lock`.

use crate::types::DataKey;
use soroban_sdk::{Env, Symbol};

/// Read the asset code an invoice is locked to, or `None` when it is not
/// locked yet.
pub fn locked_currency(env: &Env, invoice_id: &Symbol) -> Option<Symbol> {
    env.storage()
        .instance()
        .get(&DataKey::LockedCurrency(invoice_id.clone()))
}

/// Persist the asset code an invoice is locked to.
pub fn set_locked_currency(env: &Env, invoice_id: &Symbol, code: &Symbol) {
    env.storage()
        .instance()
        .set(&DataKey::LockedCurrency(invoice_id.clone()), code);
}

/// Whether an invoice has a currency lock.
pub fn is_locked(env: &Env, invoice_id: &Symbol) -> bool {
    locked_currency(env, invoice_id).is_some()
}
