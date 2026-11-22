//! Per-invoice tag storage for the `invoice-category-registry` crate.
//!
//! Every tagged invoice owns one persistent entry. The number of invoices is
//! unbounded, so tags never share the bounded instance storage that holds the
//! category list.

use soroban_sdk::{Env, Symbol};

use crate::types::DataKey;

/// Persistent entries are bumped back out to 90 days once they get within
/// 30 days of expiry, so a tag stays readable for the usual invoice retention
/// window.
const TTL_THRESHOLD: u32 = 30 * 17_280;
const TTL_BUMP: u32 = 90 * 17_280;

/// Build the storage key for an invoice tag.
fn key(invoice_id: &Symbol) -> DataKey {
    DataKey::InvoiceCategory(invoice_id.clone())
}

/// Store `category` as the tag for `invoice_id`, replacing any previous tag.
pub(crate) fn set_tag(env: &Env, invoice_id: &Symbol, category: &Symbol) {
    let key = key(invoice_id);
    env.storage().persistent().set(&key, category);
    env.storage()
        .persistent()
        .extend_ttl(&key, TTL_THRESHOLD, TTL_BUMP);
}

/// Read the tag stored for `invoice_id`, or `None` when it is untagged.
pub(crate) fn tag_of(env: &Env, invoice_id: &Symbol) -> Option<Symbol> {
    let key = key(invoice_id);
    let tag: Option<Symbol> = env.storage().persistent().get(&key);

    if tag.is_some() {
        env.storage()
            .persistent()
            .extend_ttl(&key, TTL_THRESHOLD, TTL_BUMP);
    }

    tag
}
