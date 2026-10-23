//! Persistent storage for invoice settlement-currency tags.
//!
//! Each tag is stored under its own `DataKey::Tag(invoice_id)` key, so
//! invoices never share or overwrite each other's tags.

use soroban_sdk::{Env, Symbol};

use crate::types::DataKey;

/// Return the asset code `invoice_id` is tagged with, or `None` when the
/// invoice has never been tagged.
pub(crate) fn tag_of(env: &Env, invoice_id: &Symbol) -> Option<Symbol> {
    env.storage()
        .persistent()
        .get(&DataKey::Tag(invoice_id.clone()))
}

/// Write the asset code tag for `invoice_id`, replacing nothing (callers
/// only write when no tag exists yet).
pub(crate) fn set_tag(env: &Env, invoice_id: &Symbol, asset_code: &Symbol) {
    env.storage()
        .persistent()
        .set(&DataKey::Tag(invoice_id.clone()), asset_code);
}
