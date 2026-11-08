//! Storage helpers for `invoice-draft-flag`.

use crate::types::DataKey;
use soroban_sdk::{Address, Env, Symbol};

pub fn get_publisher(env: &Env, invoice_id: &Symbol) -> Option<Address> {
    env.storage()
        .instance()
        .get(&DataKey::PublishedSeller(invoice_id.clone()))
}

pub fn set_publisher(env: &Env, invoice_id: &Symbol, seller: &Address) {
    env.storage()
        .instance()
        .set(&DataKey::PublishedSeller(invoice_id.clone()), seller);
}
