//! Persistent storage helpers for `invoice-cancellation-window`.

use soroban_sdk::{Env, Symbol};

use crate::types::{CancellationRecord, DataKey};

pub(crate) fn get_cancellation(env: &Env, invoice_id: &Symbol) -> Option<CancellationRecord> {
    env.storage()
        .persistent()
        .get(&DataKey::Cancelled(invoice_id.clone()))
}

pub(crate) fn set_cancellation(env: &Env, invoice_id: &Symbol, record: &CancellationRecord) {
    env.storage()
        .persistent()
        .set(&DataKey::Cancelled(invoice_id.clone()), record);
}

pub(crate) fn is_paid(env: &Env, invoice_id: &Symbol) -> bool {
    env.storage()
        .persistent()
        .get(&DataKey::Paid(invoice_id.clone()))
        .unwrap_or(false)
}

pub(crate) fn set_paid(env: &Env, invoice_id: &Symbol) {
    env.storage()
        .persistent()
        .set(&DataKey::Paid(invoice_id.clone()), &true);
}
