//! Storage helpers for `invoice-draft-flag`.

use soroban_sdk::{Address, Env, Symbol};

use crate::types::DataKey;

pub(crate) fn get_publisher(env: &Env, invoice_id: &Symbol) -> Option<Address> {
    env.storage()
        .persistent()
        .get(&DataKey::PublishedBy(invoice_id.clone()))
}

pub(crate) fn set_publisher(env: &Env, invoice_id: &Symbol, seller: &Address) {
    env.storage()
        .persistent()
        .set(&DataKey::PublishedBy(invoice_id.clone()), seller);
}
