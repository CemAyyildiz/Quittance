use soroban_sdk::{Env, Symbol, Vec};
use crate::types::{DataKey, TagError, MAX_TAGS_PER_INVOICE};

pub fn append_tag(
    env: &Env,
    invoice_id: &Symbol,
    tag: &Symbol,
) -> Result<(), TagError> {
    let key = DataKey::InvoiceTags(invoice_id.clone());
    let mut list: Vec<Symbol> = env
        .storage()
        .persistent()
        .get(&key)
        .unwrap_or_else(|| Vec::new(env));

    if list.contains(tag) {
        return Err(TagError::DuplicateTag);
    }

    if list.len() >= MAX_TAGS_PER_INVOICE {
        return Err(TagError::TagLimitExceeded);
    }

    list.push_back(tag.clone());
    env.storage().persistent().set(&key, &list);
    Ok(())
}

pub fn get_tags(env: &Env, invoice_id: &Symbol) -> Vec<Symbol> {
    let key = DataKey::InvoiceTags(invoice_id.clone());
    env.storage()
        .persistent()
        .get(&key)
        .unwrap_or_else(|| Vec::new(env))
}

pub fn delete_tag(
    env: &Env,
    invoice_id: &Symbol,
    tag: &Symbol,
) -> Result<(), TagError> {
    let key = DataKey::InvoiceTags(invoice_id.clone());
    let list: Vec<Symbol> = env
        .storage()
        .persistent()
        .get(&key)
        .ok_or(TagError::NoTagsFound)?;

    let mut found = false;
    let mut new_list = Vec::new(env);

    for item in list.iter() {
        if item == *tag {
            found = true;
        } else {
            new_list.push_back(item);
        }
    }

    if !found {
        return Err(TagError::TagNotFound);
    }

    if new_list.is_empty() {
        env.storage().persistent().remove(&key);
    } else {
        env.storage().persistent().set(&key, &new_list);
    }

    Ok(())
}

pub fn delete_all_tags(
    env: &Env,
    invoice_id: &Symbol,
) -> Result<(), TagError> {
    let key = DataKey::InvoiceTags(invoice_id.clone());
    if !env.storage().persistent().has(&key) {
        return Err(TagError::NoTagsFound);
    }
    env.storage().persistent().remove(&key);
    Ok(())
}
