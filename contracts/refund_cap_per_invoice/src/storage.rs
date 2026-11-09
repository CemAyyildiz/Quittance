//! Storage helpers for `refund-cap-per-invoice`.

use soroban_sdk::{Env, Symbol};

use crate::types::{DataKey, RefundRecord};

pub(crate) fn get_record(env: &Env, invoice_id: &Symbol) -> Option<RefundRecord> {
    env.storage()
        .persistent()
        .get(&DataKey::RefundState(invoice_id.clone()))
}

pub(crate) fn set_record(env: &Env, invoice_id: &Symbol, record: &RefundRecord) {
    env.storage()
        .persistent()
        .set(&DataKey::RefundState(invoice_id.clone()), record);
}
