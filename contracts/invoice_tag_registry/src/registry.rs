use soroban_sdk::{Env, Symbol, Vec};

use crate::types::{DataKey, MAX_TAGS};

const BUMP_THRESHOLD: u32 = 30 * 17_280;
const BUMP_TO: u32 = 90 * 17_280;

pub(crate) fn tags_of(env: &Env, invoice_id: &Symbol) -> Vec<Symbol> {
    let key = DataKey::Tags(invoice_id.clone());
    let tags = env
        .storage()
        .persistent()
        .get(&key)
        .unwrap_or_else(|| Vec::new(env));
    if env.storage().persistent().has(&key) {
        env.storage()
            .persistent()
            .extend_ttl(&key, BUMP_THRESHOLD, BUMP_TO);
    }
    tags
}

/// Adds `tag` when it is new and the invoice is under the cap.
/// Returns false when the tag is already present or the list is full.
pub(crate) fn add_tag(env: &Env, invoice_id: &Symbol, tag: Symbol) -> bool {
    let mut tags = tags_of(env, invoice_id);
    if contains(&tags, &tag) || tags.len() >= MAX_TAGS {
        return false;
    }
    tags.push_back(tag);
    let key = DataKey::Tags(invoice_id.clone());
    env.storage().persistent().set(&key, &tags);
    env.storage()
        .persistent()
        .extend_ttl(&key, BUMP_THRESHOLD, BUMP_TO);
    true
}

fn contains(tags: &Vec<Symbol>, tag: &Symbol) -> bool {
    let mut index = 0;
    while index < tags.len() {
        if tags.get(index).as_ref() == Some(tag) {
            return true;
        }
        index += 1;
    }
    false
}
